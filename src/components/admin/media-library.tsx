"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { FileIcon, FileText, ImageIcon, Trash2, Upload, Video } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaType } from "@/generated/prisma";
import { cn, formatDate } from "@/lib/utils";
import { uploadMediaFile } from "@/features/media/client/upload-media";
import type { ApiResponse } from "@/lib/errors/api-response";

const TYPE_ICON: Record<MediaType, typeof FileIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
  OTHER: FileIcon,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export interface MediaItem {
  id: string;
  fileName: string;
  fileUrl: string;
  type: MediaType;
  size: number;
  createdAt: Date;
  user: { name: string; email: string };
}

export interface MediaLibraryProps {
  initialItems: MediaItem[];
}

export function MediaLibrary({ initialItems }: MediaLibraryProps) {
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        setProgressLabel(`${file.name} (0%)`);
        const media = await uploadMediaFile(file, (pct) => setProgressLabel(`${file.name} (${Math.round(pct)}%)`));
        // The upload response carries no uploader; it is always the current user.
        setItems((prev) => [{ ...media, user: { name: "You", email: "" } }, ...prev]);
        uploaded += 1;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.");
      }
    }
    if (uploaded > 0) toast.success(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`);
    setUploading(false);
    setProgressLabel(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(Array.from(event.dataTransfer.files));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    const json = (await res.json()) as ApiResponse<{ deleted: boolean }>;
    if (json.success) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("File deleted.");
    } else {
      toast.error(json.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-4 transition-colors",
          dragging && "border-emerald-500 bg-emerald-500/10",
        )}
      >
        <div>
          <p className="text-sm font-medium">Upload media</p>
          <p className="text-muted-foreground text-xs">
            {progressLabel ?? "Drag and drop images, videos and documents here, or use the button."}
          </p>
        </div>
        <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload />
          {uploading ? "Uploading..." : "Upload files"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {items.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          No media uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => {
            const Icon = TYPE_ICON[m.type];
            return (
              <Card key={m.id} className="gap-0 overflow-hidden py-0">
                <div className="bg-muted flex aspect-video items-center justify-center">
                  {m.type === MediaType.IMAGE ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded media URL
                    <img src={m.fileUrl} alt={m.fileName} className="size-full object-cover" />
                  ) : (
                    <Icon className="text-muted-foreground size-8" />
                  )}
                </div>
                <CardContent className="flex flex-col gap-1.5 p-3">
                  <p className="truncate text-sm font-medium" title={m.fileName}>
                    {m.fileName}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{m.type}</Badge>
                    <span className="text-muted-foreground text-xs">{formatBytes(m.size)}</span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.user.name} · {formatDate(m.createdAt)}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="mt-1 w-full" />}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{m.fileName}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the file permanently, including from any lessons that reference
                          it. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDelete(m.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
