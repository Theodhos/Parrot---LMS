import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { deleteMedia } from "@/features/media/services/media.service";

export const DELETE = withApiHandler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const user = await requireCurrentUser();
  await deleteMedia(user, id);
  return apiSuccess({ deleted: true });
});
