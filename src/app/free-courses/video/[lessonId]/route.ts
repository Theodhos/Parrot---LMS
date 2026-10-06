import { apiError } from "@/lib/errors/handler";
import { NotFoundError } from "@/lib/errors/app-error";
import { findFreeVideoFileId } from "@/features/courses/services/free-videos.service";
import { openStoredFile } from "@/features/media/services/media-db";
import { serveStoredFile } from "@/features/media/services/serve-stored-file";

/**
 * Streams the video of a free lesson to anyone, signed in or not -- the
 * public counterpart of /api/media/file, which is for members only. It is
 * addressed by lesson, never by file, and findFreeVideoFileId only resolves
 * a published video of a published free course: every other stored file
 * stays behind the sign-in.
 */
export async function GET(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await ctx.params;
    const fileId = await findFreeVideoFileId(lessonId);
    const file = fileId ? await openStoredFile(fileId) : null;
    if (!file) throw new NotFoundError("Video");

    return serveStoredFile(req, file, "public, max-age=3600");
  } catch (error) {
    return apiError(error);
  }
}
