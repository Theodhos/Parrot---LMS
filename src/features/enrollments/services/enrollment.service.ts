import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityType, CourseStatus, NotificationType } from "@/generated/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors/app-error";
import { requireCourseManager, type SessionUser } from "@/lib/permissions";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";

export async function enrollInCourse(user: SessionUser, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true, status: true } });
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError("Course");
  }

  const existing = await enrollmentRepo.findEnrollment(user.id, courseId);
  if (existing) throw new ConflictError("You are already enrolled in this course");

  const [enrollment] = await prisma.$transaction([
    prisma.enrollment.create({ data: { userId: user.id, courseId } }),
    prisma.learningActivity.create({
      data: {
        user: { connect: { id: user.id } },
        course: { connect: { id: courseId } },
        type: ActivityType.COURSE_ENROLLED,
        minutesSpent: 0,
      },
    }),
    prisma.notification.create({
      data: {
        user: { connect: { id: user.id } },
        title: "Enrolled successfully",
        message: `You're now enrolled in "${course.title}". Happy learning!`,
        type: NotificationType.ENROLLMENT,
      },
    }),
  ]);

  return enrollment;
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
