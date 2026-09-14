import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseSearchParams } from "@/lib/validation";
import { listMyNotifications, markAllNotificationsRead } from "@/features/notifications/services/notification.service";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const { page, pageSize } = parseSearchParams(querySchema, req.nextUrl.searchParams);
  const result = await listMyNotifications(user, page, pageSize);
  return apiSuccess(result.items, {
    meta: { total: result.total, unreadCount: result.unreadCount, page, pageSize, pageCount: result.pageCount },
  });
});

export const PATCH = withApiHandler(async () => {
  const user = await requireCurrentUser();
  await markAllNotificationsRead(user);
  return apiSuccess({ success: true });
});
