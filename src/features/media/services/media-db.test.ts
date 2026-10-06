// @vitest-environment node
import { createHash, randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import {
  beginUpload,
  completeUpload,
  deleteStoredFile,
  MEDIA_CHUNK_BYTES,
  openStoredFile,
  saveBuffer,
  storedFileIdOf,
  writeChunk,
} from "./media-db";

const sha = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(Buffer.from(part as Uint8Array));
  return Buffer.concat(parts);
}

describe("media database storage", () => {
  const userId = `media-test-${Date.now()}`;
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) await deleteStoredFile(id);
  });

  it("stores a file sent in parts and reads it back whole and by range", async () => {
    // Two full parts and a short last one.
    const data = randomBytes(MEDIA_CHUNK_BYTES * 2 + 12345);
    const { uploadId, chunkCount } = await beginUpload(userId, {
      fileName: "clip one.mp4",
      contentType: "video/mp4",
      size: data.byteLength,
      scope: "community",
    });
    createdIds.push(uploadId);
    expect(chunkCount).toBe(3);

    // Not readable, and not completable, until every part is in.
    await writeChunk(userId, uploadId, 0, data.subarray(0, MEDIA_CHUNK_BYTES));
    expect(await openStoredFile(uploadId)).toBeNull();
    await expect(completeUpload(userId, uploadId)).rejects.toBeInstanceOf(ValidationError);

    // A part of the wrong size, or from someone else, is refused.
    await expect(writeChunk(userId, uploadId, 1, data.subarray(0, 10))).rejects.toBeInstanceOf(ValidationError);
    await expect(writeChunk(userId, uploadId, 3, data.subarray(0, 10))).rejects.toBeInstanceOf(ValidationError);
    await expect(
      writeChunk("someone-else", uploadId, 1, data.subarray(MEDIA_CHUNK_BYTES, MEDIA_CHUNK_BYTES * 2)),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Out of order, with one part sent twice (a retry).
    await writeChunk(userId, uploadId, 2, data.subarray(MEDIA_CHUNK_BYTES * 2));
    await writeChunk(userId, uploadId, 1, data.subarray(MEDIA_CHUNK_BYTES, MEDIA_CHUNK_BYTES * 2));
    await writeChunk(userId, uploadId, 1, data.subarray(MEDIA_CHUNK_BYTES, MEDIA_CHUNK_BYTES * 2));

    const stored = await completeUpload(userId, uploadId);
    expect(stored.size).toBe(data.byteLength);
    expect(stored.url).toBe(`/api/media/file/${uploadId}/clip_one.mp4`);
    expect(storedFileIdOf(stored.url)).toBe(uploadId);
    expect(storedFileIdOf(`https://example.com${stored.url}`)).toBe(uploadId);
    expect(storedFileIdOf("https://www.youtube.com/watch?v=abc")).toBeNull();

    const file = await openStoredFile(uploadId);
    expect(file).toMatchObject({ size: data.byteLength, contentType: "video/mp4", fileName: "clip one.mp4" });
    expect(sha(await readAll(file!.read(0, data.byteLength - 1)))).toBe(sha(data));

    // A range that crosses a part boundary, ends inclusive.
    const start = MEDIA_CHUNK_BYTES - 5;
    const end = MEDIA_CHUNK_BYTES + 20;
    expect((await readAll(file!.read(start, end))).equals(data.subarray(start, end + 1))).toBe(true);

    // A finished upload cannot be written to or completed again.
    await expect(writeChunk(userId, uploadId, 0, data.subarray(0, MEDIA_CHUNK_BYTES))).rejects.toThrow();
    await expect(completeUpload(userId, uploadId)).rejects.toThrow();
  }, 120_000);

  it("stores a small in-memory file and deletes it", async () => {
    const data = randomBytes(2048);
    const stored = await saveBuffer(userId, { fileName: "photo.png", contentType: "image/png", scope: "community" }, data);
    const id = storedFileIdOf(stored.url)!;
    createdIds.push(id);

    const file = await openStoredFile(id);
    expect((await readAll(file!.read(0, 2047))).equals(data)).toBe(true);

    await deleteStoredFile(id);
    expect(await openStoredFile(id)).toBeNull();
    // Deleting again is not an error.
    await deleteStoredFile(id);
  }, 60_000);

  it("refuses an empty file", async () => {
    await expect(
      beginUpload(userId, { fileName: "empty.png", contentType: "image/png", size: 0, scope: "community" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
