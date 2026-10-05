import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { requireCurrentUser } from "@/lib/auth/session";
import { assertStorageReady, isBlobStorageConfigured } from "@/features/media/services/storage";
import { assertMayUpload, parseUploadScope, uploadPolicy } from "@/features/media/services/upload-policy";

/**
 * Tells the uploader where files go on this deployment and what this user
 * may upload in the requested scope (`?scope=library|community`): straight
 * to Vercel Blob from the browser, or through POST /api/media onto local
 * disk when no Blob store is connected (local development).
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const scope = parseUploadScope(req.nextUrl.searchParams.get("scope"));
  assertMayUpload(await requireCurrentUser(), scope);
  // Fail here, before the member picks a file, rather than after they wait for an upload.
  assertStorageReady();

  const blob = isBlobStorageConfigured();
  return apiSuccess({ driver: blob ? ("blob" as const) : ("local" as const), ...uploadPolicy(scope, blob) });
});

/**
 * Token exchange for browser-to-Blob uploads (`upload()` from
 * @vercel/blob/client calls this; the scope travels as its clientPayload).
 * The file itself never passes through the app; this only decides who may
 * upload and what. The token is limited to the scope's types and size, and
 * every file gets a random suffix so its URL cannot be guessed from its name.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const scope = parseUploadScope(clientPayload);
        assertMayUpload(await requireCurrentUser(), scope);
        const policy = uploadPolicy(scope, true);
        return {
          allowedContentTypes: policy.acceptedTypes,
          maximumSizeInBytes: policy.maxBytes,
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
