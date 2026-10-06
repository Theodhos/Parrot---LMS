import "server-only";
import { prisma } from "@/lib/db/client";
import { removeStoredFile, storedPathOf } from "./storage";

/**
 * Deletes the uploaded files behind lesson videos that were just removed
 * (with their lesson, module or course). There is no media library to clean
 * them up by hand, so without this every deleted video would stay in storage
 * -- and be billed -- forever. Call it AFTER the content is gone: a file still
 * used by a surviving lesson is kept. Only files the platform itself stores
 * (they have a Media row) are touched; a YouTube link or any other external
 * URL is ignored. Never throws -- failing to free storage must not turn a
 * successful delete into an error.
 */
export async function removeUploadedMediaFor(videoUrls: (string | null | undefined)[]): Promise<void> {
  const urls = videoUrls.filter((url): url is string => Boolean(url));
  if (urls.length === 0) return;

  try {
    // A file in the platform's own storage is recorded by its path while the lesson holds its absolute URL.
    const candidates = new Set<string>();
    for (const url of urls) {
      candidates.add(url);
      candidates.add(storedPathOf(url));
    }

    const media = await prisma.media.findMany({ where: { fileUrl: { in: [...candidates] } } });
    for (const file of media) {
      const stillUsed = await prisma.lesson.count({ where: { videoUrl: { endsWith: file.fileUrl } } });
      if (stillUsed > 0) continue;
      await removeStoredFile(file.fileUrl);
      await prisma.media.delete({ where: { id: file.id } });
    }
  } catch (error) {
    console.error(`[media] could not remove uploaded files: ${error instanceof Error ? error.message : error}`);
  }
}
