import "server-only";
import type { SessionUser } from "@/lib/permissions";
import * as notificationRepo from "@/features/notifications/repositories/notification.repository";

export async function listMyNotifications(user: SessionUser, page: number, pageSize: number) {
  const { total, unreadCount, items } = await notificationRepo.listForUser(user.id, page, pageSize);
  return { items, total, unreadCount, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function markNotificationRead(user: SessionUser, id: string) {
  await notificationRepo.markRead(id, user.id);
}

export async function markAllNotificationsRead(user: SessionUser) {
  await notificationRepo.markAllRead(user.id);
}
