import Link from "next/link";
import { ArrowRight, BookOpen, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSummary } from "@/components/progress/progress-summary";

export interface ContinueLearningCourse {
  courseId: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  instructorName: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  resumeLessonId: string | null;
}

export interface ContinueLearningCardProps {
  course: ContinueLearningCourse | null;
  /** True when the student has enrollments but every one of them is already completed. */
  allCompleted?: boolean;
}

/** The dashboard's hero card: resume the student's most relevant in-progress course. */
export function ContinueLearningCard({ course, allCompleted = false }: ContinueLearningCardProps) {
  if (!course) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {allCompleted ? (
            <>
              <PartyPopper className="size-8 text-primary" />
              <p className="font-medium">You&apos;ve completed every course you&apos;re enrolled in!</p>
              <p className="text-sm text-muted-foreground">Browse the catalog to keep learning.</p>
            </>
          ) : (
            <>
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="font-medium">You&apos;re not enrolled in any courses yet</p>
              <p className="text-sm text-muted-foreground">Browse the catalog to start your first course.</p>
            </>
          )}
          <Button className="mt-2" render={<Link href="/courses">Browse courses</Link>} />
        </CardContent>
      </Card>
    );
  }

  const continueHref = course.resumeLessonId
    ? `/learn/${course.courseId}/${course.resumeLessonId}`
    : `/courses/${course.slug}`;

  return (
    <Card className="overflow-hidden py-0">
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-video shrink-0 bg-muted sm:aspect-auto">
          {course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external thumbnail URL
            <img src={course.thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <BookOpen className="size-8" />
            </div>
          )}
        </div>
        <CardContent className="flex flex-col justify-center gap-3 py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Continue learning</p>
            <Link href={`/courses/${course.slug}`} className="text-lg font-semibold hover:underline">
              {course.title}
            </Link>
            <p className="text-xs text-muted-foreground">by {course.instructorName}</p>
          </div>
          <ProgressSummary
            percent={course.progressPercent}
            completedLessons={course.completedLessons}
            totalLessons={course.totalLessons}
            label="Your progress"
          />
          <Button className="w-fit" render={<Link href={continueHref}>Continue learning<ArrowRight /></Link>} />
        </CardContent>
      </div>
    </Card>
  );
}
