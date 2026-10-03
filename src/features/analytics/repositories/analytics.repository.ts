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

// -- Management-facing ------------------------------------------------------
// Each takes an optional list of course ids: omitted for an admin (the whole
// platform), an instructor's own course ids for an instructor.

const inCourses = (courseIds?: string[]) => (courseIds ? { courseId: { in: courseIds } } : {});

export async function instructorCourseIds(instructorId: string) {
  const rows = await prisma.course.findMany({ where: { instructorId }, select: { id: true } });
  return rows.map((r) => r.id);
}

export function countUsersByRole() {
  return prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
}

/** People enrolled in at least one of these courses, each counted once. */
export async function countDistinctStudents(courseIds: string[]) {
  const rows = await prisma.enrollment.findMany({
    where: { courseId: { in: courseIds } },
    distinct: ["userId"],
    select: { userId: true },
  });
  return rows.length;
}

export function countCoursesByStatus(courseIds?: string[]) {
  return prisma.course.groupBy({
    by: ["status"],
    where: courseIds ? { id: { in: courseIds } } : {},
    _count: { _all: true },
  });
}

export function totalEnrollments(courseIds?: string[]) {
  return prisma.enrollment.count({ where: inCourses(courseIds) });
}

export function completedEnrollments(courseIds?: string[]) {
  return prisma.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED, ...inCourses(courseIds) } });
}

export function globalAvgProgress(courseIds?: string[]) {
  return prisma.enrollment.aggregate({ where: inCourses(courseIds), _avg: { progressPercent: true } });
}

export function allCoursesWithEnrollmentCount(courseIds?: string[]) {
  return prisma.course.findMany({
    where: courseIds ? { id: { in: courseIds } } : {},
    select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } },
  });
}

export function enrollmentCountsByCourse(courseIds?: string[]) {
  return prisma.enrollment.groupBy({
    by: ["courseId"],
    where: inCourses(courseIds),
    _count: { _all: true },
    _avg: { progressPercent: true },
  });
}

export function completedEnrollmentCountsByCourse(courseIds?: string[]) {
  return prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { status: EnrollmentStatus.COMPLETED, ...inCourses(courseIds) },
    _count: { _all: true },
  });
}

export function coursesByIds(ids: string[]) {
  return prisma.course.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, status: true } });
}

export function enrollmentsInRange(since: Date, courseIds?: string[]) {
  return prisma.enrollment.findMany({
    where: { enrolledAt: { gte: since }, ...inCourses(courseIds) },
    select: { enrolledAt: true },
  });
}

export function recentActivityGlobal(limit: number, courseIds?: string[]) {
  return prisma.learningActivity.findMany({
    where: {
      type: { in: [ActivityType.LESSON_COMPLETED, ActivityType.COURSE_COMPLETED, ActivityType.COURSE_ENROLLED] },
      ...inCourses(courseIds),
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
      lesson: { select: { title: true } },
    },
  });
}
