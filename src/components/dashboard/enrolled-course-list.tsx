import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSummary } from "@/components/progress/progress-summary";
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
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        You haven&apos;t enrolled in any courses yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.courseId} size="sm">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary external thumbnail URL
                  <img src={item.thumbnail} alt="" className="size-full object-cover" />
                ) : (
                  <BookOpen className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/courses/${item.slug}`} className="truncate font-medium hover:underline">
                    {item.title}
                  </Link>
                  {item.status === EnrollmentStatus.COMPLETED && <Badge>Completed</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">by {item.instructorName}</p>
              </div>
            </div>
            <ProgressSummary
              percent={item.progressPercent}
              completedLessons={item.completedLessons}
              totalLessons={item.totalLessons}
              className="w-full sm:w-56"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
