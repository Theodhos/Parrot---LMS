"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { createLessonAction, type LessonRecord } from "@/features/lessons/actions/lesson.actions";
import { readVideoDuration, uploadMediaFile } from "@/features/media/client/upload-media";
import { LessonType } from "@/generated/prisma";

interface QueueItem {
  key: string;
  name: string;
  status: "waiting" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
}

/** "01_intro-to-parrots.mp4" -> "01 intro to parrots" (a lesson title needs at least 2 characters). */
function lessonTitleFromFileName(fileName: string): string {
  const title = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return title.length >= 2 ? title : "Untitled lesson";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface LessonDropZoneProps {
  courseId: string;
  moduleId: string;
  onLessonCreated: (lesson: LessonRecord) => void;
}

/**
 * Bulk lesson creation: drop (or pick) several files and each one becomes a
 * lesson in this module, in the order dropped. A video becomes a VIDEO lesson
 * playing the uploaded file; anything else becomes a DOCUMENT lesson linking
 * to it. Files are processed one at a time so the lesson order is the drop
 * order and one failure does not stop the rest.
 */
export function LessonDropZone({ courseId, moduleId, onLessonCreated }: LessonDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const patch = (key: string, changes: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  async function processFiles(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    // Natural order so "2.mp4" comes before "10.mp4" regardless of how the OS handed them over.
    const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const items = ordered.map((file, index) => ({
      key: `${Date.now()}-${index}`,
      name: file.name,
      status: "waiting" as const,
      progress: 0,
    }));
    setQueue(items);

    let created = 0;
    for (const [index, file] of ordered.entries()) {
      const key = items[index]!.key;
      try {
        patch(key, { status: "uploading" });
        const isVideo = file.type.startsWith("video/");
        const [media, duration] = await Promise.all([
          uploadMediaFile(file, (progress) => patch(key, { progress })),
          isVideo ? readVideoDuration(file) : Promise.resolve(0),
        ]);
        const fileUrl = new URL(media.fileUrl, window.location.origin).toString();

        patch(key, { status: "saving", progress: 100 });
        const result = await createLessonAction(courseId, moduleId, {
          title: lessonTitleFromFileName(file.name),
          type: isVideo ? LessonType.VIDEO : LessonType.DOCUMENT,
          duration,
          published: publish,
          ...(isVideo
            ? { videoUrl: fileUrl }
            : {
                content: `<p><a href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a></p>`,
              }),
        });
        if (!result.success || !result.lesson) {
          throw new Error(result.error ?? "The lesson could not be created");
        }
        onLessonCreated(result.lesson);
        patch(key, { status: "done" });
        created += 1;
      } catch (error) {
        patch(key, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
      }
    }

    setBusy(false);
    if (created > 0) toast.success(`${created} lesson${created === 1 ? "" : "s"} added.`);
    if (created < ordered.length) toast.error(`${ordered.length - created} file(s) could not be added.`);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void processFiles(Array.from(event.dataTransfer.files));
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "text-muted-foreground flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-5 text-center text-xs transition-colors",
          dragging && "border-emerald-500 bg-emerald-500/10 text-foreground",
          busy && "cursor-progress opacity-70",
        )}
      >
        <UploadCloud className="size-5" />
        <p className="text-foreground text-sm font-medium">
          {busy ? "Uploading..." : "Drop videos or files here, or click to choose"}
        </p>
        <p>Each file becomes a lesson, named after the file and added in file-name order.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void processFiles(Array.from(e.target.files ?? []))}
      />

      <label className="flex items-center gap-2 text-xs">
        <Switch size="sm" checked={publish} onCheckedChange={setPublish} disabled={busy} />
        <span className="text-muted-foreground">Publish the new lessons right away</span>
      </label>

      {queue.length > 0 && (
        <ul className="flex flex-col gap-1">
          {queue.map((item) => (
            <li key={item.key} className="bg-muted/40 flex items-center gap-2 rounded-md px-2 py-1 text-xs">
              {item.status === "done" ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              ) : item.status === "error" ? (
                <XCircle className="text-destructive size-3.5 shrink-0" />
              ) : (
                <Loader2 className={cn("size-3.5 shrink-0", item.status !== "waiting" && "animate-spin")} />
              )}
              <span className="flex-1 truncate" title={item.name}>
                {item.name}
              </span>
              <span className={cn("shrink-0", item.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                {item.status === "waiting" && "Waiting"}
                {item.status === "uploading" && `${Math.round(item.progress)}%`}
                {item.status === "saving" && "Creating lesson"}
                {item.status === "done" && "Added"}
                {item.status === "error" && item.error}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
