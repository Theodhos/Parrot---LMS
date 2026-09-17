"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { QuizBuilder } from "@/components/admin/quiz-builder";
import {
  deleteLessonAction,
  getLessonForManageAction,
  updateLessonAction,
  type LessonRecord,
} from "@/features/lessons/actions/lesson.actions";
import { getQuizForLessonAction, type QuizRecord } from "@/features/quizzes/actions/manage-quiz.actions";
import { LessonType } from "@/generated/prisma";

const LESSON_TYPE_OPTIONS: { value: LessonType; label: string }[] = [
  { value: LessonType.ARTICLE, label: "Article" },
  { value: LessonType.VIDEO, label: "Video" },
  { value: LessonType.QUIZ, label: "Quiz" },
  { value: LessonType.DOCUMENT, label: "Document" },
];

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface LessonEditorDialogProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  onClose: () => void;
  onLessonSaved: (lesson: LessonRecord) => void;
  onQuizSaved: () => void;
  onDeleted: (lessonId: string) => void;
}

/** Edit-only dialog for an existing lesson -- creation happens inline in the module row. */
export function LessonEditorDialog({
  courseId,
  moduleId,
  lessonId,
  onClose,
  onLessonSaved,
  onQuizSaved,
  onDeleted,
}: LessonEditorDialogProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [type, setType] = useState<LessonType>(LessonType.ARTICLE);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await getLessonForManageAction(courseId, moduleId, lessonId);
      if (!result.success || !result.lesson) {
        setLoadError(result.error ?? "Failed to load lesson.");
        setLoading(false);
        return;
      }
      const lesson = result.lesson;
      setTitle(lesson.title);
      setDescription(lesson.description ?? "");
      setContent(lesson.content ?? "");
      setVideoUrl(lesson.videoUrl ?? "");
      setDuration(lesson.duration ?? 0);
      setType(lesson.type);
      setPublished(lesson.published);

      if (lesson.type === LessonType.QUIZ) {
        const quizResult = await getQuizForLessonAction(lessonId);
        if (quizResult.success) setQuiz(quizResult.quiz ?? null);
      }
      setLoading(false);
    }
    // Fetching on mount -- the setState calls happen inside load()'s async continuation, not
    // synchronously in the effect body.
    load();
  }, [courseId, moduleId, lessonId]);

  function handleSave() {
    setSaveError(null);
    startTransition(async () => {
      const result = await updateLessonAction(courseId, moduleId, lessonId, {
        title,
        description: description || undefined,
        content: content || undefined,
        videoUrl: videoUrl || "",
        duration,
        type,
        published,
      });
      if (result.success && result.lesson) {
        toast.success("Lesson saved.");
        onLessonSaved(result.lesson);
      } else {
        setSaveError(result.error ?? "Failed to save lesson.");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteLessonAction(courseId, moduleId, lessonId);
      if (result.success) {
        toast.success("Lesson deleted.");
        onDeleted(lessonId);
        onClose();
      } else {
        toast.error(result.error ?? "Failed to delete lesson.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>Update the lesson content, type and visibility.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Loading...</p>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="flex flex-col gap-4 pb-1">
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-title">Title</Label>
                <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-description">Short description</Label>
                <Textarea
                  id="lesson-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lesson-type">Type</Label>
                  <select
                    id="lesson-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as LessonType)}
                    className={selectClassName}
                  >
                    {LESSON_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lesson-duration">Duration (seconds)</Label>
                  <Input
                    id="lesson-duration"
                    type="number"
                    min={0}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lesson-video-url">Video URL</Label>
                <Input
                  id="lesson-video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Content</Label>
                <TiptapEditor value={content} onChange={setContent} />
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Switch checked={published} onCheckedChange={setPublished} />
                Published
              </label>

              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger render={<Button type="button" variant="destructive" size="sm" />}>
                    <Trash2 />
                    Delete lesson
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the lesson and its quiz, if any. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" disabled={deletePending} onClick={handleDelete}>
                        {deletePending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="button" onClick={handleSave} disabled={pending}>
                  {pending ? "Saving..." : "Save lesson"}
                </Button>
              </div>

              {type === LessonType.QUIZ && (
                <QuizBuilder courseId={courseId} lessonId={lessonId} initialQuiz={quiz} onSaved={onQuizSaved} />
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
