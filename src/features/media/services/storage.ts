import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";
import { deleteStoredFile, STORED_FILE_PREFIX, storedFileIdOf } from "./media-db";

/**
 * Where uploads go. With a Vercel Blob store connected, the browser uploads
 * straight to Blob (see /api/media/upload). Otherwise -- the default, on
 * Vercel and in local development alike -- files are kept in the separate
 * media database (see media-db.ts), which needs no extra service.
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

/** Older uploads were written to this folder on the app server's own disk. */
const LEGACY_DISK_PREFIX = "/uploads/";

/**
 * A stored file is recorded by its path ("/api/media/file/<id>/<name>"),
 * while a lesson holds the same file's absolute URL. Returns the path for a
 * URL that points at the platform's own storage, and the input otherwise.
 */
export function storedPathOf(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith(STORED_FILE_PREFIX) || pathname.startsWith(LEGACY_DISK_PREFIX) ? pathname : url;
  } catch {
    return url;
  }
}

/** Deletes a stored file wherever it lives: the Blob store, the media database, or (older uploads) local disk. */
export async function removeStoredFile(url: string): Promise<void> {
  if (isBlobUrl(url)) {
    await del(url);
    return;
  }
  const id = storedFileIdOf(url);
  if (id) {
    await deleteStoredFile(id);
    return;
  }
  if (url.startsWith(LEGACY_DISK_PREFIX)) {
    await unlink(path.join(process.cwd(), "public", url)).catch(() => undefined);
  }
}
