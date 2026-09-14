"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { submitQuizAttempt } from "@/features/quizzes/services/quiz.service";
import { submitQuizAttemptSchema } from "@/features/quizzes/schemas/quiz.schema";
import { AppError } from "@/lib/errors/app-error";

export interface SubmitQuizActionResult {
  success: boolean;
  error?: string;
  data?: {
    score: number;
    correctCount: number;
    totalQuestions: number;
    passed: boolean;
    courseCompleted: boolean;
    courseProgressPercent: number | null;
  };
}

/**
 * Grades a quiz attempt server-side and, on a passing score, the underlying
 * service auto-completes the lesson -- this action never computes pass/fail
 * or percentages itself, it only reshapes the service's return value.
 */
export async function submitQuizAttemptAction(
  courseId: string,
  lessonId: string,
  quizId: string,
  answers: Record<string, string[]>,
): Promise<SubmitQuizActionResult> {
  try {
    const user = await requireCurrentUser();
    const input = submitQuizAttemptSchema.parse({ answers });
    const result = await submitQuizAttempt(user, courseId, quizId, input);

    revalidatePath(`/learn/${courseId}/${lessonId}`);
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/courses");

    return {
      success: true,
      data: {
        score: result.score,
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        passed: result.passed,
        courseCompleted: result.lessonProgress?.courseCompleted ?? false,
        courseProgressPercent: result.lessonProgress?.courseProgressPercent ?? null,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: "Please answer every question before submitting." };
    }
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
