import "server-only";
import { Binary, GridFSBucket, MongoClient, ObjectId, type Db } from "mongodb";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors/app-error";

/**
 * Uploaded files (photos, videos, documents) live in their own MongoDB
 * database, apart from the application data: by default a database called
 * "parrot_media" on the same cluster as DATABASE_URL. Point
 * MEDIA_DATABASE_URL at another cluster, or set MEDIA_DATABASE_NAME, to move
 * it. Files are stored in the standard GridFS layout (`files.files` +
 * `files.chunks`), so any MongoDB tool can read them.
 *
 * A file arrives in pieces: a serverless request body is capped at a few MB
 * (4.5 MB on Vercel), far less than a video. The browser therefore sends
 * fixed-size chunks, each stored directly as one GridFS chunk, and the file
 * only becomes readable once every chunk is in and the upload is completed.
 */
export const MEDIA_CHUNK_BYTES = 3 * 1024 * 1024;

export const STORED_FILE_PREFIX = "/api/media/file/";

const BUCKET = "files";
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

const globalForMedia = globalThis as { __mediaClient?: Promise<MongoClient>; __mediaIndexes?: Promise<unknown> };

async function mediaDb(): Promise<Db> {
  const url = process.env.MEDIA_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("MEDIA_DATABASE_URL or DATABASE_URL must be set to store uploads");
  if (!globalForMedia.__mediaClient) {
    const connecting = new MongoClient(url).connect();
    // A failed connection must not be remembered, or every later upload would fail too.
    connecting.catch(() => {
      if (globalForMedia.__mediaClient === connecting) globalForMedia.__mediaClient = undefined;
    });
    globalForMedia.__mediaClient = connecting;
  }
  const client = await globalForMedia.__mediaClient;
  const db = client.db(process.env.MEDIA_DATABASE_NAME || "parrot_media");
  globalForMedia.__mediaIndexes ??= db
    .collection(`${BUCKET}.chunks`)
    .createIndex({ files_id: 1, n: 1 }, { unique: true })
    .catch(() => {
      globalForMedia.__mediaIndexes = undefined;
    });
  await globalForMedia.__mediaIndexes;
  return db;
}

interface PendingUpload {
  _id: ObjectId;
  userId: string;
  scope: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

interface StoredFileDoc {
  _id: ObjectId;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  filename: string;
  metadata?: { contentType?: string; userId?: string };
}

export interface StoredFileInfo {
  url: string;
  size: number;
  fileName: string;
  contentType: string;
  scope: string;
}

const chunkCountFor = (size: number) => Math.ceil(size / MEDIA_CHUNK_BYTES);

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new NotFoundError("File");
  return new ObjectId(id);
}

function urlFor(id: ObjectId, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80) || "file";
  return `${STORED_FILE_PREFIX}${id.toHexString()}/${safeName}`;
}

/** The id inside a stored file's URL (relative or absolute), or null for any other URL. */
export function storedFileIdOf(url: string): string | null {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // Already a path.
  }
  if (!pathname.startsWith(STORED_FILE_PREFIX)) return null;
  const id = pathname.slice(STORED_FILE_PREFIX.length).split("/")[0] ?? "";
  return ObjectId.isValid(id) ? id : null;
}

/** Drops uploads that were started more than a day ago and never finished. */
async function removeStaleUploads(db: Db): Promise<void> {
  const stale = await db
    .collection<PendingUpload>("uploads")
    .find({ createdAt: { $lt: new Date(Date.now() - STALE_UPLOAD_MS) } })
    .limit(5)
    .toArray();
  for (const upload of stale) {
    await db.collection(`${BUCKET}.chunks`).deleteMany({ files_id: upload._id });
    await db.collection("uploads").deleteOne({ _id: upload._id });
  }
}

/** Reserves an upload for this user; the caller has already checked the file against the upload policy. */
export async function beginUpload(
  userId: string,
  file: { fileName: string; contentType: string; size: number; scope: string },
): Promise<{ uploadId: string; chunkSize: number; chunkCount: number }> {
  if (file.size <= 0) throw new ValidationError("This file is empty");
  const db = await mediaDb();
  await removeStaleUploads(db).catch(() => undefined);
  const _id = new ObjectId();
  await db.collection<PendingUpload>("uploads").insertOne({ _id, userId, ...file, createdAt: new Date() });
  return { uploadId: _id.toHexString(), chunkSize: MEDIA_CHUNK_BYTES, chunkCount: chunkCountFor(file.size) };
}

