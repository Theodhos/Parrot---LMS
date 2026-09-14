"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteCourseAction } from "@/features/courses/actions/course.actions";

export interface DeleteCourseButtonProps {
  courseId: string;
  courseTitle: string;
  /** Called after a successful delete so the caller can drop it from local list state. */
  onDeleted?: () => void;
  /** Navigate here after a successful delete (e.g. back to the course list from the editor page). */
  redirectTo?: string;
  variant?: "icon" | "full";
}

/** Confirmation dialog + delete call, reused on the course list row and the course editor page. */
export function DeleteCourseButton({
  courseId,
  courseTitle,
  onDeleted,
  redirectTo,
  variant = "icon",
}: DeleteCourseButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourseAction(courseId);
      if (result.success) {
        toast.success(`"${courseTitle}" deleted.`);
        setOpen(false);
        onDeleted?.();
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete course.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          variant === "icon" ? (
            <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" />
          ) : (
            <Button variant="destructive" size="sm" />
          )
        }
      >
        <Trash2 />
        {variant === "full" ? "Delete course" : <span className="sr-only">Delete course</span>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{courseTitle}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the course, its modules, lessons and quizzes. Students who
            already have access will lose it immediately. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
