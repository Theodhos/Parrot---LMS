"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireCourseManager } from "@/lib/permissions";
import { AppError, NotFoundError } from "@/lib/errors/app-error";
import { LessonType } from "@/generated/prisma";
import { createLessonSchema, updateLessonSchema } from "@/features/lessons/schemas/lesson.schema";
import { createLesson, deleteLesson, updateLesson } from "@/features/lessons/services/lesson.service";

export interface LessonRecord {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  duration: number | null;
  order: number;
  type: LessonType;
  published: boolean;
}

export interface LessonActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  lesson?: LessonRecord;
}

function fromError(error: unknown): LessonActionResult {
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

export interface LessonInput {
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  type?: LessonType;
  published?: boolean;
}

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  input: LessonInput,
): Promise<LessonActionResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = createLessonSchema.parse(input);
    const created = await createLesson(user, courseId, moduleId, parsed);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, lesson: created };
  } catch (error) {
    return fromError(error);
  }
}

export async function updateLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  input: Partial<LessonInput>,
): Promise<LessonActionResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = updateLessonSchema.parse(input);
    const updated = await updateLesson(user, courseId, moduleId, lessonId, parsed);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, lesson: updated };
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonActionResult> {
  try {
    const user = await requireCurrentUser();
    await deleteLesson(user, courseId, moduleId, lessonId);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    return fromError(error);
  }
}

/**
 * The course editor's tree view only carries the lightweight LessonOutlineDTO (no content/videoUrl/
 * description). This reads the full record for the lesson-edit dialog. lesson.service.ts has no
 * such read helper and is off-limits to modify, so this mirrors its `requireManageableModule`
 * permission check directly against Prisma (read-only). Errors are returned rather than thrown so
 * the client gets the real message instead of Next's production redaction of thrown Server Action
 * errors.
 */
export async function getLessonForManageAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
): Promise<LessonActionResult> {
  try {
    const user = await requireCurrentUser();
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: { select: { id: true, instructorId: true } } } } },
    });
    if (!lesson || lesson.moduleId !== moduleId || lesson.courseId !== courseId) {
      throw new NotFoundError("Lesson");
    }
    requireCourseManager(user, lesson.module.course);
    return { success: true, lesson };
  } catch (error) {
    return fromError(error);
  }
}
