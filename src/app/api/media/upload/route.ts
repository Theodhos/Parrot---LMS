import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_BLOB_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/constants";
import { isBlobStorageConfigured } from "@/features/media/services/storage";

const ACCEPTED_TYPES = [...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOCUMENT_TYPES];

/**
 * Tells the uploader where files go on this deployment: straight to Vercel
 * Blob from the browser (large course videos), or through POST /api/media
 * onto local disk when no Blob store is connected (local development).
 */
export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);

  const blob = isBlobStorageConfigured();
  return apiSuccess({
    driver: blob ? ("blob" as const) : ("local" as const),
    maxBytes: blob ? MAX_BLOB_UPLOAD_SIZE_BYTES : MAX_UPLOAD_SIZE_BYTES,
    acceptedTypes: ACCEPTED_TYPES,
  });
});

/**
 * Token exchange for browser-to-Blob uploads (`upload()` from
 * @vercel/blob/client calls this). The file itself never passes through the
 * app; this only decides who may upload and what. Only admins and
 * instructors get a token, limited to the accepted types and size, and every
 * file gets a random suffix so its URL cannot be guessed from its name.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await requireCurrentUser();
        requireRole(user, Role.ADMIN, Role.INSTRUCTOR);
        return {
          allowedContentTypes: ACCEPTED_TYPES,
          maximumSizeInBytes: MAX_BLOB_UPLOAD_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 400;
    const message = error instanceof Error ? error.message : "Upload could not be authorized";
    return NextResponse.json({ error: message }, { status });
  }
}
