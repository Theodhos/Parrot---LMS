import "server-only";
import { prisma } from "@/lib/db/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireCourseManager, type SessionUser } from "@/lib/permissions";
import * as moduleRepo from "@/features/modules/repositories/module.repository";
import { removeUploadedMediaFor } from "@/features/media/services/media-cleanup";
import type { CreateModuleInput, UpdateModuleInput } from "@/features/modules/schemas/module.schema";

async function requireManageableCourse(user: SessionUser, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true } });
  if (!course) throw new NotFoundError("Course");
  requireCourseManager(user, course);
  return course;
}

export async function listModules(user: SessionUser, courseId: string) {
  await requireManageableCourse(user, courseId);
  return moduleRepo.listModulesByCourse(courseId);
}

export async function createModule(user: SessionUser, courseId: string, input: CreateModuleInput) {
  await requireManageableCourse(user, courseId);
  const order = await moduleRepo.nextModuleOrder(courseId);
  return moduleRepo.createModule({
    title: input.title,
    description: input.description,
    order,
    course: { connect: { id: courseId } },
  });
}

export async function updateModule(user: SessionUser, courseId: string, moduleId: string, input: UpdateModuleInput) {
  await requireManageableCourse(user, courseId);
  const existing = await moduleRepo.findModuleById(moduleId);
  if (!existing || existing.courseId !== courseId) throw new NotFoundError("Module");

  return moduleRepo.updateModule(moduleId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
  });
}

export async function deleteModule(user: SessionUser, courseId: string, moduleId: string) {
  await requireManageableCourse(user, courseId);
  const existing = await moduleRepo.findModuleById(moduleId);
  if (!existing || existing.courseId !== courseId) throw new NotFoundError("Module");
  const lessons = await prisma.lesson.findMany({ where: { moduleId }, select: { videoUrl: true } });
  const deleted = await moduleRepo.deleteModule(moduleId);
  await removeUploadedMediaFor(lessons.map((l) => l.videoUrl));
  return deleted;
}

export async function reorderModules(user: SessionUser, courseId: string, orderedModuleIds: string[]) {
  await requireManageableCourse(user, courseId);
  const existing = await moduleRepo.listModulesByCourse(courseId);
  const existingIds = new Set(existing.map((m) => m.id));
  const providedIds = new Set(orderedModuleIds);

  if (existingIds.size !== providedIds.size || [...existingIds].some((id) => !providedIds.has(id))) {
    throw new ValidationError("Reorder payload must include every module in this course exactly once");
  }

  await moduleRepo.reorderModules(courseId, orderedModuleIds);
  return moduleRepo.listModulesByCourse(courseId);
}
