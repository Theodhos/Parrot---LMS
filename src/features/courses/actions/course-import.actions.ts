"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { validateCourseImport } from "@/features/courses/import/course-import";
import { importCourses, type CourseImportOutcome } from "@/features/courses/services/course-import.service";

export interface CourseImportActionResult {
  success: boolean;
  outcome?: CourseImportOutcome;
  errors?: string[];
}

/**
 * Bulk-creates courses from an import file. The browser sends the courses it
 * parsed for the preview; they are validated again here from scratch.
 */
export async function importCoursesAction(rawCourses: unknown): Promise<CourseImportActionResult> {
  try {
    const user = await requireCurrentUser();
    const { courses, errors } = validateCourseImport(rawCourses);
    if (errors.length > 0) return { success: false, errors };

    const outcome = await importCourses(user, courses);
    revalidatePath("/admin/courses");
    return { success: !outcome.failedAt, outcome };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof AppError ? error.message : "Something went wrong. Please try again."],
    };
  }
}
