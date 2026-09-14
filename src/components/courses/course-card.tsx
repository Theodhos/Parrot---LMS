import Link from "next/link";
import { BookOpen, Layers, Star, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseLevelBadge } from "@/components/courses/course-level-badge";
import { pickAccent } from "@/components/courses/course-theme";
import { cn, formatDuration } from "@/lib/utils";
import type { CourseListItemDTO } from "@/features/courses/types/course.types";
import { EnrollmentStatus } from "@/generated/prisma";

export interface CourseCardProps {
  course: CourseListItemDTO;
  /** Pass the student's enrollment status for this course, or null if not enrolled. */
  enrollmentStatus?: EnrollmentStatus | null;
}

export function CourseCard({ course, enrollmentStatus = null }: CourseCardProps) {
  const href = `/courses/${course.slug}`;
  const isCompleted = enrollmentStatus === EnrollmentStatus.COMPLETED;
  const isEnrolled = enrollmentStatus !== null;
  const accent = pickAccent(course.id);

  const ctaLabel = isCompleted ? "Review course" : isEnrolled ? "Continue" : "View course";
  const ctaColor = isCompleted
    ? "!bg-emerald-500 hover:!bg-emerald-600"
    : isEnrolled
      ? "!bg-sky-500 hover:!bg-sky-600"
      : "!bg-orange-500 hover:!bg-orange-600";

  return (
    <Card className="overflow-hidden pt-0">
      <Link href={href} className="block">
        <div className="relative aspect-video w-full overflow-hidden">
          {course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnails are arbitrary external URLs, not project-controlled assets
            <img src={course.thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div
              className={cn(
                "flex size-full items-center justify-center bg-gradient-to-br",
                accent.from,
                accent.to,
              )}
            >
              <BookOpen className={cn("size-10", accent.text)} />
            </div>
          )}
          {isEnrolled && (
            <Badge
              className={cn(
                "absolute top-2 right-2 border-transparent shadow-sm",
                isCompleted ? "bg-emerald-500 text-white" : "text-foreground bg-white/95",
              )}
            >
              {isCompleted && <CheckCircle2 className="size-3" />}
              {isCompleted ? "Completed" : "Enrolled"}
            </Badge>
          )}
        </div>
      </Link>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {course.categoryName && (
            <Badge
              variant="outline"
              className="bg-muted text-foreground border-transparent font-medium"
            >
              {course.categoryName}
            </Badge>
          )}
          <CourseLevelBadge level={course.level} />
        </div>
        <Link href={href} className="line-clamp-2 leading-snug font-medium hover:underline">
          {course.title}
        </Link>
        <p className="text-muted-foreground text-xs">by {course.instructorName}</p>
        <p className="text-muted-foreground line-clamp-2 text-sm">{course.description}</p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <Layers className="size-3.5" />
            {course.moduleCount} modules
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {course.lessonCount} lessons
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(course.totalDurationSeconds)}
          </span>
          {course.averageRating !== null && (
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-current" />
              {course.averageRating.toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className={cn("w-full !rounded-full !text-white", ctaColor)}
          render={
            <Link href={href}>
              {ctaLabel}
              <ArrowRight />
            </Link>
          }
        />
      </CardFooter>
    </Card>
  );
}
