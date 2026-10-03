"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileUp, UploadCloud } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  COURSE_IMPORT_CSV_TEMPLATE,
  parseCourseImportFile,
  type ImportCourse,
} from "@/features/courses/import/course-import";
import { importCoursesAction } from "@/features/courses/actions/course-import.actions";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([COURSE_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "courses-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const lessonCount = (course: ImportCourse) => course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

/** "Import courses" button + dialog: drop a .csv or .json file, review what it contains, create it all at once. */
export function CourseImportDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [courses, setCourses] = useState<ImportCourse[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, startImport] = useTransition();

  function reset() {
    setFileName(null);
    setCourses([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setCourses([]);
      setErrors(["The file is larger than 5 MB. Split it into smaller files."]);
      return;
    }
    const result = parseCourseImportFile(await file.text(), file.name);
    setCourses(result.courses);
    setErrors(result.errors);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  function handleImport() {
    startImport(async () => {
      const result = await importCoursesAction(courses);
      const imported = result.outcome?.imported ?? [];
      if (imported.length > 0) {
        toast.success(`${imported.length} course${imported.length === 1 ? "" : "s"} imported as drafts.`);
        router.refresh();
      }
      if (result.success) {
        setOpen(false);
        reset();
        return;
      }
      const failure = result.outcome?.failedAt;
      setCourses([]);
      setErrors(
        failure
          ? [`Stopped at course "${failure.courseTitle}": ${failure.message}. The ${imported.length} before it were imported.`]
          : (result.errors ?? ["The import failed."]),
      );
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp />
        Import courses
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (importing) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="w-full max-w-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import courses from a file</DialogTitle>
            <DialogDescription>
              Drop a CSV (Excel) or JSON file listing courses with their modules and lessons. They are created
              as drafts, so nothing is visible to students until you publish each course.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes("Files")) return;
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "text-muted-foreground flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-8 text-center text-xs transition-colors",
                dragging && "border-emerald-500 bg-emerald-500/10 text-foreground",
              )}
            >
              <UploadCloud className="size-6" />
              <p className="text-foreground text-sm font-medium">
                {fileName ?? "Drop a .csv or .json file here, or click to choose"}
              </p>
              <p>One row per lesson. Rows with the same course and module names are grouped together.</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={downloadTemplate}
              className="text-muted-foreground flex items-center gap-1.5 self-start text-xs underline underline-offset-4"
            >
              <Download className="size-3.5" />
              Download a CSV template to fill in
            </button>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {courses.length > 0 && (
              <ScrollArea className="max-h-56 rounded-lg border">
                <ul className="divide-y text-sm">
                  {courses.map((course) => (
                    <li key={course.title} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="truncate font-medium">{course.title}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {lessonCount(course)}{" "}
                        lesson{lessonCount(course) === 1 ? "" : "s"} · {course.price > 0 ? `$${course.price}` : "Free"}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={importing} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={importing || courses.length === 0} onClick={handleImport}>
                {importing
                  ? "Importing..."
                  : courses.length === 0
                    ? "Import"
                    : `Import ${courses.length} course${courses.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
