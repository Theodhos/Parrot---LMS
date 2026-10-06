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

/** "library": course material by staff. "community": a member's photo or video for a community post. */
export type UploadScope = "library" | "community";

export interface UploadConfig {
  driver: "blob" | "database";
  maxBytes: number;
  /** A tighter limit for images, where the scope has one. */
  maxImageBytes?: number;
  acceptedTypes: string[];
}

/** The size limit that applies to this particular file. */
export function maxBytesFor(file: { type: string }, config: UploadConfig): number {
  return config.maxImageBytes !== undefined && file.type.startsWith("image/") ? config.maxImageBytes : config.maxBytes;
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
 * work); otherwise they are sent in parts into the media database. Throws an
 * Error with a user-readable message on any failure.
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
  if (file.size > maxBytesFor(file, config)) {
    throw new Error(`"${file.name}" is larger than the ${formatMb(maxBytesFor(file, config))} limit`);
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
    res = await uploadInParts(file, scope, onProgress);
  }

  const media = await readApiResponse<UploadedMedia>(res);
  onProgress?.(100);
  return media;
}

/** The API's { success, data | error } body; anything else (a proxy's error page) becomes a readable error. */
async function readApiResponse<T>(res: Response): Promise<T> {
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`The upload failed (error ${res.status}). Please try again.`);
  }
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

const PART_ATTEMPTS = 3;

/**
 * Sends a file to the media database: reserve it, PUT it in fixed-size
 * parts (a single request body is capped at a few MB on serverless hosts),
 * then complete it. A part that fails is retried before giving up. Returns
 * the completing response, whose body is the media record.
 */
async function uploadInParts(file: File, scope: UploadScope, onProgress?: (percentage: number) => void): Promise<Response> {
  const begin = await fetch("/api/media/db-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, size: file.size, contentType: file.type, scope }),
  });
  const { uploadId, chunkSize, chunkCount } = await readApiResponse<{
    uploadId: string;
    chunkSize: number;
    chunkCount: number;
  }>(begin);

  for (let index = 0; index < chunkCount; index++) {
    const part = file.slice(index * chunkSize, (index + 1) * chunkSize);
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(`/api/media/db-upload/${uploadId}/${index}`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: part,
        });
        await readApiResponse(res);
        break;
      } catch (error) {
        if (attempt >= PART_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
    // The last percent is kept for the completing request.
    onProgress?.(Math.min(99, ((index + 1) / chunkCount) * 100));
  }

  return fetch(`/api/media/db-upload/${uploadId}`, { method: "POST" });
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
