import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/features/notifications/services/notification.service";

export const PATCH = withApiHandler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();
  await markNotificationRead(user, id);
  return apiSuccess({ success: true });
});
