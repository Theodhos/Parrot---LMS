import "server-only";
import { Role } from "@/generated/prisma";
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_BLOB_UPLOAD_SIZE_BYTES,
  MAX_COMMUNITY_VIDEO_BYTES,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/constants";
import { ValidationError } from "@/lib/errors/app-error";
import { requireRole, requireUser, type SessionUser } from "@/lib/permissions";

/**
 * Who is uploading for what:
 *  - "library": course material, by an admin or instructor -- any accepted
 *    type, up to the storage's own limit.
 *  - "community": a member's video for a community post -- any signed-in
 *    user, video only, with a much smaller size limit.
 */
export type UploadScope = "library" | "community";

export function parseUploadScope(value: unknown): UploadScope {
  return value === "community" ? "community" : "library";
}

export interface UploadPolicy {
  acceptedTypes: string[];
  maxBytes: number;
}

export function uploadPolicy(scope: UploadScope, blobStorage: boolean): UploadPolicy {
  // Without Blob storage the file passes through the app server, which caps it.
  const storageLimit = blobStorage ? MAX_BLOB_UPLOAD_SIZE_BYTES : MAX_UPLOAD_SIZE_BYTES;
  if (scope === "community") {
    return { acceptedTypes: ACCEPTED_VIDEO_TYPES, maxBytes: Math.min(MAX_COMMUNITY_VIDEO_BYTES, storageLimit) };
  }
  return {
    acceptedTypes: [...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOCUMENT_TYPES],
    maxBytes: storageLimit,
  };
}

/** Throws unless this user may upload in this scope. */
export function assertMayUpload(user: SessionUser | null | undefined, scope: UploadScope): SessionUser {
  return scope === "community" ? requireUser(user) : requireRole(user, Role.ADMIN, Role.INSTRUCTOR);
}

/** Throws unless the file fits the scope's type and size rules. */
export function assertFileAllowed(file: { type: string; size: number }, policy: UploadPolicy): void {
  if (!policy.acceptedTypes.includes(file.type)) {
    throw new ValidationError("This file type is not supported");
  }
  if (file.size > policy.maxBytes) {
    throw new ValidationError(`File exceeds the ${Math.round(policy.maxBytes / (1024 * 1024))}MB limit`);
  }
}
