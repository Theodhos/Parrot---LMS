import { Readable } from "node:stream";
import { apiError } from "@/lib/errors/handler";
import { NotFoundError } from "@/lib/errors/app-error";
import { requireCurrentUser } from "@/lib/auth/session";
import { openStoredFile } from "@/features/media/services/media-db";

/** A ranged request gets at most this much per response, so a video is fetched in steps as it plays. */
const MAX_RANGE_BYTES = 4 * 1024 * 1024;

/**
 * Serves a file from the media database to signed-in users. Supports byte
 * ranges (needed for video seeking). The stored type is sent with `nosniff`,
 * and only types the upload policy accepts can ever be stored, so a file
 * cannot be made to run as a page on this origin.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  try {
    await requireCurrentUser();
    const { id } = await ctx.params;
    const file = await openStoredFile(id);
    if (!file) throw new NotFoundError("File");

    const headers = new Headers({
      "Content-Type": file.contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
    if (!range || (range[1] === "" && range[2] === "")) {
      headers.set("Content-Length", String(file.size));
      return new Response(Readable.toWeb(Readable.from(file.read(0, file.size - 1))) as ReadableStream, { headers });
    }

    // "bytes=-500" is the last 500 bytes; "bytes=100-" runs from byte 100 on.
    let start = range[1] === "" ? Math.max(0, file.size - Number(range[2])) : Number(range[1]);
    let end = range[1] === "" || range[2] === "" ? file.size - 1 : Math.min(Number(range[2]), file.size - 1);
    if (start >= file.size || start > end) {
      headers.set("Content-Range", `bytes */${file.size}`);
      return new Response(null, { status: 416, headers });
    }
    start = Math.max(0, start);
    end = Math.min(end, start + MAX_RANGE_BYTES - 1);

    headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(Readable.from(file.read(start, end))) as ReadableStream, { status: 206, headers });
  } catch (error) {
    return apiError(error);
  }
}
