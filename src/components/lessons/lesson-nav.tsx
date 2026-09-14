import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LessonNavProps {
  courseId: string;
  previousLessonId: string | null;
  nextLessonId: string | null;
}

/** Previous/Next lesson buttons, disabled at the ends of the course. */
export function LessonNav({ courseId, previousLessonId, nextLessonId }: LessonNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {previousLessonId ? (
        <Button variant="outline" render={<Link href={`/learn/${courseId}/${previousLessonId}`}><ArrowLeft />Previous lesson</Link>} />
      ) : (
        <Button variant="outline" disabled>
          <ArrowLeft />
          Previous lesson
        </Button>
      )}

      {nextLessonId ? (
        <Button render={<Link href={`/learn/${courseId}/${nextLessonId}`}>Next lesson<ArrowRight /></Link>} />
      ) : (
        <Button disabled>
          Next lesson
          <ArrowRight />
        </Button>
      )}
    </div>
  );
}
