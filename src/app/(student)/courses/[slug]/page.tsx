import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Layers, BookOpen, Star, Users, Sparkles } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CourseLevelBadge } from "@/components/courses/course-level-badge";
import { CourseOutline } from "@/components/courses/course-outline";
import { EnrollForm } from "@/components/courses/enroll-form";
import { LessonPlayer } from "@/components/lessons/lesson-player";
import { pickAccent } from "@/components/courses/course-theme";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { requireCurrentUser } from "@/lib/auth/session";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { getPublishedCourseBySlug } from "@/features/courses/services/course.service";
import { getAccessibleEnrollment } from "@/features/access/services/access.service";
import { getLearnLessonView } from "@/features/lessons/services/learning.service";
import {
  getCourseProgress,
  getLessonProgress,
} from "@/features/progress/services/progress.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Finds the first not-yet-completed lesson (in course order), or the last lesson if everything is done. */
async function findResumeLessonId(user: SessionUser, lessonIds: string[]): Promise<string | null> {
  if (lessonIds.length === 0) return null;
  const rows = await Promise.all(lessonIds.map((lessonId) => getLessonProgress(user, lessonId)));
  const firstIncompleteIndex = rows.findIndex((row) => !row?.completed);
  const resolvedIndex = firstIncompleteIndex === -1 ? lessonIds.length - 1 : firstIncompleteIndex;
  return lessonIds[resolvedIndex] ?? null;
}

export default async function CourseDetailPage({ params, searchParams }: CourseDetailPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const requestedLessonId = Array.isArray(sp.lesson) ? sp.lesson[0] : sp.lesson;

  const user = await requireCurrentUser();

  let course;
  try {
    course = await getPublishedCourseBySlug(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // Null for no access (including a revoked purchase); an all-courses buyer
  // opening a course for the first time is enrolled here and lands straight
  // in the player.
  const enrollment = await getAccessibleEnrollment(user, course.id);
  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const buyUrl = course.ghlCheckoutUrl;

  const [progress, resumeLessonId] = enrollment
    ? await Promise.all([getCourseProgress(user, course.id), findResumeLessonId(user, lessonIds)])
    : [null, null];

  const isCompleted = enrollment?.completedAt != null;
  const accent = pickAccent(course.id);

  // Once enrolled, the whole player -- outline, video, lesson text, prev/next -- lives on this
  // same /courses/[slug] route (switched via ?lesson=) instead of a separate /learn/[id]/[id] page.
  const selectedLessonId = requestedLessonId ?? resumeLessonId ?? undefined;
  let view = null;
  if (enrollment && selectedLessonId) {
    try {
      view = await getLearnLessonView(user, course.id, selectedLessonId);
    } catch (error) {
      if (error instanceof NotFoundError) notFound();
      if (error instanceof ForbiddenError) redirect("/dashboard");
      throw error;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/courses">Courses</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {enrollment && (
          <Badge
            variant="outline"
            className={cn(
              "border-transparent font-medium",
              isCompleted
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
            )}
          >
            {isCompleted ? "Completed" : "In progress"}
          </Badge>
        )}
      </div>

      {enrollment && view && progress ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <Card>
              <CardContent>
                <ProgressSummary
                  percent={progress.progressPercent}
                  completedLessons={progress.completedLessons}
                  totalLessons={progress.totalLessons}
                  indicatorClassName="!bg-gradient-to-r !from-amber-400 !to-orange-500"
                />
              </CardContent>
            </Card>
            <CourseOutline
              modules={view.modules}
              completedLessonIds={new Set(view.modules.flatMap((m) => m.lessons).filter((l) => l.completed).map((l) => l.id))}
              courseSlug={course.slug}
              activeLessonId={selectedLessonId}
            />
          </div>
          <div className="lg:col-span-8">
            <LessonPlayer courseSlug={course.slug} view={view} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="ring-border relative aspect-video w-full overflow-hidden rounded-2xl ring-1">
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
                  <BookOpen className={cn("size-12", accent.text)} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
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
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{course.title}</h1>
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {course.description}
              </p>
            </div>

            <div className="bg-card flex items-center gap-3 rounded-2xl border p-4">
              <Avatar
                size="lg"
                className={cn("ring-offset-background ring-2 ring-offset-2", accent.ring)}
              >
                {course.instructorImage && (
                  <AvatarImage src={course.instructorImage} alt={course.instructorName} />
                )}
                <AvatarFallback>{course.instructorName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{course.instructorName}</p>
                <p className="text-muted-foreground text-xs">
                  {course.instructorBio ?? "Course instructor"}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-lg font-medium">
                <Sparkles className="size-4 text-amber-500" />
                Course content
              </h2>
              <CourseOutline modules={course.modules} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  At a glance
                </p>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                      <Layers className="size-3.5" />
                    </span>
                    {course.moduleCount} modules
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      <BookOpen className="size-3.5" />
                    </span>
                    {course.lessonCount} lessons
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      <Clock className="size-3.5" />
                    </span>
                    {formatDuration(course.totalDurationSeconds)}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Users className="size-3.5" />
                    </span>
                    {course.enrollmentCount} enrolled
                  </div>
                  {course.averageRating !== null && (
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                        <Star className="size-3.5 fill-current" />
                      </span>
                      {course.averageRating.toFixed(1)} average rating
                    </div>
                  )}
                </div>

                <Separator />

                {enrollment && progress ? (
                  <div className="flex flex-col gap-4">
                    <ProgressSummary
                      percent={progress.progressPercent}
                      completedLessons={progress.completedLessons}
                      totalLessons={progress.totalLessons}
                      indicatorClassName="!bg-gradient-to-r !from-amber-400 !to-orange-500"
                    />
                    <p className="text-muted-foreground text-xs">
                      Enrolled {formatDate(enrollment.enrolledAt)}
                      {enrollment.completedAt
                        ? ` · Completed ${formatDate(enrollment.completedAt)}`
                        : ""}
                    </p>
                    {resumeLessonId ? (
                      <Button
                        className="w-full !rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
                        render={<Link href={`/courses/${course.slug}?lesson=${resumeLessonId}`}>Continue learning</Link>}
                      />
                    ) : (
                      <Button className="w-full !rounded-full !bg-orange-500 !text-white" disabled>
                        Continue learning
                      </Button>
                    )}
                  </div>
                ) : (
                  <EnrollForm courseId={course.id} priceCents={course.priceCents} buyUrl={buyUrl} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
