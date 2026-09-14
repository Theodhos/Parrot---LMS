import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma";

export function findModuleById(id: string) {
  return prisma.module.findUnique({ where: { id } });
}

export function listModulesByCourse(courseId: string) {
  return prisma.module.findMany({ where: { courseId }, orderBy: { order: "asc" } });
}

export async function nextModuleOrder(courseId: string) {
  const last = await prisma.module.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? -1) + 1;
}

export function createModule(data: Prisma.ModuleCreateInput) {
  return prisma.module.create({ data });
}

export function updateModule(id: string, data: Prisma.ModuleUpdateInput) {
  return prisma.module.update({ where: { id }, data });
}

export function deleteModule(id: string) {
  return prisma.module.delete({ where: { id } });
}

export async function reorderModules(courseId: string, orderedModuleIds: string[]) {
  await prisma.$transaction(
    orderedModuleIds.map((id, index) =>
      prisma.module.update({ where: { id, courseId }, data: { order: index } }),
    ),
  );
}
