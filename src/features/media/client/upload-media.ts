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

interface UploadConfig {
  driver: "blob" | "local";
  maxBytes: number;
  acceptedTypes: string[];
}

let configPromise: Promise<UploadConfig> | null = null;

/** Where uploads go on this deployment and what is accepted (asked once per page). */
export function getUploadConfig(): Promise<UploadConfig> {
  configPromise ??= fetch("/api/media/upload")
    .then((res) => res.json() as Promise<ApiResponse<UploadConfig>>)
    .then((json) => {
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    })
    .catch((error) => {
      configPromise = null;
      throw error;
    });
  return configPromise;
}

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;
// Above this, Blob splits the file into parts uploaded in parallel and retried individually.
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;

/**
 * Uploads one file into the media library and returns its record. On a
 * deployment with Vercel Blob the bytes go straight from the browser to Blob
 * (so multi-gigabyte videos work); otherwise they go through the app onto
 * local disk. Throws an Error with a user-readable message on any failure.
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<UploadedMedia> {
  const config = await getUploadConfig();

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
      contentType: file.type,
      multipart: file.size > MULTIPART_THRESHOLD_BYTES,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage),
    });
    res = await fetch("/api/media/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: blob.url, fileName: file.name, size: file.size, contentType: file.type }),
    });
  } else {
    const formData = new FormData();
    formData.append("file", file);
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
