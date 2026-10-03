import "server-only";
import { CourseStatus, Role } from "@/generated/prisma";
import { formatPercent } from "@/lib/utils";
import { requireRole, type SessionUser } from "@/lib/permissions";
import * as repo from "@/features/analytics/repositories/analytics.repository";
import type { AdminAnalyticsDTO, CoursePerformanceDTO, PopularCourseDTO, RecentActivityItem } from "@/features/analytics/types/analytics.types";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * The management analytics behind /admin/dashboard and /admin/analytics. An
 * admin gets the whole platform. An instructor gets the same figures counted
 * over their own courses only -- their students, their enrollments, activity
 * in their courses -- and never anything about courses they do not teach.
 */
export async function getAdminAnalytics(user: SessionUser): Promise<AdminAnalyticsDTO> {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);
  const scope = user.role === Role.INSTRUCTOR ? await repo.instructorCourseIds(user.id) : undefined;

  const [
    roleGroups,
    statusGroups,
    totalEnrollments,
    completedEnrollments,
    avgProgress,
    coursesWithCounts,
    enrollmentGroups,
    completedGroups,
    enrollmentsLast30,
    recentActivity,
  ] = await Promise.all([
    scope ? null : repo.countUsersByRole(),
    repo.countCoursesByStatus(scope),
    repo.totalEnrollments(scope),
    repo.completedEnrollments(scope),
    repo.globalAvgProgress(scope),
    repo.allCoursesWithEnrollmentCount(scope),
    repo.enrollmentCountsByCourse(scope),
    repo.completedEnrollmentCountsByCourse(scope),
    repo.enrollmentsInRange(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), scope),
    repo.recentActivityGlobal(15, scope),
  ]);

  // For an instructor, "students" means the people enrolled in their courses;
  // the platform's instructor head-count is not theirs to see.
  const totalStudents = roleGroups
    ? (roleGroups.find((g) => g.role === Role.STUDENT)?._count._all ?? 0)
    : await repo.countDistinctStudents(scope ?? []);
  const totalInstructors = roleGroups?.find((g) => g.role === Role.INSTRUCTOR)?._count._all ?? 0;

  const publishedCourses = statusGroups.find((g) => g.status === CourseStatus.PUBLISHED)?._count._all ?? 0;
  const draftCourses = statusGroups.find((g) => g.status === CourseStatus.DRAFT)?._count._all ?? 0;
  const archivedCourses = statusGroups.find((g) => g.status === CourseStatus.ARCHIVED)?._count._all ?? 0;
  const totalCourses = publishedCourses + draftCourses + archivedCourses;

  const completedByCourseId = new Map(completedGroups.map((g) => [g.courseId, g._count._all]));
  const avgProgressByCourseId = new Map(enrollmentGroups.map((g) => [g.courseId, g._avg.progressPercent ?? 0]));

  const coursePerformance: CoursePerformanceDTO[] = coursesWithCounts.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    enrollmentCount: c._count.enrollments,
    completedCount: completedByCourseId.get(c.id) ?? 0,
    averageProgress: formatPercent(avgProgressByCourseId.get(c.id) ?? 0),
  }));

  const mostPopularCourses: PopularCourseDTO[] = [...coursePerformance]
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      enrollmentCount: c.enrollmentCount,
      completionRate: c.enrollmentCount === 0 ? 0 : formatPercent((c.completedCount / c.enrollmentCount) * 100),
    }));

  const highestCompletionCourses: PopularCourseDTO[] = coursePerformance
    .filter((c) => c.enrollmentCount > 0)
    .map((c) => ({
      id: c.id,
      title: c.title,
      enrollmentCount: c.enrollmentCount,
      completionRate: formatPercent((c.completedCount / c.enrollmentCount) * 100),
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);

  const enrollmentBuckets = new Map<string, number>();
  for (const e of enrollmentsLast30) {
    const key = dayKey(e.enrolledAt);
    enrollmentBuckets.set(key, (enrollmentBuckets.get(key) ?? 0) + 1);
  }
  const newEnrollmentsOverTime: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d);
    newEnrollmentsOverTime.push({ date: key, count: enrollmentBuckets.get(key) ?? 0 });
  }

  const recentStudentActivity: RecentActivityItem[] = recentActivity.map((a) => ({
    id: a.id,
    type: a.type,
    courseTitle: a.course?.title ?? null,
    lessonTitle: a.lesson?.title ?? null,
    occurredAt: a.occurredAt,
  }));

  return {
    totalStudents,
    totalInstructors,
    totalCourses,
    publishedCourses,
    draftCourses,
    archivedCourses,
    totalEnrollments,
    courseCompletionRate: totalEnrollments === 0 ? 0 : formatPercent((completedEnrollments / totalEnrollments) * 100),
    averageCourseProgress: formatPercent(avgProgress._avg.progressPercent ?? 0),
    newEnrollmentsOverTime,
    mostPopularCourses,
    highestCompletionCourses,
    coursePerformance,
    recentStudentActivity,
  };
}
