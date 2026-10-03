import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EmailStatus, EnrollmentStatus, PaymentStatus, Role, type Payment, type User } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { siteUrlFromHeaders } from "@/lib/site-url";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import type { CoursePurchase, CourseRefund } from "@/features/access/schemas/access.schema";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";
import { createPasswordSetupToken, hasLivePasswordSetupToken } from "@/features/auth/services/activation.service";
import { GHL_TAGS, type GhlContactRef } from "@/features/access/services/gohighlevel.service";
import { emailLinkThroughGhl } from "@/features/access/services/ghl-email-handoff";

/**
 * Throws ForbiddenError unless the user is enrolled in this course (or
 * manages it, for instructor/admin preview). Every protected course/lesson
 * read must go through this -- never trust a client-supplied "I have access"
 * claim; the enrollment row in the database is the only source of truth.
 * A REVOKED (refund/chargeback) or DROPPED enrollment row grants nothing.
 */
export async function requireCourseAccess(
  user: SessionUser,
  course: { id: string; instructorId: string },
): Promise<void> {
  if (canManageCourse(user, course)) return;

  const enrollment = await enrollmentRepo.findEnrollment(user.id, course.id);
  const blocked = enrollment?.status === EnrollmentStatus.REVOKED || enrollment?.status === EnrollmentStatus.DROPPED;
  if (!enrollment || blocked) {
    throw new ForbiddenError("Enroll in this course to access its lessons");
  }
}

/** Statuses GoHighLevel reports for a charge that actually went through. Anything else provisions nothing. */
const SUCCESSFUL_PAYMENT_STATUSES = new Set([
  "succeeded",
  "success",
  "successful",
  "paid",
  "complete",
  "completed",
  "approved",
  "captured",
  "confirmed",
]);

function assertSuccessfulPayment(purchase: CoursePurchase): void {
  // Workflows triggered by "Payment Received" often omit the status entirely;
  // the trigger itself is the success signal then. But when a status IS sent,
  // a pending/failed/refunded one must never provision anything.
  if (!purchase.paymentStatus) return;
  if (!SUCCESSFUL_PAYMENT_STATUSES.has(purchase.paymentStatus.trim().toLowerCase())) {
    console.warn(`[webhooks:gohighlevel] purchase rejected: payment_status "${purchase.paymentStatus}" is not successful`);
    throw new ValidationError(`Payment status "${purchase.paymentStatus}" is not a successful payment; nothing was provisioned`);
  }
}

export interface PurchaseResult {
  newAccount: boolean;
  duplicate: boolean;
  enrolledCourseSlugs: string[];
  emailStatus: EmailStatus;
  loginUrl: string;
}

/**
 * Handles a verified "order paid" webhook from a GoHighLevel workflow
 * (checkout and payment happen in GoHighLevel; identity stays local).
 * The verified successful payment is the ONLY trigger that provisions an
 * account -- there is no self-serve signup path to a paid course.
 *
 * Flow: verify payment success -> idempotency check (Payment.ghlTransactionId)
 * -> find-or-create the account by checkout email (a new account has no
 * password yet) -> enroll into every purchased course (lifetime access, no
 * expiry) -> record the Payment row -> hand the buyer's access link to
 * GoHighLevel (contact custom field + a trigger tag), whose workflow sends
 * the email. A new buyer gets a single-use /activate link where they choose
 * their own username and password; an account that already has a password
 * gets the plain login link. The app sends no email itself, and no password
 * ever travels by email -- GoHighLevel only delivers the link.
 *
 * Consistency: every step before the Payment row is idempotent (unique
 * email, unique userId+courseId), and the Payment row -- the idempotency
 * marker -- is written last. If provisioning dies halfway, the webhook errors,
 * GoHighLevel redelivers, and the replay completes the remaining steps.
 * A failed link handoff never rolls anything back (the EmailLog row
 * records it); a redelivered webhook retries it.
 */
