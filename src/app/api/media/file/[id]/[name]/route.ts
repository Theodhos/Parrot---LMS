import { apiError } from "@/lib/errors/handler";
import { NotFoundError } from "@/lib/errors/app-error";
import { requireCurrentUser } from "@/lib/auth/session";
import { openStoredFile } from "@/features/media/services/media-db";
import { serveStoredFile } from "@/features/media/services/serve-stored-file";

/**
 * Serves a file from the media database to signed-in users, whole or by
 * byte range (see serveStoredFile).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  try {
    await requireCurrentUser();
    const { id } = await ctx.params;
    const file = await openStoredFile(id);
    if (!file) throw new NotFoundError("File");

    return serveStoredFile(req, file, "private, max-age=31536000, immutable");
  } catch (error) {
    return apiError(error);
  }
}
