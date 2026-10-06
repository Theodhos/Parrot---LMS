import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { beginDatabaseUpload } from "@/features/media/services/media.service";

const beginSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().min(1),
  contentType: z.string().min(1).max(200),
  scope: z.enum(["library", "community"]).default("library"),
});

/**
 * Step 1 of an upload into the media database: checks that this user may
 * upload this file, and reserves it. The browser then PUTs the file in parts
 * to ./[uploadId]/[index] and finishes with POST ./[uploadId].
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const { scope, ...file } = await parseJsonBody(beginSchema, req);
  return apiSuccess(await beginDatabaseUpload(user, file, scope), { status: 201 });
});