export async function handleCoursePurchase(
  purchase: CoursePurchase,
  requestHeaders: Headers,
): Promise<PurchaseResult> {
  const siteUrl = siteUrlFromHeaders(requestHeaders);
  const loginUrl = `${siteUrl}/login`;

  assertSuccessfulPayment(purchase);

  // Idempotency: a transaction already recorded means this webhook is a
  // redelivery. Acknowledge it (so GHL stops retrying) and only retry the
  // email if the original send failed.
  if (purchase.transactionId) {
    const existing = await prisma.payment.findUnique({
      where: { ghlTransactionId: purchase.transactionId },
      include: { user: true },
    });
    if (existing) {
      console.info(`[webhooks:gohighlevel] duplicate webhook ignored for transaction ${existing.ghlTransactionId}`);
      const emailStatus = await resendAccessEmailIfNeeded(existing, existing.user, siteUrl);
      return {
        newAccount: false,
        duplicate: true,
        enrolledCourseSlugs: existing.courseSlugs,
        emailStatus,
        loginUrl,
      };
    }
  }

  const courses = await prisma.course.findMany({
    where: { slug: { in: purchase.courseSlugs }, status: CourseStatus.PUBLISHED },
    select: { id: true, slug: true },
  });
  if (courses.length === 0) {
    // Fail loudly (GoHighLevel shows the failed webhook in the workflow's
    // execution log) rather than provisioning an account with no course.
    throw new ValidationError(`No published course matches slug(s): ${purchase.courseSlugs.join(", ")}`);
  }
  const foundSlugs = new Set(courses.map((c) => c.slug));
  const missing = purchase.courseSlugs.filter((slug) => !foundSlugs.has(slug));
  if (missing.length > 0) {
    console.warn(`[webhooks:gohighlevel] purchase: no published course for slug(s) ${missing.join(", ")}`);
  }

  // Find or provision the account. An existing account is never duplicated
  // and its password is never touched -- it just gains the new enrollment.
  // A new account has no password: it cannot be logged into until the buyer
  // opens their emailed setup link and chooses a username and password.
  let user = await prisma.user.findUnique({ where: { email: purchase.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: purchase.email,
        name: purchase.name?.trim() || purchase.email.split("@")[0]!,
        role: Role.STUDENT,
        password: null,
      },
    });
    console.info(`[webhooks:gohighlevel] user created for ${purchase.email}`);
  }
  const needsSetup = !user.password;

  // Lifetime access: an ACTIVE enrollment per purchased course, no expiry.
  // ensureEnrollment is idempotent and re-activates a previously REVOKED one.
  for (const course of courses) {
    await ensureEnrollment(user.id, course.id);
  }
  console.info(`[webhooks:gohighlevel] course access granted: ${courses.map((c) => c.slug).join(", ")} -> ${purchase.email}`);

  // Written last: this row is both the payment record and the "fully
  // processed" idempotency marker for this transaction.
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      ghlTransactionId: purchase.transactionId ?? `no-txn:${randomUUID()}`,
      ghlContactId: purchase.contactId,
      ghlProductId: purchase.productId,
      ghlLocationId: purchase.locationId,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      status: PaymentStatus.SUCCEEDED,
      courseSlugs: courses.map((c) => c.slug),
      issuedCredentials: needsSetup,
    },
  });

  const emailStatus = await triggerAccessEmail({
    user,
    paymentId: payment.id,
    contact: { contactId: purchase.contactId, locationId: purchase.locationId, email: purchase.email },
    siteUrl,
  });

  return {
    newAccount: needsSetup,
    duplicate: false,
    enrolledCourseSlugs: courses.map((c) => c.slug),
    emailStatus,
    loginUrl,
  };
}

/**
 * Emails the buyer their way in, through GoHighLevel (see emailLinkThroughGhl).
 * An account without a password gets a fresh single-use /activate link (the
 * buyer chooses their own username and password there); one that already
 * has a password gets the login page. A failed handoff never rolls back the
 * account or access -- a webhook redelivery retries it.
 */
