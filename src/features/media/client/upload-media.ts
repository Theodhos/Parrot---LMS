import { upload } from "@vercel/blob/client";
import type { ApiResponse } from "@/lib/errors/api-response";
import type { MediaType } from "@/generated/prisma";

export interface UploadedMedia {
  id: string;
  fileName: string;
  fileUrl: string;
  type: MediaType;
  size: number;
  createdAt: Date;
}

/** "library": course material by staff. "community": a member's video for a community post. */
export type UploadScope = "library" | "community";

interface UploadConfig {
  driver: "blob" | "local";
  maxBytes: number;
  acceptedTypes: string[];
}

const configPromises = new Map<UploadScope, Promise<UploadConfig>>();

/** Where uploads go on this deployment and what this user may upload (asked once per page and scope). */
export function getUploadConfig(scope: UploadScope = "library"): Promise<UploadConfig> {
  let promise = configPromises.get(scope);
  if (!promise) {
    promise = fetch(`/api/media/upload?scope=${scope}`)
      .then((res) => res.json() as Promise<ApiResponse<UploadConfig>>)
      .then((json) => {
        if (!json.success) throw new Error(json.error.message);
        return json.data;
      })
      .catch((error) => {
        configPromises.delete(scope);
        throw error;
      });
    configPromises.set(scope, promise);
  }
  return promise;
}

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;
// Above this, Blob splits the file into parts uploaded in parallel and retried individually.
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;

/**
 * Uploads one file and returns its media record. On a deployment with Vercel
 * Blob the bytes go straight from the browser to Blob (so large videos
 * work); otherwise they go through the app onto local disk. Throws an Error
 * with a user-readable message on any failure.
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: (percentage: number) => void,
  scope: UploadScope = "library",
): Promise<UploadedMedia> {
  const config = await getUploadConfig(scope);

  if (!config.acceptedTypes.includes(file.type)) {
    throw new Error(`"${file.name}" is not a supported file type`);
  }
  if (file.size > config.maxBytes) {
    throw new Error(`"${file.name}" is larger than the ${formatMb(config.maxBytes)} limit`);
  }

  let res: Response;
  if (config.driver === "blob") {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/media/upload",
      clientPayload: scope,
      contentType: file.type,
      multipart: file.size > MULTIPART_THRESHOLD_BYTES,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage),
    });
    res = await fetch("/api/media/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: blob.url, fileName: file.name, size: file.size, contentType: file.type, scope }),
    });
  } else {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);
    res = await fetch("/api/media", { method: "POST", body: formData });
  }

  const json = (await res.json()) as ApiResponse<UploadedMedia>;
  if (!json.success) throw new Error(json.error.message);
  onProgress?.(100);
  return json.data;
}

/** Length of a video file in whole seconds, read from its metadata in the browser; 0 if unreadable. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const finish = (seconds: number) => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(0);
    video.src = objectUrl;
  });
}
