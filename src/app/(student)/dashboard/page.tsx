import type { CSSProperties } from "react";
import {
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  ListTodo,
  Percent,
  Sparkles,
  Trophy,
} from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContinueLearningCard,
  type ContinueLearningCourse,
} from "@/components/dashboard/continue-learning-card";
import {
  EnrolledCourseList,
  type EnrolledCourseItem,
} from "@/components/dashboard/enrolled-course-list";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { QuizPerformanceSummary } from "@/components/dashboard/quiz-performance-summary";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDuration, formatPercent } from "@/lib/utils";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";
import { getStudentAnalytics } from "@/features/analytics/services/student-analytics.service";
import { getLessonProgress } from "@/features/progress/services/progress.service";
import type { CourseProgressPoint } from "@/features/analytics/types/analytics.types";
import { EnrollmentStatus } from "@/generated/prisma";
import type { SessionUser } from "@/lib/permissions";

/** Rounded display font for the dashboard only -- see the Fredoka `font-heading` override below. */
const headingFontStyle = { "--font-heading": "var(--font-fredoka)" } as CSSProperties;

/** Finds the first not-yet-completed lesson (in course order), or the last lesson if everything is done. */
async function findResumeLessonId(user: SessionUser, lessonIds: string[]): Promise<string | null> {
  if (lessonIds.length === 0) return null;
  const rows = await Promise.all(lessonIds.map((lessonId) => getLessonProgress(user, lessonId)));
  const firstIncompleteIndex = rows.findIndex((row) => !row?.completed);
  const resolvedIndex = firstIncompleteIndex === -1 ? lessonIds.length - 1 : firstIncompleteIndex;
  return lessonIds[resolvedIndex] ?? null;
}

type MyEnrollment = Awaited<ReturnType<typeof listMyEnrollments>>[number];

async function buildContinueCourse(
  user: SessionUser,
  enrollment: MyEnrollment,
  progressByCourseId: Map<string, CourseProgressPoint>,
): Promise<ContinueLearningCourse> {
  const lessonIds = enrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const resumeLessonId = await findResumeLessonId(user, lessonIds);
  const courseProgress = progressByCourseId.get(enrollment.courseId);
  return {
    courseId: enrollment.courseId,
    slug: enrollment.course.slug,
    title: enrollment.course.title,
    thumbnail: enrollment.course.thumbnail,
    instructorName: enrollment.course.instructor.name,
    progressPercent: courseProgress?.progressPercent ?? formatPercent(enrollment.progressPercent),
    completedLessons: courseProgress?.completedLessons ?? 0,
    totalLessons: courseProgress?.totalLessons ?? lessonIds.length,
    resumeLessonId,
  };
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [enrollments, analytics] = await Promise.all([
    listMyEnrollments(user),
    getStudentAnalytics(user),
  ]);

  const progressByCourseId = new Map(analytics.progressPerCourse.map((p) => [p.courseId, p]));

  const activeEnrollments = enrollments
    .filter((e) => e.status === EnrollmentStatus.ACTIVE)
    .slice(0, 2);
  const allCompleted =
    enrollments.length > 0 && enrollments.every((e) => e.status === EnrollmentStatus.COMPLETED);
  const continueCourses = await Promise.all(
    activeEnrollments.map((enrollment) =>
      buildContinueCourse(user, enrollment, progressByCourseId),
    ),
  );

  const enrolledItems: EnrolledCourseItem[] = enrollments.map((e) => {
    const courseProgress = progressByCourseId.get(e.courseId);
    return {
      courseId: e.courseId,
      slug: e.course.slug,
      title: e.course.title,
      thumbnail: e.course.thumbnail,
      instructorName: e.course.instructor.name,
      status: e.status,
      progressPercent: courseProgress?.progressPercent ?? formatPercent(e.progressPercent),
      completedLessons: courseProgress?.completedLessons ?? 0,
      totalLessons:
        courseProgress?.totalLessons ??
        e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0),
    };
  });

  return (
    <div style={headingFontStyle} className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 p-6 ring-1 ring-amber-200/60 sm:p-8 dark:from-amber-500/10 dark:via-transparent dark:to-transparent dark:ring-amber-500/20">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
          <Sparkles className="size-3.5" />
          Your learning hub
        </span>
        <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {user.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s where your learning stands today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Enrolled courses"
          value={analytics.totalCourses}
          icon={<GraduationCap className="size-4" />}
          iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
        />
        <StatCard
          label="Avg. progress"
          value={`${analytics.averageCourseProgress}%`}
          icon={<Percent className="size-4" />}
          iconClassName="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        />
        <StatCard
          label="Lessons completed"
          value={analytics.totalLessonsCompleted}
          hint={`${analytics.totalLessonsRemaining} remaining`}
          icon={<CheckCircle2 className="size-4" />}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        />
        <StatCard
          label="Learning time"
          value={formatDuration(analytics.totalLearningMinutes * 60)}
          icon={<Clock className="size-4" />}
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        />
        <StatCard
          label="Learning streak"
          value={`${analytics.learningStreakDays}d`}
          icon={<Flame className="size-4" />}
          iconClassName="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        />
      </div>

      {continueCourses.length > 0 ? (
        <div className={continueCourses.length > 1 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          <ContinueLearningCard
            course={continueCourses[0] ?? null}
            theme="amber"
            eyebrow="Continue learning"
          />
          {continueCourses[1] && (
            <ContinueLearningCard
              course={continueCourses[1]}
              theme="emerald"
              eyebrow="Keep going"
            />
          )}
        </div>
      ) : (
        <ContinueLearningCard course={null} allCompleted={allCompleted} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">My courses</h2>
            <span className="text-muted-foreground text-xs">
              {analytics.activeCourses} active · {analytics.completedCourses} completed
            </span>
          </div>
          <EnrolledCourseList items={enrolledItems} />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  <ListTodo className="size-3.5" />
                </span>
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityList items={analytics.recentActivity} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <Trophy className="size-3.5" />
                </span>
                Quiz performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuizPerformanceSummary items={analytics.quizPerformance} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
