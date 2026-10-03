import "server-only";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EmailStatus, EnrollmentStatus, PaymentStatus, Role, type Payment, type User } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { siteUrlFromHeaders } from "@/lib/site-url";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import type { CoursePurchase, CourseRefund } from "@/features/access/schemas/access.schema";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";
import { generateTemporaryPassword, generateUniqueUsername } from "@/features/auth/services/credentials.service";
import {
  CREDENTIAL_FIELD_KEYS,
  GHL_TAGS,
  addContactTag,
  setContactCustomFields,
  type GhlContactRef,
} from "@/features/access/services/gohighlevel.service";

const PASSWORD_HASH_ROUNDS = 10;

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
 * -> find-or-create the account by checkout email (new accounts get a
 * generated unique username + crypto-random password, stored only as a
 * bcrypt hash) -> enroll into every purchased course (lifetime access, no
 * expiry) -> record the Payment row -> hand the credentials to GoHighLevel
 * (contact custom fields + a trigger tag), whose workflow sends the email.
 * The app sends no email itself -- GoHighLevel is the delivery system.
 *
 * Consistency: every step before the Payment row is idempotent (unique
 * email, unique userId+courseId), and the Payment row -- the idempotency
 * marker -- is written last. If provisioning dies halfway, the webhook errors,
 * GoHighLevel redelivers, and the replay completes the remaining steps.
 * A failed credentials handoff never rolls anything back (the EmailLog row
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
      const emailStatus = await retryPurchaseEmailIfNeeded(existing, existing.user, loginUrl);
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
  let user = await prisma.user.findUnique({ where: { email: purchase.email } });
  let generatedPassword: string | null = null;

  if (!user) {
    const username = await generateUniqueUsername(purchase.email, purchase.name);
    generatedPassword = generateTemporaryPassword();
    user = await prisma.user.create({
      data: {
        email: purchase.email,
        name: purchase.name?.trim() || purchase.email.split("@")[0]!,
        username,
        password: await bcrypt.hash(generatedPassword, PASSWORD_HASH_ROUNDS),
        role: Role.STUDENT,
      },
    });
    console.info(`[webhooks:gohighlevel] user created for ${purchase.email} (username ${username})`);
  } else if (!user.password) {
    // Account shell from an earlier flow that never finished setup: give it
    // real credentials now so the buyer can actually log in.
    const username = user.username ?? (await generateUniqueUsername(purchase.email, purchase.name));
    generatedPassword = generateTemporaryPassword();
    user = await prisma.user.update({
      where: { id: user.id },
      data: { username, password: await bcrypt.hash(generatedPassword, PASSWORD_HASH_ROUNDS) },
    });
    console.info(`[webhooks:gohighlevel] credentials issued for existing account ${purchase.email}`);
  }

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
      issuedCredentials: generatedPassword !== null,
    },
  });

  const emailStatus = await triggerCredentialsEmail({
    user,
    paymentId: payment.id,
    generatedPassword,
    contact: { contactId: purchase.contactId, locationId: purchase.locationId, email: purchase.email },
    loginUrl,
  });

  return {
    newAccount: generatedPassword !== null,
    duplicate: false,
    enrolledCourseSlugs: courses.map((c) => c.slug),
    emailStatus,
    loginUrl,
  };
}

/**
 * Hands the buyer's login details to GoHighLevel, which owns email delivery:
 * writes the course_username / course_password / course_login_url contact
 * custom fields FIRST, then adds the trigger tag that fires the matching
 * GHL email workflow. Order matters -- the tag must never fire before the
 * fields it merges are in place. The attempt is recorded as an EmailLog row
 * (SENT = handed off to GHL, FAILED = handoff failed and a webhook
 * redelivery will retry); failures never roll back the account or access.
 * The plaintext password goes ONLY into the GHL custom field the email
 * merges -- never into our database or logs.
 */
async function triggerCredentialsEmail(input: {
  user: User;
  paymentId: string;
  generatedPassword: string | null;
  contact: GhlContactRef;
  loginUrl: string;
}): Promise<EmailStatus> {
  const { user, paymentId, generatedPassword, contact, loginUrl } = input;
  const tag = generatedPassword !== null ? GHL_TAGS.credentialsReady : GHL_TAGS.accessGranted;

  const log = await prisma.emailLog.create({
    data: {
      to: user.email,
      subject: `GoHighLevel credentials workflow (tag: ${tag})`,
      status: EmailStatus.PENDING,
      userId: user.id,
      paymentId,
    },
  });

  try {
    const contactId = await setContactCustomFields(contact, {
      [CREDENTIAL_FIELD_KEYS.username]: user.username ?? user.email,
      // Always written: a repeat purchase that keeps the existing password
      // overwrites (clears) any stale plaintext left from the first email.
      [CREDENTIAL_FIELD_KEYS.password]: generatedPassword ?? "",
      [CREDENTIAL_FIELD_KEYS.loginUrl]: loginUrl,
    });
    await addContactTag(contactId, tag);

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: EmailStatus.SENT, sentAt: new Date(), error: null },
    });
    console.info(`[webhooks:gohighlevel] credentials handed to GHL contact ${contactId}, tag "${tag}" added`);
    return EmailStatus.SENT;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.emailLog
      .update({ where: { id: log.id }, data: { status: EmailStatus.FAILED, error: message } })
      .catch(() => {});
    console.error(`[webhooks:gohighlevel] credentials handoff to GHL FAILED for ${user.email}: ${message}`);
    return EmailStatus.FAILED;
  }
}

/**
 * On a redelivered webhook: if the credentials were never successfully handed
 * to GoHighLevel, rotate the password (the plaintext is not stored here, so
 * the original cannot be re-pushed) and try again. Safe because a
 * FAILED/PENDING-only log means the tag was never added, no email went out,
 * and the buyer cannot have logged in. Once a handoff is SENT, redeliveries
 * change nothing -- no new password, no second tag, no duplicate email.
 */
async function retryPurchaseEmailIfNeeded(payment: Payment, user: User, loginUrl: string): Promise<EmailStatus> {
  const delivered = await prisma.emailLog.findFirst({
    where: { paymentId: payment.id, status: EmailStatus.SENT },
    select: { id: true },
  });
  if (delivered) return EmailStatus.SENT;

  let generatedPassword: string | null = null;
  let freshUser = user;
  if (payment.issuedCredentials) {
    generatedPassword = generateTemporaryPassword();
    freshUser = await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(generatedPassword, PASSWORD_HASH_ROUNDS) },
    });
    console.info(`[webhooks:gohighlevel] credentials handoff retry: password rotated for ${user.email}`);
  }

  return triggerCredentialsEmail({
    user: freshUser,
    paymentId: payment.id,
    generatedPassword,
    contact: {
      contactId: payment.ghlContactId ?? undefined,
      locationId: payment.ghlLocationId ?? undefined,
      email: user.email,
    },
    loginUrl,
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
