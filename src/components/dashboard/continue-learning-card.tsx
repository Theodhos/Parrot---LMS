import Link from "next/link";
import { ArrowRight, BookOpen, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { AMBER, EMERALD } from "@/components/courses/course-theme";
import { cn } from "@/lib/utils";

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
  /** Visual accent -- lets the dashboard show two of these side by side in different colors. */
  theme?: "amber" | "emerald";
  /** Small label above the title, e.g. "Continue learning" or "Keep going". */
  eyebrow?: string;
}

const THEME = { amber: AMBER, emerald: EMERALD };
const CTA_COLOR = {
  amber: "!bg-orange-500 hover:!bg-orange-600",
  emerald: "!bg-emerald-500 hover:!bg-emerald-600",
};
const BAR_COLOR = {
  amber: "!bg-gradient-to-r !from-amber-400 !to-orange-500",
  emerald: "!bg-gradient-to-r !from-emerald-400 !to-emerald-500",
};

/** The dashboard's hero card: resume the student's most relevant in-progress course. */
export function ContinueLearningCard({
  course,
  allCompleted = false,
  theme = "amber",
  eyebrow,
}: ContinueLearningCardProps) {
  const accent = THEME[theme];

  if (!course) {
    return (
      <Card className={cn("border-none ring-1", accent.ring)}>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {allCompleted ? (
            <>
              <span
                className={cn("flex size-14 items-center justify-center rounded-full", accent.bg)}
              >
                <PartyPopper className={cn("size-7", accent.text)} />
              </span>
              <p className="font-heading font-medium">
                You&apos;ve completed every course you&apos;re enrolled in!
              </p>
              <p className="text-muted-foreground text-sm">Browse the catalog to keep learning.</p>
            </>
          ) : (
            <>
              <span
                className={cn("flex size-14 items-center justify-center rounded-full", accent.bg)}
              >
                <BookOpen className={cn("size-7", accent.text)} />
              </span>
              <p className="font-heading font-medium">
                You&apos;re not enrolled in any courses yet
              </p>
              <p className="text-muted-foreground text-sm">
                Browse the catalog to start your first course.
              </p>
            </>
          )}
          <Button
            className={cn("mt-2 !rounded-full !text-white", CTA_COLOR[theme])}
            render={<Link href="/courses">Browse courses</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  const continueHref = course.resumeLessonId
    ? `/learn/${course.courseId}/${course.resumeLessonId}`
    : `/courses/${course.slug}`;

  return (
    <Card className={cn("overflow-hidden border-none py-0 ring-1", accent.ring)}>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-video shrink-0 sm:aspect-auto">
          {course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external thumbnail URL
            <img src={course.thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center bg-gradient-to-br",
                accent.from,
                accent.to,
              )}
            >
              <BookOpen className={cn("size-8", accent.text)} />
            </div>
          )}
        </div>
        <CardContent className="flex flex-col justify-center gap-3 py-4">
          <div>
            <p className={cn("text-xs font-semibold tracking-wide uppercase", accent.text)}>
              {eyebrow ?? "Continue learning"}
            </p>
            <Link
              href={`/courses/${course.slug}`}
              className="font-heading text-lg font-semibold hover:underline"
            >
              {course.title}
            </Link>
            <p className="text-muted-foreground text-xs">by {course.instructorName}</p>
          </div>
          <ProgressSummary
            percent={course.progressPercent}
            completedLessons={course.completedLessons}
            totalLessons={course.totalLessons}
            label="Your progress"
            indicatorClassName={BAR_COLOR[theme]}
          />
          <Button
            className={cn("w-fit !rounded-full !text-white", CTA_COLOR[theme])}
            render={
              <Link href={continueHref}>
                Continue learning
                <ArrowRight />
              </Link>
            }
          />
        </CardContent>
      </div>
    </Card>
  );
}
