import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, PaymentStatus, Role } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { siteUrlFromHeaders } from "@/lib/site-url";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import type { CoursePurchase, CourseRefund } from "@/features/access/schemas/access.schema";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";
import { ALL_COURSES, hasAllCourseAccess } from "@/features/access/services/all-access";

/**
 * The user's usable enrollment in a course, or null when they have no access.
 * A REVOKED (refund/chargeback) or DROPPED row grants nothing. A buyer with
 * no row at all is enrolled on the spot -- that is how a course published
 * after their purchase opens for them without anyone having to grant it.
 */
export async function getAccessibleEnrollment(user: { id: string }, courseId: string) {
  const enrollment = await enrollmentRepo.findEnrollment(user.id, courseId);
  if (enrollment) {
    const blocked = enrollment.status === EnrollmentStatus.REVOKED || enrollment.status === EnrollmentStatus.DROPPED;
    return blocked ? null : enrollment;
  }
  if (await hasAllCourseAccess(user.id)) {
    return ensureEnrollment(user.id, courseId);
  }
  return null;
}

/**
 * Throws ForbiddenError unless the user has access to this course (or
 * manages it, for instructor/admin preview). Every protected course/lesson
 * read must go through this -- never trust a client-supplied "I have access"
 * claim; the enrollment and payment rows in the database are the only source
 * of truth.
 */
export async function requireCourseAccess(
  user: SessionUser,
  course: { id: string; instructorId: string },
): Promise<void> {
  if (canManageCourse(user, course)) return;

  if (!(await getAccessibleEnrollment(user, course.id))) {
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
 * password yet) -> enroll into every published course (lifetime access, no
 * expiry; one purchase opens the whole platform) -> record the Payment row.
 *
 * A purchase causes NO email, directly or indirectly: nothing is written to
 * the buyer's GoHighLevel contact (no field, no tag), so no GoHighLevel
 * workflow can be set off from here. The checkout redirects the buyer to
 * /welcome, where they type their checkout email and choose their own
 * username and password (claimAccountAfterCheckout); an account that already
 * has a password simply signs in.
 *
 * Consistency: every step before the Payment row is idempotent (unique
 * email, unique userId+courseId), and the Payment row -- the idempotency
 * marker -- is written last. If provisioning dies halfway, the webhook errors,
 * GoHighLevel redelivers, and the replay completes the remaining steps.
 */
export async function handleCoursePurchase(
  purchase: CoursePurchase,
  requestHeaders: Headers,
): Promise<PurchaseResult> {
  const siteUrl = siteUrlFromHeaders(requestHeaders);
  const loginUrl = `${siteUrl}/login`;

  assertSuccessfulPayment(purchase);

  // Idempotency: a transaction already recorded means this webhook is a
  // redelivery. Acknowledge it (so GHL stops retrying) and do nothing else.
  if (purchase.transactionId) {
    const existing = await prisma.payment.findUnique({
      where: { ghlTransactionId: purchase.transactionId },
    });
    if (existing) {
      console.info(`[webhooks:gohighlevel] duplicate webhook ignored for transaction ${existing.ghlTransactionId}`);
      return {
        newAccount: false,
        duplicate: true,
        enrolledCourseSlugs: existing.courseSlugs,
        loginUrl,
      };
    }
  }

  // One purchase opens everything: enroll into every course published right
  // now; courses published later open on first visit (getAccessibleEnrollment).
  const courses = await prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED },
    select: { id: true, slug: true },
  });

  // Find or provision the account. An existing account is never duplicated
  // and its password is never touched -- it just gains the new enrollment.
  // A new account has no password: it cannot be logged into until the buyer
  // chooses a username and password on /welcome.
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

  // Lifetime access: an ACTIVE enrollment per course, no expiry.
  // ensureEnrollment is idempotent and re-activates a previously REVOKED one.
  // In parallel: there can be dozens of courses, and the webhook has to
  // answer before GoHighLevel gives up on it.
  const buyerId = user.id;
  await Promise.all(courses.map((course) => ensureEnrollment(buyerId, course.id)));
  console.info(`[webhooks:gohighlevel] access granted to all ${courses.length} published courses -> ${purchase.email}`);

  // Written last: this row is both the payment record and the "fully
  // processed" idempotency marker for this transaction.
  await prisma.payment.create({
    data: {
      userId: user.id,
      ghlTransactionId: purchase.transactionId ?? `no-txn:${randomUUID()}`,
      ghlContactId: purchase.contactId,
      ghlProductId: purchase.productId,
      ghlLocationId: purchase.locationId,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      status: PaymentStatus.SUCCEEDED,
      courseSlugs: [ALL_COURSES],
      issuedCredentials: needsSetup,
    },
  });

  return {
    newAccount: needsSetup,
    duplicate: false,
    enrolledCourseSlugs: courses.map((c) => c.slug),
    loginUrl,
  };
}

