import { CheckCircle2, Clock, Flame, GraduationCap, ListTodo, Percent, Trophy } from "lucide-react";
import { StatCard } from "@/components/charts/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContinueLearningCard, type ContinueLearningCourse } from "@/components/dashboard/continue-learning-card";
import { EnrolledCourseList, type EnrolledCourseItem } from "@/components/dashboard/enrolled-course-list";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { QuizPerformanceSummary } from "@/components/dashboard/quiz-performance-summary";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDuration, formatPercent } from "@/lib/utils";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";
import { getStudentAnalytics } from "@/features/analytics/services/student-analytics.service";
import { getLessonProgress } from "@/features/progress/services/progress.service";
import { EnrollmentStatus } from "@/generated/prisma";
import type { SessionUser } from "@/lib/permissions";

/** Finds the first not-yet-completed lesson (in course order), or the last lesson if everything is done. */
async function findResumeLessonId(user: SessionUser, lessonIds: string[]): Promise<string | null> {
  if (lessonIds.length === 0) return null;
  const rows = await Promise.all(lessonIds.map((lessonId) => getLessonProgress(user, lessonId)));
  const firstIncompleteIndex = rows.findIndex((row) => !row?.completed);
  const resolvedIndex = firstIncompleteIndex === -1 ? lessonIds.length - 1 : firstIncompleteIndex;
  return lessonIds[resolvedIndex] ?? null;
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [enrollments, analytics] = await Promise.all([listMyEnrollments(user), getStudentAnalytics(user)]);

  const progressByCourseId = new Map(analytics.progressPerCourse.map((p) => [p.courseId, p]));

  const activeEnrollment =
    enrollments.find((e) => e.status === EnrollmentStatus.ACTIVE) ??
    enrollments.find((e) => e.status !== EnrollmentStatus.COMPLETED) ??
    null;
  const allCompleted = enrollments.length > 0 && enrollments.every((e) => e.status === EnrollmentStatus.COMPLETED);

  let continueCourse: ContinueLearningCourse | null = null;
  if (activeEnrollment) {
    const lessonIds = activeEnrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const resumeLessonId = await findResumeLessonId(user, lessonIds);
    const courseProgress = progressByCourseId.get(activeEnrollment.courseId);
    continueCourse = {
      courseId: activeEnrollment.courseId,
      slug: activeEnrollment.course.slug,
      title: activeEnrollment.course.title,
      thumbnail: activeEnrollment.course.thumbnail,
      instructorName: activeEnrollment.course.instructor.name,
      progressPercent: courseProgress?.progressPercent ?? formatPercent(activeEnrollment.progressPercent),
      completedLessons: courseProgress?.completedLessons ?? 0,
      totalLessons: courseProgress?.totalLessons ?? lessonIds.length,
      resumeLessonId,
    };
  }

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
      totalLessons: courseProgress?.totalLessons ?? e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where your learning stands today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Enrolled courses" value={analytics.totalCourses} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Avg. progress" value={`${analytics.averageCourseProgress}%`} icon={<Percent className="size-4" />} />
        <StatCard
          label="Lessons completed"
          value={analytics.totalLessonsCompleted}
          hint={`${analytics.totalLessonsRemaining} remaining`}
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard label="Learning time" value={formatDuration(analytics.totalLearningMinutes * 60)} icon={<Clock className="size-4" />} />
        <StatCard label="Learning streak" value={`${analytics.learningStreakDays}d`} icon={<Flame className="size-4" />} />
      </div>

      <ContinueLearningCard course={continueCourse} allCompleted={allCompleted} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">My courses</h2>
            <span className="text-xs text-muted-foreground">
              {analytics.activeCourses} active · {analytics.completedCourses} completed
            </span>
          </div>
          <EnrolledCourseList items={enrolledItems} />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="size-4" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivityList items={analytics.recentActivity} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-4" />
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
