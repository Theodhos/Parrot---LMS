"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { CourseStatus } from "@/generated/prisma";
import {
  createCourseSchema,
  updateCourseSchema,
  updateCourseStatusSchema,
} from "@/features/courses/schemas/course.schema";
import {
  createCourse,
  deleteCourse,
  updateCourse,
  updateCourseStatus,
} from "@/features/courses/services/course.service";

export interface CourseFormState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success: boolean;
}

export interface SimpleActionResult {
  success: boolean;
  error?: string;
}

function fieldErrorsFrom(error: ZodError): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors as Record<string, string[] | undefined>;
}

function courseFormInput(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    thumbnail: formData.get("thumbnail") || "",
    categoryId: formData.get("categoryId") || undefined,
    level: formData.get("level") || undefined,
    price: formData.get("price") || undefined,
    ghlCheckoutUrl: formData.get("ghlCheckoutUrl") ?? undefined,
  };
}

export async function createCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  let courseId: string;
  try {
    const user = await requireCurrentUser();
    const input = createCourseSchema.parse(courseFormInput(formData));
    const course = await createCourse(user, input);
    courseId = course.id;
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(error), success: false };
    }
    if (error instanceof AppError) {
      return { error: error.message, success: false };
    }
    return { error: "Something went wrong. Please try again.", success: false };
  }
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${courseId}`);
}

export async function updateCourseAction(
  courseId: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  try {
    const user = await requireCurrentUser();
    const input = updateCourseSchema.parse(courseFormInput(formData));
    await updateCourse(user, courseId, input);
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(error), success: false };
    }
    if (error instanceof AppError) {
      return { error: error.message, success: false };
    }
    return { error: "Something went wrong. Please try again.", success: false };
  }
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
  return { error: null, success: true };
}

export async function updateCourseStatusAction(
  courseId: string,
  status: CourseStatus,
): Promise<SimpleActionResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = updateCourseStatusSchema.parse({ status });
    await updateCourseStatus(user, courseId, parsed.status);
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    return { success: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/admin/courses");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteCourseAction(courseId: string): Promise<SimpleActionResult> {
  try {
    const user = await requireCurrentUser();
    await deleteCourse(user, courseId);
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    return { success: false, error: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin/courses");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
