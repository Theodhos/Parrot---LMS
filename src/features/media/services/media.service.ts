import "server-only";
import { MediaType, Role } from "@/generated/prisma";
import { ACCEPTED_DOCUMENT_TYPES, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireRole, requireSelfOrAdmin, type SessionUser } from "@/lib/permissions";
import * as mediaRepo from "@/features/media/repositories/media.repository";
import * as mediaDb from "./media-db";
import { isBlobStorageConfigured, isBlobUrl, removeStoredFile } from "./storage";
import { assertFileAllowed, assertMayUpload, parseUploadScope, uploadPolicy, type UploadScope } from "./upload-policy";

function resolveMediaType(mimeType: string): MediaType {
  if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) return MediaType.IMAGE;
  if (ACCEPTED_DOCUMENT_TYPES.includes(mimeType)) return MediaType.DOCUMENT;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  return MediaType.OTHER;
}

function recordStoredFile(user: SessionUser, stored: mediaDb.StoredFileInfo) {
  return mediaRepo.createMedia({
    fileName: stored.fileName,
    fileUrl: stored.url,
    type: resolveMediaType(stored.contentType),
    size: stored.size,
    user: { connect: { id: user.id } },
  });
}

/** Stores a small file posted whole in one request into the media database. */
export async function uploadMedia(user: SessionUser, file: File, scope: UploadScope = "library") {
  assertMayUpload(user, scope);
  assertFileAllowed(file, uploadPolicy(scope, false));

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await mediaDb.saveBuffer(user.id, { fileName: file.name, contentType: file.type, scope }, buffer);
  return recordStoredFile(user, stored);
}

/**
 * Reserves an upload into the media database (see media-db.ts): this is
 * where the user's right to upload, and the file's type and size, are
 * checked. The parts that follow can only fill exactly what was approved.
 */
export async function beginDatabaseUpload(
  user: SessionUser,
  file: { fileName: string; contentType: string; size: number },
  scope: UploadScope = "library",
) {
  assertMayUpload(user, scope);
  assertFileAllowed({ type: file.contentType, size: file.size }, uploadPolicy(scope, false));
  return mediaDb.beginUpload(user.id, { ...file, scope });
}

/** Finishes an upload into the media database and records it as media. */
export async function completeDatabaseUpload(user: SessionUser, uploadId: string) {
  const stored = await mediaDb.completeUpload(user.id, uploadId);
  assertMayUpload(user, parseUploadScope(stored.scope));
  return recordStoredFile(user, stored);
}

/**
 * Records a file the browser already uploaded straight to Vercel Blob (see
 * /api/media/upload). Only a URL inside the Blob service is accepted, so this
 * cannot be used to register arbitrary external links as platform media.
 */
export async function registerUploadedMedia(
  user: SessionUser,
  input: { url: string; fileName: string; size: number; contentType: string },
  scope: UploadScope = "library",
) {
  assertMayUpload(user, scope);
  assertFileAllowed({ type: input.contentType, size: input.size }, uploadPolicy(scope, isBlobStorageConfigured()));
  if (!isBlobUrl(input.url)) {
    throw new ValidationError("Only files uploaded to the platform's storage can be registered");
  }

  return mediaRepo.createMedia({
    fileName: input.fileName,
    fileUrl: input.url,
    type: resolveMediaType(input.contentType),
    size: input.size,
    user: { connect: { id: user.id } },
  });
}

export function listMyMedia(user: SessionUser) {
  return mediaRepo.listMediaForUser(user.id);
}

export async function listAllMedia(admin: SessionUser, page: number, pageSize: number) {
  requireRole(admin, Role.ADMIN);
  const [total, items] = await mediaRepo.listAllMedia(page, pageSize);
  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function deleteMedia(user: SessionUser, id: string) {
  const media = await mediaRepo.findMediaById(id);
  if (!media) throw new NotFoundError("Media");
  requireSelfOrAdmin(user, media.userId);

  await removeStoredFile(media.fileUrl);
  await mediaRepo.deleteMedia(id);
}
