import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma";

export function createMedia(data: Prisma.MediaCreateInput) {
  return prisma.media.create({ data });
}

export function listMediaForUser(userId: string) {
  return prisma.media.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function listAllMedia(page: number, pageSize: number) {
  return Promise.all([
    prisma.media.count(),
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
}

export function findMediaById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export function deleteMedia(id: string) {
  return prisma.media.delete({ where: { id } });
}
