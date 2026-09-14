import "server-only";
import { EnrollmentStatus } from "@/generated/prisma";
import { formatPercent } from "@/lib/utils";
import type { SessionUser } from "@/lib/permissions";
import * as repo from "@/features/analytics/repositories/analytics.repository";
import { computeStreakDays } from "./streak";
import type {
  CourseProgressPoint,
  DailyActivityPoint,
  QuizPerformancePoint,
  RecentActivityItem,
  StudentAnalyticsDTO,
} from "@/features/analytics/types/analytics.types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

export async function getStudentAnalytics(user: SessionUser): Promise<StudentAnalyticsDTO> {
  const since365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const [statusGroups, avgProgress, totalLessonsCompleted, courseIds, avgQuiz, activity, recent, enrollments, quizStats] =
    await Promise.all([
      repo.countEnrollmentsByStatus(user.id),
      repo.avgProgressForUser(user.id),
      repo.countCompletedLessonsForUser(user.id),
      repo.enrolledCourseIds(user.id),
      repo.avgQuizScoreForUser(user.id),
      repo.activityInRange(user.id, since365),
      repo.recentActivityForUser(user.id, 10),
      repo.enrollmentsWithCourseTitles(user.id),
      repo.quizAttemptStatsForUser(user.id),
    ]);

  const totalCourses = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
  const activeCourses = statusGroups.find((g) => g.status === EnrollmentStatus.ACTIVE)?._count._all ?? 0;
  const completedCourses = statusGroups.find((g) => g.status === EnrollmentStatus.COMPLETED)?._count._all ?? 0;

  const lessonCounts = await repo.lessonCountsByCourse(courseIds);
  const totalLessonsAcrossCourses = lessonCounts.reduce((sum, g) => sum + g._count._all, 0);

  const totalLearningMinutes = activity.reduce((sum, a) => sum + a.minutesSpent, 0);
  const streakDays = computeStreakDays(activity.map((a) => a.occurredAt));

  // -- time series, all derived from the single 365-day activity fetch --
  const last30Cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyBuckets = new Map<string, { minutes: number; lessonsCompleted: number }>();
  for (const a of activity) {
    if (a.occurredAt < last30Cutoff) continue;
    const key = dayKey(a.occurredAt);
    const bucket = dailyBuckets.get(key) ?? { minutes: 0, lessonsCompleted: 0 };
    bucket.minutes += a.minutesSpent;
    if (a.type === "LESSON_COMPLETED") bucket.lessonsCompleted += 1;
    dailyBuckets.set(key, bucket);
  }
  const activityOverTime: DailyActivityPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d);
    const bucket = dailyBuckets.get(key);
    activityOverTime.push({ date: key, minutes: bucket?.minutes ?? 0, lessonsCompleted: bucket?.lessonsCompleted ?? 0 });
  }

  const weeklyLearningHours = activityOverTime.slice(-7).map((point) => ({
    day: WEEKDAY_LABELS[new Date(point.date).getUTCDay()]!,
    hours: Math.round((point.minutes / 60) * 10) / 10,
  }));

  const monthlyBuckets = new Map<string, number>();
  for (const a of activity) {
    const key = monthKey(a.occurredAt);
    monthlyBuckets.set(key, (monthlyBuckets.get(key) ?? 0) + a.minutesSpent);
  }
  const monthlyActivity: { month: string; minutes: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i, 1);
    const key = monthKey(d);
    monthlyActivity.push({
      month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      minutes: monthlyBuckets.get(key) ?? 0,
    });
  }

  const lessonCountByCourseId = new Map(lessonCounts.map((g) => [g.courseId, g._count._all]));
  const completedByCourseId = new Map(
    (await repo.completedLessonCountsByCourseForUser(user.id, courseIds)).map((g) => [g.courseId, g._count._all]),
  );

  const progressPerCourse: CourseProgressPoint[] = enrollments.map((e) => ({
    courseId: e.courseId,
    courseTitle: e.course.title,
    progressPercent: formatPercent(e.progressPercent),
    completedLessons: completedByCourseId.get(e.courseId) ?? 0,
    totalLessons: lessonCountByCourseId.get(e.courseId) ?? 0,
  }));

  const quizIds = quizStats.map((q) => q.quizId);
  const quizzes = await repo.quizTitles(quizIds);
  const quizTitleById = new Map(quizzes.map((q) => [q.id, q.title]));
  const quizPerformance: QuizPerformancePoint[] = quizStats.map((q) => ({
    quizId: q.quizId,
    quizTitle: quizTitleById.get(q.quizId) ?? "Quiz",
    attempts: q._count._all,
    averageScore: formatPercent(q._avg.score ?? 0),
    bestScore: formatPercent(q._max.score ?? 0),
  }));

  const recentActivity: RecentActivityItem[] = recent.map((a) => ({
    id: a.id,
    type: a.type,
    courseTitle: a.course?.title ?? null,
    lessonTitle: a.lesson?.title ?? null,
    occurredAt: a.occurredAt,
  }));

  return {
    totalCourses,
    activeCourses,
    completedCourses,
    averageCourseProgress: formatPercent(avgProgress._avg.progressPercent ?? 0),
    totalLessonsCompleted,
    totalLessonsRemaining: Math.max(0, totalLessonsAcrossCourses - totalLessonsCompleted),
    totalLearningMinutes,
    averageQuizScore: formatPercent(avgQuiz._avg.score ?? 0),
    learningStreakDays: streakDays,
    completionRate: totalCourses === 0 ? 0 : formatPercent((completedCourses / totalCourses) * 100),
    activityOverTime,
    weeklyLearningHours,
    monthlyActivity,
    progressPerCourse,
    quizPerformance,
    recentActivity,
  };
}
