"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonCompleteAction } from "@/features/progress/actions/progress.actions";

export interface NextLessonButtonProps {
  courseId: string;
  lessonId: string;
  href: string;
  completed: boolean;
  /** False for quiz lessons -- those only complete by passing the quiz, never just by moving on. */
  canAutoComplete: boolean;
}

/** Advances to the next lesson. Along the way it marks the current one complete, so the course's
 * progress % climbs simply by working through the lessons in order, not only via the explicit
 * "Mark Complete" button. */
export function NextLessonButton({ courseId, lessonId, href, completed, canAutoComplete }: NextLessonButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (completed || !canAutoComplete) {
      router.push(href);
      return;
    }
    startTransition(async () => {
      const result = await markLessonCompleteAction(courseId, lessonId);
      if (!result.success) {
        toast.error(result.error ?? "Could not update your progress.");
      }
      router.push(href);
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="!rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
    >
      {isPending ? "Saving..." : "Next"}
      <ArrowRight />
    </Button>
  );
}
