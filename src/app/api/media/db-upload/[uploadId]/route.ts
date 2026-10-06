import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { completeDatabaseUpload } from "@/features/media/services/media.service";

/** Last step of an upload into the media database: every part is in, so record the file as media. */
export const POST = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ uploadId: string }> }) => {
  const { uploadId } = await ctx.params;
  const user = await requireCurrentUser();
  return apiSuccess(await completeDatabaseUpload(user, uploadId), { status: 201 });
});
