import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityType, CourseStatus, EnrollmentStatus, NotificationType } from "@/generated/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import { canManageCourse, requireCourseManager, type SessionUser } from "@/lib/permissions";
import { hasAllCourseAccess } from "@/features/access/services/all-access";
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
  if (existing) {
    // A re-purchase after a refund (REVOKED) or a drop restores access.
    if (existing.status === EnrollmentStatus.REVOKED || existing.status === EnrollmentStatus.DROPPED) {
      return prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.ACTIVE },
      });
    }
    return existing;
  }

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
 * Explicit "start learning" entry point, reachable by any signed-in user
 * (server action and POST /api/enrollments). Self-serve enrollment is only
 * for free courses: a paid course opens through a verified purchase (the
 * GoHighLevel webhook), never by asking for it here. Course managers and
 * holders of an all-courses purchase may enroll in anything.
 */
export async function enrollInCourse(user: SessionUser, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true, status: true, priceCents: true },
  });
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError("Course");
  }

  const existing = await enrollmentRepo.findEnrollment(user.id, courseId);
  const usable =
    existing && existing.status !== EnrollmentStatus.REVOKED && existing.status !== EnrollmentStatus.DROPPED;
  if (
    course.priceCents > 0 &&
    !usable &&
    !canManageCourse(user, course) &&
    !(await hasAllCourseAccess(user.id))
  ) {
    throw new ForbiddenError("This course must be purchased before you can access it");
  }

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
