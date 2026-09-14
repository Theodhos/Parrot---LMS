import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityType, CourseStatus, NotificationType } from "@/generated/prisma";
import { NotFoundError } from "@/lib/errors/app-error";
import { requireCourseManager, type SessionUser } from "@/lib/permissions";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";

/**
 * Idempotent, access-check-free enrollment creation. This is the primitive
 * both the webhook handler (on a verified purchase) and enrollInCourse
 * (below) build on -- it never decides on its own whether the caller is
 * allowed to enroll, so it must only ever be called after that's already
 * been established.
 */
export async function ensureEnrollment(userId: string, courseId: string) {
  const existing = await enrollmentRepo.findEnrollment(userId, courseId);
  if (existing) return existing;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  if (!course) throw new NotFoundError("Course");

  const [enrollment] = await prisma.$transaction([
    prisma.enrollment.create({ data: { userId, courseId } }),
    prisma.learningActivity.create({
      data: {
        user: { connect: { id: userId } },
        course: { connect: { id: courseId } },
        type: ActivityType.COURSE_ENROLLED,
        minutesSpent: 0,
      },
    }),
    prisma.notification.create({
      data: {
        user: { connect: { id: userId } },
        title: "Course unlocked",
        message: `"${course.title}" is ready -- happy learning!`,
        type: NotificationType.ENROLLMENT,
      },
    }),
  ]);

  return enrollment;
}

/**
 * Explicit "start learning" entry point for an already-purchased course.
 * Requires active WooCommerce-verified access -- there is no free
 * self-enroll path in this application; see features/access/services.
 */
export async function enrollInCourse(user: SessionUser, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true },
  });
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError("Course");
  }

  // Imported lazily to avoid a module-init cycle with access.service.ts,
  // which itself calls ensureEnrollment() from this file.
  const { requireCourseAccess } = await import("@/features/access/services/access.service");
  await requireCourseAccess(user, course);

  return ensureEnrollment(user.id, courseId);
}

export function listMyEnrollments(user: SessionUser) {
  return enrollmentRepo.listEnrollmentsForUser(user.id);
}

export async function listCourseEnrollments(user: SessionUser, courseId: string, page: number, pageSize: number) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true } });
  if (!course) throw new NotFoundError("Course");
  requireCourseManager(user, course);
  return enrollmentRepo.listEnrollmentsForCourse(courseId, page, pageSize);
}

export function getMyEnrollment(user: SessionUser, courseId: string) {
  return enrollmentRepo.findEnrollment(user.id, courseId);
}
