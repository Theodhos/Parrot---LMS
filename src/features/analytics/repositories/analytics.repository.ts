import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityType, EnrollmentStatus } from "@/generated/prisma";

// All queries here are bounded (counts, aggregates, groupBy, or date-ranged
// selects) so dashboards never pull full collections into app memory.

export function countEnrollmentsByStatus(userId: string) {
  return prisma.enrollment.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
}

export function avgProgressForUser(userId: string) {
  return prisma.enrollment.aggregate({ where: { userId }, _avg: { progressPercent: true } });
}

export function countCompletedLessonsForUser(userId: string) {
  return prisma.progress.count({ where: { userId, completed: true } });
}

export async function enrolledCourseIds(userId: string) {
  const rows = await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } });
  return rows.map((r) => r.courseId);
}

export function lessonCountsByCourse(courseIds: string[]) {
  return prisma.lesson.groupBy({ by: ["courseId"], where: { courseId: { in: courseIds }, published: true }, _count: { _all: true } });
}

export function completedLessonCountsByCourseForUser(userId: string, courseIds: string[]) {
  return prisma.progress.groupBy({
    by: ["courseId"],
    where: { userId, courseId: { in: courseIds }, completed: true },
    _count: { _all: true },
  });
}

export function avgQuizScoreForUser(userId: string) {
  return prisma.quizAttempt.aggregate({ where: { userId }, _avg: { score: true } });
}

export function activityInRange(userId: string, since: Date) {
  return prisma.learningActivity.findMany({
    where: { userId, occurredAt: { gte: since } },
    select: { occurredAt: true, minutesSpent: true, type: true },
    orderBy: { occurredAt: "asc" },
  });
}

export function activityDatesForStreak(userId: string, since: Date) {
  return prisma.learningActivity.findMany({
    where: { userId, occurredAt: { gte: since } },
    select: { occurredAt: true },
    orderBy: { occurredAt: "desc" },
  });
}

export function recentActivityForUser(userId: string, limit: number) {
  return prisma.learningActivity.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { course: { select: { title: true } }, lesson: { select: { title: true } } },
  });
}

export function enrollmentsWithCourseTitles(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true } } },
  });
}

export function quizAttemptStatsForUser(userId: string) {
  return prisma.quizAttempt.groupBy({ by: ["quizId"], where: { userId }, _avg: { score: true }, _max: { score: true }, _count: { _all: true } });
}

export function quizTitles(quizIds: string[]) {
  return prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true } });
}

// -- Admin-facing (global) -----------------------------------------------

export function countUsersByRole() {
  return prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
}

export function countCoursesByStatus() {
  return prisma.course.groupBy({ by: ["status"], _count: { _all: true } });
}

export function totalEnrollments() {
  return prisma.enrollment.count();
}

export function completedEnrollments() {
  return prisma.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED } });
}

export function globalAvgProgress() {
  return prisma.enrollment.aggregate({ _avg: { progressPercent: true } });
}

export function allCoursesWithEnrollmentCount() {
  return prisma.course.findMany({
    select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } },
  });
}

export function enrollmentCountsByCourse() {
  return prisma.enrollment.groupBy({ by: ["courseId"], _count: { _all: true }, _avg: { progressPercent: true } });
}

export function completedEnrollmentCountsByCourse() {
  return prisma.enrollment.groupBy({ by: ["courseId"], where: { status: EnrollmentStatus.COMPLETED }, _count: { _all: true } });
}

export function coursesByIds(ids: string[]) {
  return prisma.course.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, status: true } });
}

export function enrollmentsInRange(since: Date) {
  return prisma.enrollment.findMany({ where: { enrolledAt: { gte: since } }, select: { enrolledAt: true } });
}

export function recentActivityGlobal(limit: number) {
  return prisma.learningActivity.findMany({
    where: { type: { in: [ActivityType.LESSON_COMPLETED, ActivityType.COURSE_COMPLETED, ActivityType.COURSE_ENROLLED] } },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
      lesson: { select: { title: true } },
    },
  });
}
