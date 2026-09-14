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

/** Marks the current lesson complete, then refreshes the route so the sidebar/progress bar reflect the server-computed state. */
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
      <Button variant="outline" disabled className="text-primary">
        <CheckCircle2 className="text-primary" />
        Completed
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      <Circle />
      {isPending ? "Marking complete..." : "Mark as completed"}
    </Button>
  );
}
