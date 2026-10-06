import "server-only";
import { prisma } from "@/lib/db/client";
import { CourseStatus, EnrollmentStatus, Role } from "@/generated/prisma";
import { NotFoundError } from "@/lib/errors/app-error";
import { requireRole, type SessionUser } from "@/lib/permissions";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import { hasAllCourseAccess } from "@/features/access/services/all-access";

export interface UserCourseAccess {
  user: { id: string; name: string; email: string };
  /** Holds a purchase: every published course is open to them whatever is assigned here. */
  buyer: boolean;
  courses: { id: string; title: string; priceCents: number; assigned: boolean }[];
}

const isUsable = (status: EnrollmentStatus) =>
  status !== EnrollmentStatus.REVOKED && status !== EnrollmentStatus.DROPPED;

/**
 * What an admin sees when deciding which courses a member has: every
 * published course, and whether it is currently theirs. A member who has not
 * purchased is only shown a paid course in their library once it is assigned.
 */
export async function getUserCourseAccess(admin: SessionUser, userId: string): Promise<UserCourseAccess> {
  requireRole(admin, Role.ADMIN);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!user) throw new NotFoundError("User");

  const [courses, enrollments, buyer] = await Promise.all([
    prisma.course.findMany({
      where: { status: CourseStatus.PUBLISHED },
      orderBy: { title: "asc" },
      select: { id: true, title: true, priceCents: true },
    }),
    prisma.enrollment.findMany({ where: { userId }, select: { courseId: true, status: true } }),
    hasAllCourseAccess(userId),
  ]);
  const assigned = new Set(enrollments.filter((e) => isUsable(e.status)).map((e) => e.courseId));

  return { user, buyer, courses: courses.map((course) => ({ ...course, assigned: assigned.has(course.id) })) };
}

/**
 * Assigns a course to a member, or takes it away again. Assigning is what
 * opens a paid course to someone who has not purchased (and makes it appear
 * in their library); taking it away marks the enrollment REVOKED, which
 * every course and lesson read then refuses. Their progress is kept, so
 * assigning the course again picks up where they left off.
 */
export async function setUserCourseAccess(
  admin: SessionUser,
  userId: string,
  courseId: string,
  assigned: boolean,
): Promise<void> {
  requireRole(admin, Role.ADMIN);
  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
  ]);
  if (!user) throw new NotFoundError("User");
  if (!course) throw new NotFoundError("Course");

  if (assigned) {
    await ensureEnrollment(userId, courseId);
    return;
  }
  await prisma.enrollment.updateMany({
    where: { userId, courseId, status: { not: EnrollmentStatus.REVOKED } },
    data: { status: EnrollmentStatus.REVOKED },
  });
}
