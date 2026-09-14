import Link from "next/link";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { pickAccent } from "@/components/courses/course-theme";
import { cn } from "@/lib/utils";
import { EnrollmentStatus } from "@/generated/prisma";

export interface EnrolledCourseItem {
  courseId: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  instructorName: string;
  status: EnrollmentStatus;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
}

export interface EnrolledCourseListProps {
  items: EnrolledCourseItem[];
}

/** Full list of the student's enrollments, each with its server-computed progress. */
export function EnrolledCourseList({ items }: EnrolledCourseListProps) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
        You haven&apos;t enrolled in any courses yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const accent = pickAccent(item.courseId);
        const isCompleted = item.status === EnrollmentStatus.COMPLETED;
        return (
          <Card key={item.courseId} size="sm" className="rounded-2xl">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br",
                    accent.from,
                    accent.to,
                  )}
                >
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external thumbnail URL
                    <img src={item.thumbnail} alt="" className="size-full object-cover" />
                  ) : (
                    <BookOpen className={cn("size-5", accent.text)} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/courses/${item.slug}`}
                      className="font-heading truncate font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    {isCompleted && (
                      <Badge
                        variant="outline"
                        className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="size-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">by {item.instructorName}</p>
                </div>
              </div>
              <ProgressSummary
                percent={item.progressPercent}
                completedLessons={item.completedLessons}
                totalLessons={item.totalLessons}
                className="w-full sm:w-56"
                indicatorClassName={isCompleted ? "!bg-emerald-500" : `!${accent.solid}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
