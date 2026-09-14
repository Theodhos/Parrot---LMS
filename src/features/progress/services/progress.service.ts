import "server-only";
import { prisma } from "@/lib/db/client";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";
import * as progressRepo from "@/features/progress/repositories/progress.repository";
import type { UpdateLessonPositionInput } from "@/features/progress/schemas/progress.schema";

/**
 * Steps 1-3 of the spec's progress-completion flow: authenticated user is
 * validated by the caller (requireCurrentUser); here we validate enrollment
 * and that the lesson actually belongs to the given course. Never trust the
 * client-supplied courseId/lessonId pairing beyond this check.
 */
async function requireEnrollmentAndLesson(userId: string, courseId: string, lessonId: string) {
  const [enrollment, lesson] = await Promise.all([
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, duration: true, published: true },
    }),
  ]);

  if (!enrollment) {
    throw new ForbiddenError("You must be enrolled in this course to track progress");
  }
  if (!lesson || !lesson.published) {
    throw new NotFoundError("Lesson");
  }
  if (lesson.courseId !== courseId) {
    throw new ValidationError("This lesson does not belong to the given course");
  }

  return { enrollment, lesson };
}

/** Marks a lesson complete and atomically recalculates course-level progress server-side. */
export async function markLessonComplete(user: SessionUser, courseId: string, lessonId: string) {
  const { lesson } = await requireEnrollmentAndLesson(user.id, courseId, lessonId);

  const result = await progressRepo.completeLessonProgress({
    userId: user.id,
    courseId,
    lessonId,
    minutesSpent: Math.max(0, Math.round((lesson.duration ?? 0) / 60)),
  });

  return {
    lessonId,
    completed: true,
    totalLessons: result.totalLessons,
    completedLessons: result.completedLessons,
    remainingLessons: result.totalLessons - result.completedLessons,
    courseProgressPercent: result.coursePercent,
    courseCompleted: result.coursePercent >= 100,
  };
}

/** Lightweight position tracking (e.g. video scrubbing) — does not affect course-level progress. */
export async function updateLessonPosition(
  user: SessionUser,
  courseId: string,
  lessonId: string,
  input: UpdateLessonPositionInput,
) {
  await requireEnrollmentAndLesson(user.id, courseId, lessonId);
  await progressRepo.recordLessonStarted(user.id, courseId, lessonId);

  const progress = await progressRepo.updateLessonPosition({
    userId: user.id,
    courseId,
    lessonId,
    progressPercent: input.progressPercent,
    lastPosition: input.lastPosition,
  });

  return { lessonId, progressPercent: progress.progressPercent, lastPosition: progress.lastPosition };
}

export async function getCourseProgress(user: SessionUser, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (!enrollment) throw new ForbiddenError("You are not enrolled in this course");
  return progressRepo.getCourseProgressSummary(user.id, courseId);
}

export async function getLessonProgress(user: SessionUser, lessonId: string) {
  return progressRepo.findProgress(user.id, lessonId);
}
