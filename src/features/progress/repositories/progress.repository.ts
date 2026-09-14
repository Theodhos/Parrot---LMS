import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityType, EnrollmentStatus, NotificationType } from "@/generated/prisma";

export function findProgress(userId: string, lessonId: string) {
  return prisma.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
}

export function listProgressForCourse(userId: string, courseId: string) {
  return prisma.progress.findMany({ where: { userId, courseId } });
}

export function listCompletedLessonIds(userId: string, courseId: string) {
  return prisma.progress.findMany({
    where: { userId, courseId, completed: true },
    select: { lessonId: true },
  });
}

export async function getCourseProgressSummary(userId: string, courseId: string) {
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { courseId, published: true } }),
    prisma.progress.count({ where: { userId, courseId, completed: true } }),
  ]);
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  return { totalLessons, completedLessons, remainingLessons: totalLessons - completedLessons, progressPercent };
}

/**
 * The full "mark lesson complete" flow from the spec, executed as a single
 * multi-document transaction (requires MongoDB to run as a replica set):
 * upsert Progress -> recalculate course progress from published-lesson
 * counts -> update Enrollment.progressPercent/status -> record the
 * LearningActivity entry -> notify the student the first time a course
 * is completed.
 */
export async function completeLessonProgress(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  minutesSpent: number;
}) {
  const { userId, courseId, lessonId, minutesSpent } = params;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
    const alreadyCompleted = existing?.completed ?? false;

    const progress = await tx.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        courseId,
        lessonId,
        completed: true,
        progressPercent: 100,
        completedAt: new Date(),
      },
      update: alreadyCompleted
        ? { progressPercent: 100 }
        : { completed: true, progressPercent: 100, completedAt: new Date() },
    });

    const totalLessons = await tx.lesson.count({ where: { courseId, published: true } });
    const completedLessons = await tx.progress.count({ where: { userId, courseId, completed: true } });
    const coursePercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
    const courseJustCompleted = coursePercent >= 100 && enrollment?.status !== EnrollmentStatus.COMPLETED;

    await tx.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progressPercent: coursePercent,
        lastAccessedAt: new Date(),
        status: coursePercent >= 100 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        ...(courseJustCompleted ? { completedAt: new Date() } : {}),
      },
    });

    if (!alreadyCompleted) {
      await tx.learningActivity.create({
        data: {
          user: { connect: { id: userId } },
          course: { connect: { id: courseId } },
          lesson: { connect: { id: lessonId } },
          type: ActivityType.LESSON_COMPLETED,
          minutesSpent,
        },
      });
    }

    if (courseJustCompleted) {
      const course = await tx.course.findUnique({ where: { id: courseId }, select: { title: true } });
      await tx.learningActivity.create({
        data: {
          user: { connect: { id: userId } },
          course: { connect: { id: courseId } },
          type: ActivityType.COURSE_COMPLETED,
          minutesSpent: 0,
        },
      });
      await tx.notification.create({
        data: {
          user: { connect: { id: userId } },
          title: "Course completed",
          message: `You completed "${course?.title ?? "your course"}". Great work!`,
          type: NotificationType.ACHIEVEMENT,
        },
      });
    }

    return { progress, totalLessons, completedLessons, coursePercent, courseJustCompleted };
  });
}

export async function updateLessonPosition(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  progressPercent: number;
  lastPosition: number;
}) {
  const { userId, courseId, lessonId } = params;
  const [progress] = await prisma.$transaction([
    prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        courseId,
        lessonId,
        progressPercent: params.progressPercent,
        lastPosition: params.lastPosition,
      },
      update: { progressPercent: params.progressPercent, lastPosition: params.lastPosition },
    }),
    prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { lastAccessedAt: new Date() },
    }),
  ]);
  return progress;
}

export function recordLessonStarted(userId: string, courseId: string, lessonId: string) {
  return prisma.learningActivity.create({
    data: {
      user: { connect: { id: userId } },
      course: { connect: { id: courseId } },
      lesson: { connect: { id: lessonId } },
      type: ActivityType.LESSON_STARTED,
      minutesSpent: 0,
    },
  });
}
