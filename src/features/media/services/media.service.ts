import "server-only";
import { MediaType, Role } from "@/generated/prisma";
import { ACCEPTED_DOCUMENT_TYPES, ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireRole, requireSelfOrAdmin, type SessionUser } from "@/lib/permissions";
import * as mediaRepo from "@/features/media/repositories/media.repository";
import { mediaStorage } from "./storage";

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

  await mediaStorage.remove(media.fileUrl);
  await mediaRepo.deleteMedia(id);
}