export interface RefundResult {
  revokedCourseSlugs: string[];
}

/**
 * Handles a verified refund/chargeback webhook: marks the payment REFUNDED
 * and, if that leaves the buyer with no other paid purchase, flips their
 * enrollments in every paid course to REVOKED -- which requireCourseAccess
 * then rejects with 403 -- so the platform closes again. A buyer who still
 * holds another un-refunded purchase keeps everything. Free courses were
 * never behind a purchase and stay open, and the account itself survives.
 * Identified by the original transaction id, or by buyer email. Never called
 * for transport errors or delays -- only an explicit refund workflow in
 * GoHighLevel reaches this.
 */
export async function handleCourseRefund(refund: CourseRefund): Promise<RefundResult> {
  let userId: string | null = null;

  if (refund.transactionId) {
    const payment = await prisma.payment.findUnique({ where: { ghlTransactionId: refund.transactionId } });
    if (payment) {
      userId = payment.userId;
      if (payment.status !== PaymentStatus.REFUNDED) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
      }
    }
  }

  if (!userId) {
    if (!refund.email) {
      throw new ValidationError("Refund webhook needs a known transaction_id or an email to identify the buyer");
    }
    const user = await prisma.user.findUnique({ where: { email: refund.email }, select: { id: true } });
    if (!user) {
      // Nothing to revoke; acknowledge so GHL does not retry forever.
      console.warn(`[webhooks:gohighlevel] refund: no account for ${refund.email}, nothing to revoke`);
      return { revokedCourseSlugs: [] };
    }
    userId = user.id;
    // No transaction to single out: a refund named only by email refunds
    // everything the buyer paid for.
    await prisma.payment.updateMany({
      where: { userId, status: PaymentStatus.SUCCEEDED },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  if (await hasAllCourseAccess(userId)) {
    console.info("[webhooks:gohighlevel] refund recorded; the buyer still holds another purchase, access kept");
    return { revokedCourseSlugs: [] };
  }

  const paidCourses = await prisma.course.findMany({
    where: { priceCents: { gt: 0 } },
    select: { id: true, slug: true },
  });
  const slugById = new Map(paidCourses.map((c) => [c.id, c.slug]));
  const toRevoke = await prisma.enrollment.findMany({
    where: { userId, courseId: { in: [...slugById.keys()] }, status: { not: EnrollmentStatus.REVOKED } },
    select: { id: true, courseId: true },
  });
  await prisma.enrollment.updateMany({
    where: { id: { in: toRevoke.map((e) => e.id) } },
    data: { status: EnrollmentStatus.REVOKED },
  });

  const revoked = toRevoke.map((e) => slugById.get(e.courseId)!);
  console.info(`[webhooks:gohighlevel] access revoked (refund/chargeback): ${revoked.join(", ") || "nothing to revoke"}`);
  return { revokedCourseSlugs: revoked };
}
