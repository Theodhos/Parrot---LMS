import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma";

export function findLessonById(id: string) {
  return prisma.lesson.findUnique({ where: { id }, include: { quiz: { include: { questions: { include: { answers: true } } } } } });
}

export function listLessonsByModule(moduleId: string) {
  return prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } });
}

export async function nextLessonOrder(moduleId: string) {
  const last = await prisma.lesson.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? -1) + 1;
}

export function createLesson(data: Prisma.LessonCreateInput) {
  return prisma.lesson.create({ data });
}

export function updateLesson(id: string, data: Prisma.LessonUpdateInput) {
  return prisma.lesson.update({ where: { id }, data });
}

export function deleteLesson(id: string) {
  return prisma.lesson.delete({ where: { id } });
}

export async function reorderLessons(moduleId: string, orderedLessonIds: string[]) {
  await prisma.$transaction(
    orderedLessonIds.map((id, index) => prisma.lesson.update({ where: { id, moduleId }, data: { order: index } })),
  );
}

export function countPublishedLessonsForCourse(courseId: string) {
  return prisma.lesson.count({ where: { courseId, published: true } });
}

export function listPublishedLessonIdsForCourse(courseId: string) {
  return prisma.lesson.findMany({ where: { courseId, published: true }, select: { id: true } });
}

/** Ordered lesson list for the "previous / next" navigation in the learning interface. */
export function listCourseLessonsForNav(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId, published: true },
    orderBy: [{ moduleId: "asc" }, { order: "asc" }],
    select: { id: true, title: true, slug: true, moduleId: true, order: true, type: true },
  });
}