function triggerAccessEmail(input: {
  user: User;
  paymentId: string;
  contact: GhlContactRef;
  siteUrl: string;
}): Promise<EmailStatus> {
  const { user, paymentId, contact, siteUrl } = input;
  const needsSetup = !user.password;

  return emailLinkThroughGhl({
    user,
    contact,
    paymentId,
    tag: needsSetup ? GHL_TAGS.credentialsReady : GHL_TAGS.accessGranted,
    buildLink: async () =>
      needsSetup ? `${siteUrl}/activate?token=${await createPasswordSetupToken(user.id)}` : `${siteUrl}/login`,
  });
}

/**
 * On a redelivered webhook, hand the link over again only when the buyer
 * would otherwise be stuck: the first handoff never reached GoHighLevel, or
 * it did but the account still has no password and every setup link issued
 * for it has expired (re-running the workflow in GHL is how a late buyer
 * gets a fresh one). Otherwise nothing happens -- no new link, no second
 * tag, no duplicate email.
 */
async function resendAccessEmailIfNeeded(payment: Payment, user: User, siteUrl: string): Promise<EmailStatus> {
  const delivered = await prisma.emailLog.findFirst({
    where: { paymentId: payment.id, status: EmailStatus.SENT },
    select: { id: true },
  });
  if (delivered && (user.password || (await hasLivePasswordSetupToken(user.id)))) {
    return EmailStatus.SENT;
  }

  return triggerAccessEmail({
    user,
    paymentId: payment.id,
    contact: {
      contactId: payment.ghlContactId ?? undefined,
      locationId: payment.ghlLocationId ?? undefined,
      email: user.email,
    },
    siteUrl,
  });
}

export interface RefundResult {
  revokedCourseSlugs: string[];
}

/**
 * Handles a verified refund/chargeback webhook: marks the payment REFUNDED
 * and flips the matching enrollments to REVOKED, which requireCourseAccess
 * then rejects with 403. The account itself survives -- only course access
 * goes. Identified by the original transaction id when available, otherwise
 * by buyer email + course slug(s). Never called for transport errors or
 * delays -- only an explicit refund workflow in GoHighLevel reaches this.
 */
export async function handleCourseRefund(refund: CourseRefund): Promise<RefundResult> {
  let userId: string | null = null;
  let slugs = refund.courseSlugs;

  if (refund.transactionId) {
    const payment = await prisma.payment.findUnique({ where: { ghlTransactionId: refund.transactionId } });
    if (payment) {
      userId = payment.userId;
      if (slugs.length === 0) slugs = payment.courseSlugs;
      if (payment.status !== PaymentStatus.REFUNDED) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
      }
    }
  }

  if (!userId) {
    if (!refund.email) {
      throw new ValidationError("Refund webhook needs a transaction_id or an email to identify the buyer");
    }
    const user = await prisma.user.findUnique({ where: { email: refund.email }, select: { id: true } });
    if (!user) {
      // Nothing to revoke; acknowledge so GHL does not retry forever.
      console.warn(`[webhooks:gohighlevel] refund: no account for ${refund.email}, nothing to revoke`);
      return { revokedCourseSlugs: [] };
    }
    userId = user.id;
  }

  if (slugs.length === 0) {
    throw new ValidationError("Refund webhook needs a course_slug or a known transaction_id to know what to revoke");
  }

  const courses = await prisma.course.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const revoked: string[] = [];
  for (const course of courses) {
    const result = await prisma.enrollment.updateMany({
      where: { userId, courseId: course.id, status: { not: EnrollmentStatus.REVOKED } },
      data: { status: EnrollmentStatus.REVOKED },
    });
    if (result.count > 0) revoked.push(course.slug);
  }

  console.info(`[webhooks:gohighlevel] access revoked (refund/chargeback): ${revoked.join(", ") || "nothing to revoke"}`);
  return { revokedCourseSlugs: revoked };
}
