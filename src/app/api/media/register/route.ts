import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { MAX_BLOB_UPLOAD_SIZE_BYTES } from "@/lib/constants";
import { registerUploadedMedia } from "@/features/media/services/media.service";

const registerSchema = z.object({
  url: z.string().url().max(2000),
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().min(0).max(MAX_BLOB_UPLOAD_SIZE_BYTES),
  contentType: z.string().max(200),
  scope: z.enum(["library", "community"]).default("library"),
});

/** Adds a file the browser just uploaded to Vercel Blob to the media library. */
export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const { scope, ...input } = await parseJsonBody(registerSchema, req);
  const media = await registerUploadedMedia(user, input, scope);
  return apiSuccess(media, { status: 201 });
});
