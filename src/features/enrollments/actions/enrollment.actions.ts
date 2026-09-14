"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";
import { AppError } from "@/lib/errors/app-error";

/**
 * Enrolls the current student in a course, then sends them straight into the
 * first lesson. Expects hidden form fields `courseId`, `slug`, and
 * `firstLessonId` (the latter may be empty if the course has no lessons yet).
 *
 * Errors (e.g. already enrolled) redirect back to the course detail page
 * with a query param the page can surface as an alert, rather than throwing
 * into an error boundary.
 */
export async function enrollInCourseAction(formData: FormData): Promise<void> {
  const user = await requireCurrentUser();

  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const firstLessonId = String(formData.get("firstLessonId") ?? "");

  try {
    await enrollInCourse(user, courseId);
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/courses/${slug}?enrollError=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/courses/${slug}`);
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");

  if (firstLessonId) {
    redirect(`/learn/${courseId}/${firstLessonId}`);
  }
  redirect(`/courses/${slug}`);
}
