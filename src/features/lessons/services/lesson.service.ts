import "server-only";
import { prisma } from "@/lib/db/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireCourseManager, type SessionUser } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import * as lessonRepo from "@/features/lessons/repositories/lesson.repository";
import type { CreateLessonInput, UpdateLessonInput } from "@/features/lessons/schemas/lesson.schema";

async function requireManageableModule(user: SessionUser, courseId: string, moduleId: string) {
  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { id: true, instructorId: true } } },
  });
  if (!moduleRecord || moduleRecord.courseId !== courseId) throw new NotFoundError("Module");
  requireCourseManager(user, moduleRecord.course);
  return moduleRecord;
}

async function uniqueLessonSlug(moduleId: string, base: string) {
  const baseSlug = slugify(base);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.lesson.findFirst({ where: { moduleId, slug }, select: { id: true } })) {
    slug = `${baseSlug}-${++suffix}`;
  }
  return slug;
}

export async function createLesson(user: SessionUser, courseId: string, moduleId: string, input: CreateLessonInput) {
  await requireManageableModule(user, courseId, moduleId);

  const [order, slug] = await Promise.all([
    lessonRepo.nextLessonOrder(moduleId),
    uniqueLessonSlug(moduleId, input.title),
  ]);

  return lessonRepo.createLesson({
    title: input.title,
    slug,
    description: input.description,
    content: input.content,
    videoUrl: input.videoUrl || null,
    duration: input.duration,
    type: input.type,
    published: input.published,
    order,
    module: { connect: { id: moduleId } },
    courseId,
  });
}

export async function updateLesson(
  user: SessionUser,
  courseId: string,
  moduleId: string,
  lessonId: string,
  input: UpdateLessonInput,
) {
  await requireManageableModule(user, courseId, moduleId);
  const existing = await lessonRepo.findLessonById(lessonId);
  if (!existing || existing.moduleId !== moduleId) throw new NotFoundError("Lesson");

  return lessonRepo.updateLesson(lessonId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl || null } : {}),
    ...(input.duration !== undefined ? { duration: input.duration } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
  });
}

export async function deleteLesson(user: SessionUser, courseId: string, moduleId: string, lessonId: string) {
  await requireManageableModule(user, courseId, moduleId);
  const existing = await lessonRepo.findLessonById(lessonId);
  if (!existing || existing.moduleId !== moduleId) throw new NotFoundError("Lesson");
  return lessonRepo.deleteLesson(lessonId);
}

export async function reorderLessons(user: SessionUser, courseId: string, moduleId: string, orderedLessonIds: string[]) {
  await requireManageableModule(user, courseId, moduleId);
  const existing = await lessonRepo.listLessonsByModule(moduleId);
  const existingIds = new Set(existing.map((l) => l.id));
  const providedIds = new Set(orderedLessonIds);

  if (existingIds.size !== providedIds.size || [...existingIds].some((id) => !providedIds.has(id))) {
    throw new ValidationError("Reorder payload must include every lesson in this module exactly once");
  }

  await lessonRepo.reorderLessons(moduleId, orderedLessonIds);
  return lessonRepo.listLessonsByModule(moduleId);
}
