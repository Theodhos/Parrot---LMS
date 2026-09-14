import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredFile {
  url: string;
  size: number;
}

export interface MediaStorage {
  save(fileName: string, buffer: Buffer): Promise<StoredFile>;
  remove(url: string): Promise<void>;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Local-disk storage adapter used for development and single-instance
 * deployments. Swap this out (S3, Vercel Blob, GCS, ...) by implementing
 * MediaStorage and changing the export below — nothing else in the media
 * feature needs to change.
 */
class LocalDiskStorage implements MediaStorage {
  async save(fileName: string, buffer: Buffer): Promise<StoredFile> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const storedName = `${randomUUID()}-${safeName}`;
    await writeFile(path.join(UPLOAD_DIR, storedName), buffer);
    return { url: `/uploads/${storedName}`, size: buffer.byteLength };
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    const filePath = path.join(process.cwd(), "public", url);
    await unlink(filePath).catch(() => undefined);
  }
}

export const mediaStorage: MediaStorage = new LocalDiskStorage();
