import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma";

export async function listForUser(userId: string, page: number, pageSize: number) {
  const [total, unreadCount, items] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, unreadCount, items };
}

export function createNotification(data: Prisma.NotificationCreateInput) {
  return prisma.notification.create({ data });
}

export function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
