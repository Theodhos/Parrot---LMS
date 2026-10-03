import "server-only";
import { MediaType, Role } from "@/generated/prisma";
import { ACCEPTED_DOCUMENT_TYPES, ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireRole, requireSelfOrAdmin, type SessionUser } from "@/lib/permissions";
import * as mediaRepo from "@/features/media/repositories/media.repository";
import { isBlobUrl, mediaStorage, removeStoredFile } from "./storage";

function resolveMediaType(mimeType: string): MediaType {
  if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) return MediaType.IMAGE;
  if (ACCEPTED_DOCUMENT_TYPES.includes(mimeType)) return MediaType.DOCUMENT;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  return MediaType.OTHER;
}

export async function uploadMedia(user: SessionUser, file: File) {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new ValidationError(`File exceeds the ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB limit`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await mediaStorage.save(file.name, buffer);

  return mediaRepo.createMedia({
    fileName: file.name,
    fileUrl: stored.url,
    type: resolveMediaType(file.type),
    size: stored.size,
    user: { connect: { id: user.id } },
  });
}

/**
 * Records a file the browser already uploaded straight to Vercel Blob (see
 * /api/media/upload). Only a URL inside the Blob service is accepted, so this
 * cannot be used to register arbitrary external links as platform media.
 */
export async function registerUploadedMedia(
  user: SessionUser,
  input: { url: string; fileName: string; size: number; contentType: string },
) {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);
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
