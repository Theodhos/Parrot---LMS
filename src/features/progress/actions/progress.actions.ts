"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { markLessonComplete } from "@/features/progress/services/progress.service";
import { AppError } from "@/lib/errors/app-error";

export interface MarkLessonCompleteResult {
  success: boolean;
  error?: string;
  data?: {
    lessonId: string;
    totalLessons: number;
    completedLessons: number;
    remainingLessons: number;
    courseProgressPercent: number;
    courseCompleted: boolean;
  };
}

/** Marks a lesson complete for the current student and refreshes the pages that show progress. */
export async function markLessonCompleteAction(
  courseId: string,
  lessonId: string,
): Promise<MarkLessonCompleteResult> {
  try {
    const user = await requireCurrentUser();
    const result = await markLessonComplete(user, courseId, lessonId);

    revalidatePath(`/learn/${courseId}/${lessonId}`);
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseId}`);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
