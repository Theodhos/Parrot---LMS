"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  FileBox,
  FileText,
  GripVertical,
  HelpCircle,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LessonEditorDialog } from "@/components/admin/lesson-editor-dialog";
import { LessonDropZone } from "@/components/admin/lesson-drop-zone";
import { LESSON_TYPE_THEME } from "@/components/courses/course-theme";
import { cn, formatDuration } from "@/lib/utils";
import { deleteModuleAction } from "@/features/modules/actions/module.actions";
import { createLessonAction, updateLessonAction, type LessonRecord } from "@/features/lessons/actions/lesson.actions";
import { LessonType } from "@/generated/prisma";
import type { LessonOutlineDTO, ModuleOutlineDTO } from "@/features/courses/types/course.types";

const LESSON_TYPE_ICON: Record<LessonType, typeof FileText> = {
  ARTICLE: FileText,
  VIDEO: PlayCircle,
  QUIZ: HelpCircle,
  DOCUMENT: FileBox,
};

function toOutline(record: LessonRecord, hasQuiz: boolean): LessonOutlineDTO {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    type: record.type,
    duration: record.duration ?? 0,
    order: record.order,
    published: record.published,
    hasQuiz,
  };
}

interface LessonRowProps {
  lesson: LessonOutlineDTO;
  onEdit: () => void;
  onTogglePublished: (lessonId: string, published: boolean) => void;
}

function LessonRow({ lesson, onEdit, onTogglePublished }: LessonRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const Icon = LESSON_TYPE_ICON[lesson.type];
  const accent = LESSON_TYPE_THEME[lesson.type];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder lesson"
      >
        <GripVertical className="size-4" />
      </button>

      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", accent.bg, accent.text)}>
        <Icon className="size-3.5" />
      </span>

      <button type="button" onClick={onEdit} className="flex-1 truncate text-left text-sm hover:underline">
        {lesson.title}
      </button>

      {lesson.hasQuiz && lesson.type !== LessonType.QUIZ && (
        <HelpCircle className="text-muted-foreground size-3.5 shrink-0" />
      )}

      {lesson.duration > 0 && (
        <span className="text-muted-foreground shrink-0 text-xs">{formatDuration(lesson.duration)}</span>
      )}

      <label className="flex shrink-0 items-center gap-1.5 text-xs">
        <Switch
          size="sm"
          checked={lesson.published}
          onCheckedChange={(checked) => onTogglePublished(lesson.id, checked)}
        />
        <span className="text-muted-foreground hidden sm:inline">{lesson.published ? "Published" : "Draft"}</span>
      </label>

      <Button variant="ghost" size="icon-sm" onClick={onEdit}>
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit lesson</span>
      </Button>
    </div>
  );
}

export interface ModuleCardProps {
  courseId: string;
  module: ModuleOutlineDTO;
  index: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function ModuleCard({ courseId, module: mod, index, expanded, onToggleExpanded, onEdit, onDeleted }: ModuleCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const [lessons, setLessons] = useState<LessonOutlineDTO[]>(mod.lessons);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [creating, startCreateTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const lessonSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const previous = lessons;
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);

    const res = await fetch(`/api/courses/${courseId}/modules/${mod.id}/lessons/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedLessonIds: reordered.map((l) => l.id) }),
    });
    const json = (await res.json()) as { success: boolean };
    if (!json.success) {
      toast.error("Failed to reorder lessons.");
      setLessons(previous);
    }
  }

  function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    startCreateTransition(async () => {
      const result = await createLessonAction(courseId, mod.id, { title: newLessonTitle.trim() });
      if (result.success && result.lesson) {
        setLessons((prev) => [...prev, toOutline(result.lesson!, false)]);
        setNewLessonTitle("");
        toast.success("Lesson added.");
        // Jump straight into the editor -- title-only creation leaves text and video empty.
        setEditingLessonId(result.lesson.id);
      } else {
        toast.error(result.error ?? "Failed to add lesson.");
      }
    });
  }

  function handleLessonSaved(record: LessonRecord) {
    setLessons((prev) => prev.map((l) => (l.id === record.id ? toOutline(record, l.hasQuiz) : l)));
  }

  function handleQuizSaved() {
    if (!editingLessonId) return;
    setLessons((prev) => prev.map((l) => (l.id === editingLessonId ? { ...l, hasQuiz: true } : l)));
  }

  function handleLessonDeleted(lessonId: string) {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  }

  function togglePublished(lessonId: string, published: boolean) {
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, published } : l)));
    updateLessonAction(courseId, mod.id, lessonId, { published }).then((result) => {
      if (!result.success) {
        toast.error(result.error ?? "Failed to update lesson.");
        setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, published: !published } : l)));
      }
    });
  }

  function handleDeleteModule() {
    startDeleteTransition(async () => {
      const result = await deleteModuleAction(courseId, mod.id);
      if (result.success) {
        toast.success("Module deleted.");
        onDeleted();
      } else {
        toast.error(result.error ?? "Failed to delete module.");
      }
    });
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-xl border bg-card", isDragging && "opacity-50")}>
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag to reorder module"
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{mod.title}</span>
            {mod.description && (
              <span className="text-muted-foreground line-clamp-1 text-xs">{mod.description}</span>
            )}
          </div>
          <Badge variant="outline" className="ml-auto shrink-0 font-medium">
            {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
          </Badge>
          <ChevronDown className={cn("text-muted-foreground size-4 shrink-0 transition-transform", expanded && "rotate-180")} />
        </button>

        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit module</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" />}>
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete module</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{mod.title}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the module and all its lessons. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={deletePending} onClick={handleDeleteModule}>
                {deletePending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t p-3">
          {lessons.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">No lessons in this module yet.</p>
          ) : (
            <DndContext
              id={`lessons-dnd-${mod.id}`}
              sensors={lessonSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      onEdit={() => setEditingLessonId(lesson.id)}
                      onTogglePublished={togglePublished}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-1 flex items-center gap-2">
            <Input
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLesson();
                }
              }}
              placeholder="New lesson title"
              className="flex-1"
            />
            <Button type="button" size="sm" variant="outline" disabled={creating || !newLessonTitle.trim()} onClick={handleAddLesson}>
              <Plus className="size-3.5" />
              {creating ? "Adding..." : "Add lesson"}
            </Button>
          </div>

          <LessonDropZone
            courseId={courseId}
            moduleId={mod.id}
            onLessonCreated={(record) => setLessons((prev) => [...prev, toOutline(record, false)])}
          />
        </div>
      )}

      {editingLessonId && (
        <LessonEditorDialog
          key={editingLessonId}
          courseId={courseId}
          moduleId={mod.id}
          lessonId={editingLessonId}
          onClose={() => setEditingLessonId(null)}
          onLessonSaved={handleLessonSaved}
          onQuizSaved={handleQuizSaved}
          onDeleted={handleLessonDeleted}
        />
      )}
    </div>
  );
}
