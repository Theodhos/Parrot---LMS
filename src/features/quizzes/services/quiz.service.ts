import "server-only";
import { prisma } from "@/lib/db/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireCourseManager, type SessionUser } from "@/lib/permissions";
import * as quizRepo from "@/features/quizzes/repositories/quiz.repository";
import { markLessonComplete } from "@/features/progress/services/progress.service";
import type { CreateQuizInput, SubmitQuizAttemptInput } from "@/features/quizzes/schemas/quiz.schema";

const PASSING_SCORE = 70;

async function requireManageableLesson(user: SessionUser, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { id: true, instructorId: true } } } } },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  requireCourseManager(user, lesson.module.course);
  return lesson;
}

export async function createQuiz(user: SessionUser, lessonId: string, input: CreateQuizInput) {
  await requireManageableLesson(user, lessonId);

  const existing = await quizRepo.findQuizByLesson(lessonId);
  if (existing) throw new ValidationError("This lesson already has a quiz");

  return prisma.quiz.create({
    data: {
      title: input.title,
      lesson: { connect: { id: lessonId } },
      questions: {
        create: input.questions.map((q, qIndex) => ({
          question: q.question,
          type: q.type,
          order: qIndex,
          answers: { create: q.answers.map((a, aIndex) => ({ answer: a.answer, isCorrect: a.isCorrect, order: aIndex })) },
        })),
      },
    },
    include: { questions: { include: { answers: true } } },
  });
}

export async function updateQuiz(user: SessionUser, lessonId: string, quizId: string, input: CreateQuizInput) {
  await requireManageableLesson(user, lessonId);
  const existing = await quizRepo.findQuizByLesson(lessonId);
  if (!existing || existing.id !== quizId) throw new NotFoundError("Quiz");

  return prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { quizId } });
    return tx.quiz.update({
      where: { id: quizId },
      data: {
        title: input.title,
        questions: {
          create: input.questions.map((q, qIndex) => ({
            question: q.question,
            type: q.type,
            order: qIndex,
            answers: {
              create: q.answers.map((a, aIndex) => ({ answer: a.answer, isCorrect: a.isCorrect, order: aIndex })),
            },
          })),
        },
      },
      include: { questions: { include: { answers: true } } },
    });
  });
}

/**
 * Returns the quiz shape safe to send to a student who is taking it --
 * `isCorrect` must never reach the client before submission, or the answer
 * key is trivially visible in the network tab.
 */
export async function getQuizForTaking(lessonId: string) {
  const quiz = await quizRepo.findQuizByLesson(lessonId);
  if (!quiz) throw new NotFoundError("Quiz");

  return {
    id: quiz.id,
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      order: q.order,
      answers: q.answers.map((a) => ({ id: a.id, answer: a.answer, order: a.order })),
    })),
  };
}

export async function submitQuizAttempt(user: SessionUser, courseId: string, quizId: string, input: SubmitQuizAttemptInput) {
  const quiz = await quizRepo.findQuizWithAnswerKey(quizId);
  if (!quiz) throw new NotFoundError("Quiz");
  if (quiz.lesson.courseId !== courseId) {
    throw new ValidationError("This quiz does not belong to the given course");
  }

  let correct = 0;
  for (const question of quiz.questions) {
    const correctAnswerIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id).sort();
    const selected = [...(input.answers[question.id] ?? [])].sort();
    const isCorrect =
      correctAnswerIds.length === selected.length && correctAnswerIds.every((id, i) => id === selected[i]);
    if (isCorrect) correct += 1;
  }

  const score = quiz.questions.length === 0 ? 0 : Math.round((correct / quiz.questions.length) * 100);

  const attempt = await quizRepo.createAttempt({ userId: user.id, quizId, score, answers: input.answers });

  let lessonProgress: Awaited<ReturnType<typeof markLessonComplete>> | null = null;
  if (score >= PASSING_SCORE) {
    lessonProgress = await markLessonComplete(user, courseId, quiz.lesson.id);
  }

  return { attempt, score, correctCount: correct, totalQuestions: quiz.questions.length, passed: score >= PASSING_SCORE, lessonProgress };
}

export function listMyAttempts(user: SessionUser, quizId: string) {
  return quizRepo.listAttemptsForUser(user.id, quizId);
}
