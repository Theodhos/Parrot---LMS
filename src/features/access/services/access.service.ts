import "server-only";
import { prisma } from "@/lib/db/client";
import { AccessStatus } from "@/generated/prisma";
import { ForbiddenError } from "@/lib/errors/app-error";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import type { WooCommerceWebhookPayload } from "@/features/access/schemas/access.schema";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";

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
 * Throws ForbiddenError unless the user has purchased this course (or
 * manages it, for instructor/admin preview). Every protected course/lesson
 * read must go through this -- never trust a client-supplied "I have access"
 * claim, per the spec's core rule.
 */
export async function requireCourseAccess(
  user: SessionUser,
  course: { id: string; instructorId: string },
): Promise<void> {
  if (canManageCourse(user, course)) return;

  if (!user.wordpressUserId) {
    throw new ForbiddenError("This course must be purchased before you can access it");
  }

  const { hasAccess } = await getCourseAccess(user.wordpressUserId, course.id);
  if (!hasAccess) {
    throw new ForbiddenError("This course must be purchased before you can access it");
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
    const localUser = await prisma.user.findUnique({
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
