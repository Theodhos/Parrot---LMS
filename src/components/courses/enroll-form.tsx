import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollInCourseAction } from "@/features/enrollments/actions/enrollment.actions";

export interface EnrollFormProps {
  courseId: string;
  slug: string;
  firstLessonId: string | null;
}

/** Enrolls the student and sends them into the first lesson. Plain server-action form, no client JS needed. */
export function EnrollForm({ courseId, slug, firstLessonId }: EnrollFormProps) {
  return (
    <form action={enrollInCourseAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="firstLessonId" value={firstLessonId ?? ""} />
      <Button type="submit" size="lg" className="w-full !rounded-full !bg-orange-500 !text-white hover:!bg-orange-600">
        Enroll now
        <ArrowRight />
      </Button>
    </form>
  );
}
