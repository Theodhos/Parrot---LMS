"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonCompleteAction } from "@/features/progress/actions/progress.actions";

export interface MarkCompleteButtonProps {
  courseId: string;
  lessonId: string;
  completed: boolean;
}

/** Marks the current lesson complete, then refreshes the route so the surrounding progress reflects the server-computed state. */
export function MarkCompleteButton({ courseId, lessonId, completed }: MarkCompleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markLessonCompleteAction(courseId, lessonId);
      if (!result.success) {
        toast.error(result.error ?? "Could not mark this lesson complete.");
        return;
      }
      if (result.data?.courseCompleted) {
        toast.success("Lesson completed -- you've finished the course!");
      } else {
        toast.success("Lesson marked as completed.");
      }
      router.refresh();
    });
  }

  if (completed) {
    return (
      <span
        role="status"
        aria-label="Completed"
        className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <CheckCircle2 className="size-4" />
        Completed
      </span>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="!rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
    >
      <Circle className="size-4" />
      {isPending ? "Marking complete..." : "Mark Complete"}
    </Button>
  );
}
