import "server-only";
import { prisma } from "@/lib/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import { canManageCourse, type SessionUser } from "@/lib/permissions";
import * as progressRepo from "@/features/progress/repositories/progress.repository";
import type { LearnLessonViewDTO } from "@/features/lessons/types/lesson.types";

/**
 * Builds the entire "learn" screen in one pass: sidebar (modules/lessons with
 * completion state), the current lesson's content, its quiz (if any),
 * prev/next navigation, and the course progress summary. A student must be
 * enrolled; a course manager may preview without enrolling.
 */
export async function getLearnLessonView(
  user: SessionUser,
  courseId: string,
  lessonId: string,
): Promise<LearnLessonViewDTO> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) throw new NotFoundError("Course");

  const isManager = canManageCourse(user, course);
  if (!isManager) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) throw new ForbiddenError("You must be enrolled in this course to view its lessons");
  }

  const visibleModules = course.modules
    .map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.published || isManager) }))
    .filter((m) => m.lessons.length > 0 || isManager);

  const currentLesson = visibleModules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))).find(
    (l) => l.id === lessonId,
  );
  if (!currentLesson) throw new NotFoundError("Lesson");

  const [progressRows, quiz, progressSummary] = await Promise.all([
    progressRepo.listProgressForCourse(user.id, courseId),
    prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } } },
    }),
    progressRepo.getCourseProgressSummary(user.id, courseId),
  ]);
  const completedIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));
  const currentProgressRow = progressRows.find((p) => p.lessonId === lessonId) ?? null;

  const orderedLessonIds = visibleModules.flatMap((m) => m.lessons.map((l) => l.id));
  const currentIndex = orderedLessonIds.indexOf(lessonId);

  if (!isManager) {
    await progressRepo.recordLessonStarted(user.id, courseId, lessonId);
  }

  return {
    course: { id: course.id, title: course.title, slug: course.slug },
    lesson: {
      id: currentLesson.id,
      title: currentLesson.title,
      description: currentLesson.description,
      content: currentLesson.content,
      videoUrl: currentLesson.videoUrl,
      duration: currentLesson.duration ?? 0,
      type: currentLesson.type,
      moduleId: currentLesson.moduleId,
      moduleTitle: currentLesson.moduleTitle,
    },
    quiz: quiz
      ? {
          id: quiz.id,
          title: quiz.title,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            order: q.order,
            answers: q.answers.map((a) => ({ id: a.id, answer: a.answer })),
          })),
        }
      : null,
    modules: visibleModules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        type: l.type,
        order: l.order,
        duration: l.duration ?? 0,
        completed: completedIds.has(l.id),
        current: l.id === lessonId,
      })),
    })),
    progress: {
      ...progressSummary,
      lessonCompleted: currentProgressRow?.completed ?? false,
      lessonProgressPercent: currentProgressRow?.progressPercent ?? 0,
      lastPosition: currentProgressRow?.lastPosition ?? 0,
    },
    navigation: {
      previousLessonId: currentIndex > 0 ? (orderedLessonIds[currentIndex - 1] ?? null) : null,
      nextLessonId:
        currentIndex >= 0 && currentIndex < orderedLessonIds.length - 1
          ? (orderedLessonIds[currentIndex + 1] ?? null)
          : null,
    },
  };
}
