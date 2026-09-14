"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireCourseManager } from "@/lib/permissions";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { QuestionType } from "@/generated/prisma";
import { createQuizSchema } from "@/features/quizzes/schemas/quiz.schema";
import { createQuiz, updateQuiz } from "@/features/quizzes/services/quiz.service";

export interface QuizAnswerRecord {
  id: string;
  answer: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestionRecord {
  id: string;
  question: string;
  type: QuestionType;
  order: number;
  answers: QuizAnswerRecord[];
}

export interface QuizRecord {
  id: string;
  title: string;
  questions: QuizQuestionRecord[];
}

export interface QuizActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  quiz?: QuizRecord | null;
}

function fromError(error: unknown): QuizActionResult {
  if (error instanceof ZodError) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: error.flatten().fieldErrors as Record<string, string[] | undefined>,
    };
  }
  if (error instanceof AppError) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Something went wrong. Please try again." };
}

/**
 * quiz.service.ts has no "read the answer key for editing" helper (its only read path,
 * getQuizForTaking, strips isCorrect on purpose for students) and is off-limits to modify, so this
 * mirrors its `requireManageableLesson` permission check directly against Prisma (read-only).
 */
async function requireManageableLesson(lessonId: string) {
  const user = await requireCurrentUser();
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { id: true, instructorId: true } } } } },
  });
  if (!lesson) throw new NotFoundError("Lesson");
  requireCourseManager(user, lesson.module.course);
  return { user, lesson };
}

export async function getQuizForLessonAction(lessonId: string): Promise<QuizActionResult> {
  try {
    await requireManageableLesson(lessonId);
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { order: "asc" }, include: { answers: { orderBy: { order: "asc" } } } } },
    });
    return { success: true, quiz };
  } catch (error) {
    return fromError(error);
  }
}

export interface QuizAnswerInput {
  answer: string;
  isCorrect: boolean;
}

export interface QuizQuestionInput {
  question: string;
  type: QuestionType;
  answers: QuizAnswerInput[];
}

export interface QuizInput {
  title: string;
  questions: QuizQuestionInput[];
}

/** Creates the quiz if the lesson doesn't have one yet, otherwise replaces it -- one entry point for the builder UI. */
export async function saveQuizAction(courseId: string, lessonId: string, input: QuizInput): Promise<QuizActionResult> {
  try {
    const parsed = createQuizSchema.parse(input);
    const { user } = await requireManageableLesson(lessonId);
    const existing = await prisma.quiz.findUnique({ where: { lessonId }, select: { id: true } });
    const saved = existing
      ? await updateQuiz(user, lessonId, existing.id, parsed)
      : await createQuiz(user, lessonId, parsed);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, quiz: saved };
  } catch (error) {
    return fromError(error);
  }
}