async function pendingUploadFor(db: Db, userId: string, uploadId: string): Promise<PendingUpload> {
  const upload = await db.collection<PendingUpload>("uploads").findOne({ _id: toObjectId(uploadId) });
  if (!upload) throw new NotFoundError("Upload");
  if (upload.userId !== userId) throw new ForbiddenError();
  return upload;
}

/**
 * Stores one piece of a reserved upload. Every piece must be exactly the
 * size the declared file size implies, so an upload can never grow past what
 * was approved. Sending the same piece twice (a retry) just replaces it.
 */
export async function writeChunk(userId: string, uploadId: string, index: number, bytes: Uint8Array): Promise<void> {
  const db = await mediaDb();
  const upload = await pendingUploadFor(db, userId, uploadId);
  const count = chunkCountFor(upload.size);
  if (!Number.isInteger(index) || index < 0 || index >= count) throw new ValidationError("Unexpected file part");
  const expected = index < count - 1 ? MEDIA_CHUNK_BYTES : upload.size - MEDIA_CHUNK_BYTES * (count - 1);
  if (bytes.byteLength !== expected) throw new ValidationError("A file part arrived incomplete. Please try again.");
  await db
    .collection(`${BUCKET}.chunks`)
    .replaceOne({ files_id: upload._id, n: index }, { files_id: upload._id, n: index, data: new Binary(bytes) }, { upsert: true });
}

/** Turns a fully uploaded set of pieces into a readable file. */
export async function completeUpload(userId: string, uploadId: string): Promise<StoredFileInfo> {
  const db = await mediaDb();
  const upload = await pendingUploadFor(db, userId, uploadId);
  const stored = await db.collection(`${BUCKET}.chunks`).countDocuments({ files_id: upload._id });
  if (stored !== chunkCountFor(upload.size)) {
    throw new ValidationError("The upload did not finish. Please try again.");
  }
  await db.collection<StoredFileDoc>(`${BUCKET}.files`).insertOne({
    _id: upload._id,
    length: upload.size,
    chunkSize: MEDIA_CHUNK_BYTES,
    uploadDate: new Date(),
    filename: upload.fileName,
    metadata: { contentType: upload.contentType, userId },
  });
  await db.collection("uploads").deleteOne({ _id: upload._id });
  return {
    url: urlFor(upload._id, upload.fileName),
    size: upload.size,
    fileName: upload.fileName,
    contentType: upload.contentType,
    scope: upload.scope,
  };
}

/** Stores a whole file that is already in memory (a small upload posted in one request). */
export async function saveBuffer(
  userId: string,
  file: { fileName: string; contentType: string; scope: string },
  buffer: Buffer,
): Promise<StoredFileInfo> {
  const { uploadId, chunkCount } = await beginUpload(userId, { ...file, size: buffer.byteLength });
  for (let index = 0; index < chunkCount; index++) {
    await writeChunk(userId, uploadId, index, buffer.subarray(index * MEDIA_CHUNK_BYTES, (index + 1) * MEDIA_CHUNK_BYTES));
  }
  return completeUpload(userId, uploadId);
}

export interface StoredFile {
  size: number;
  contentType: string;
  fileName: string;
  /** Bytes `start` to `end`, both inclusive. */
  read(start: number, end: number): NodeJS.ReadableStream;
}

export async function openStoredFile(id: string): Promise<StoredFile | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await mediaDb();
  const _id = new ObjectId(id);
  const doc = await db.collection<StoredFileDoc>(`${BUCKET}.files`).findOne({ _id });
  if (!doc) return null;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  return {
    size: doc.length,
    contentType: doc.metadata?.contentType || "application/octet-stream",
    fileName: doc.filename,
    read: (start, end) => bucket.openDownloadStream(_id, { start, end: end + 1 }),
  };
}

/** Removes a stored file and its chunks; a file that is already gone is not an error. */
export async function deleteStoredFile(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const db = await mediaDb();
  const _id = new ObjectId(id);
  await db.collection(`${BUCKET}.chunks`).deleteMany({ files_id: _id });
  await db.collection(`${BUCKET}.files`).deleteOne({ _id });
}
