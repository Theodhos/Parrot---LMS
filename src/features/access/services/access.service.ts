import "server-only";
import { prisma } from "@/lib/db/client";
import { AccessStatus, CourseStatus, Role } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { siteUrl } from "@/lib/site-url";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import type { CoursePurchaseCompletePayload, WooCommerceWebhookPayload } from "@/features/access/schemas/access.schema";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";
import { createPasswordSetupToken } from "@/features/auth/services/activation.service";

/**
 * Reads the locally-cached purchase-access state for a course. This cache is
 * written ONLY by the signed webhook handler
 * (src/app/api/webhooks/woocommerce/route.ts) -- nothing here ever trusts a
 * client-supplied hasAccess/status value. WordPress/WooCommerce remains the
 * authority on the purchase itself; this is a performance cache in front of it.
 */
export async function getCourseAccess(wordpressUserId: number, courseId: string) {
  const row = await prisma.courseAccess.findUnique({
    where: { wordpressUserId_courseId: { wordpressUserId, courseId } },
  });

  return {
    hasAccess: row?.status === AccessStatus.ACTIVE,
    status: row?.status ?? null,
  };
}

export async function listActiveCourseAccess(wordpressUserId: number) {
  return prisma.courseAccess.findMany({
    where: { wordpressUserId, status: AccessStatus.ACTIVE },
  });
}

/**
 * Throws ForbiddenError unless the user is enrolled in this course (or
 * manages it, for instructor/admin preview). Every protected course/lesson
 * read must go through this -- never trust a client-supplied "I have access"
 * claim. Enrollment is free and self-serve (see enrollInCourse); this just
 * gates lesson content to people who actually clicked "Enroll".
 */
export async function requireCourseAccess(
  user: SessionUser,
  course: { id: string; instructorId: string },
): Promise<void> {
  if (canManageCourse(user, course)) return;

  const enrollment = await enrollmentRepo.findEnrollment(user.id, course.id);
  if (!enrollment) {
    throw new ForbiddenError("Enroll in this course to access its lessons");
  }
}

/**
 * Applies a verified webhook event: upserts the CourseAccess cache (idempotent
 * on wordpressUserId+courseId, so replayed WooCommerce events never create
 * duplicate rows) and, if the buyer already has a local account, immediately
 * syncs an Enrollment so their dashboard reflects the purchase without
 * waiting for their next login.
 */
export async function applyAccessWebhookEvent(payload: WooCommerceWebhookPayload) {
  const course = await prisma.course.findUnique({ where: { slug: payload.courseId }, select: { id: true } });
  if (!course) {
    console.warn(`[webhooks:woocommerce] No course found for slug "${payload.courseId}" (product ${payload.productId})`);
    return { applied: false as const };
  }

  const status = payload.event === "access.granted" ? AccessStatus.ACTIVE : AccessStatus.REVOKED;

  await prisma.courseAccess.upsert({
    where: { wordpressUserId_courseId: { wordpressUserId: payload.wordpressUserId, courseId: course.id } },
    create: {
      wordpressUserId: payload.wordpressUserId,
      courseId: course.id,
      courseSlug: payload.courseId,
      woocommerceProductId: payload.productId,
      woocommerceOrderId: payload.orderId,
      status,
    },
    update: {
      woocommerceProductId: payload.productId,
      woocommerceOrderId: payload.orderId,
      status,
    },
  });

  if (status === AccessStatus.ACTIVE) {
    const localUser = await prisma.user.findFirst({
      where: { wordpressUserId: payload.wordpressUserId },
      select: { id: true },
    });
    if (localUser) {
      await ensureEnrollment(localUser.id, course.id);
    }
  }

  return { applied: true as const };
}

/**
 * Called right after login (see auth.service.ts): ensures every course the
 * WordPress side already considers "active" for this user has a matching
 * local Enrollment, covering the case where a purchase's webhook arrived
 * before the buyer's first Next.js sign-in (or a webhook delivery was
 * missed entirely -- this doubles as reconciliation).
 */
export async function syncEnrollmentsFromAccess(userId: string, wordpressUserId: number) {
  const activeAccess = await listActiveCourseAccess(wordpressUserId);
  for (const access of activeAccess) {
    await ensureEnrollment(userId, access.courseId);
  }
}

/**
 * Handles a verified, synchronous "purchase completed" call from the
 * WordPress plugin's order-received page (checkout happens on WordPress;
 * identity stays local). Finds or creates the buyer's Parrot LMS account by
 * the checkout email, grants access to every purchased course, and tells
 * the caller where to send the buyer's browser next:
 *  - a brand-new account (or one that was created but never had a password
 *    set) gets a one-time "create your password" link
 *  - an account that already has a password just goes to login -- they
 *    already know it
 */
export async function handleCoursePurchaseComplete(payload: CoursePurchaseCompletePayload): Promise<{
  redirectUrl: string;
}> {
  const courses = await prisma.course.findMany({
    where: { slug: { in: payload.courseSlugs }, status: CourseStatus.PUBLISHED },
    select: { id: true, slug: true },
  });
  const foundSlugs = new Set(courses.map((c) => c.slug));
  const missing = payload.courseSlugs.filter((slug) => !foundSlugs.has(slug));
  if (missing.length > 0) {
    console.warn(`[webhooks:woocommerce] purchase-complete: no published course for slug(s) ${missing.join(", ")}`);
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name?.trim() || payload.email.split("@")[0]!,
        role: Role.STUDENT,
        password: null,
      },
    });
  }

  for (const course of courses) {
    await ensureEnrollment(user.id, course.id);
  }

  if (user.password) {
    return { redirectUrl: `${siteUrl()}/login?callbackUrl=${encodeURIComponent("/dashboard")}` };
  }

  const token = await createPasswordSetupToken(user.id);
  return { redirectUrl: `${siteUrl()}/activate?token=${token}` };
}
