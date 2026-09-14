import "server-only";
import { prisma } from "@/lib/db/client";
import type { EnrollmentStatus } from "@/generated/prisma";

export function findEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

export function createEnrollment(userId: string, courseId: string) {
  return prisma.enrollment.create({ data: { userId, courseId } });
}

export function listEnrollmentsForUser(userId: string, status?: EnrollmentStatus) {
  return prisma.enrollment.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { lastAccessedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          level: true,
          category: { select: { name: true } },
          instructor: { select: { name: true } },
          modules: { select: { lessons: { select: { id: true, duration: true } } } },
        },
      },
    },
  });
}

export async function listEnrollmentsForCourse(courseId: string, page: number, pageSize: number) {
  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
  ]);
  return { total, enrollments };
}

export function countActiveEnrollmentsForCourse(courseId: string) {
  return prisma.enrollment.count({ where: { courseId } });
}
