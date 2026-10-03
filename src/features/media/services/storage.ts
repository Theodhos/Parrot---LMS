import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

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

/**
 * Whether a Vercel Blob store is connected to this deployment. When it is,
 * the browser uploads straight to Blob (see /api/media/upload) -- the only
 * way to store files on Vercel, where the local disk is read-only and a
 * request body tops out at 4.5 MB. Without it (local development), uploads
 * fall back to the local-disk adapter above.
 */
export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Vercel Blob serves every store from a subdomain of this host. */
export function isBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Deletes a stored file wherever it lives: a Blob URL from the Blob store, anything else from local disk. */
export async function removeStoredFile(url: string): Promise<void> {
  if (isBlobUrl(url)) {
    await del(url);
    return;
  }
  await mediaStorage.remove(url);
}
