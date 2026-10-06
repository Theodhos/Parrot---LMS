import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { ValidationError } from "@/lib/errors/app-error";
import { requireCurrentUser } from "@/lib/auth/session";
import { MEDIA_CHUNK_BYTES, writeChunk } from "@/features/media/services/media-db";

/** One part of a reserved upload, sent as the raw request body. */
export const PUT = withApiHandler(
  async (req: NextRequest, ctx: { params: Promise<{ uploadId: string; index: string }> }) => {
    const { uploadId, index } = await ctx.params;
    const user = await requireCurrentUser();
    if (Number(req.headers.get("content-length") ?? 0) > MEDIA_CHUNK_BYTES) {
      throw new ValidationError("This file part is too large");
    }
    const bytes = new Uint8Array(await req.arrayBuffer());
    await writeChunk(user.id, uploadId, Number(index), bytes);
    return apiSuccess({ stored: true });
  },
);
