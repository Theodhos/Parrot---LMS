"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";
import { AppError } from "@/lib/errors/app-error";

export interface EnrollActionResult {
  success: boolean;
  error?: string;
}

/** Free, self-serve enrollment: any signed-in user can start any published course. */
export async function enrollInCourseAction(courseId: string): Promise<EnrollActionResult> {
  try {
    const user = await requireCurrentUser();
    await enrollInCourse(user, courseId);

    revalidatePath("/dashboard");
    revalidatePath("/courses");

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
