"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { createModuleSchema, updateModuleSchema } from "@/features/modules/schemas/module.schema";
import { createModule, deleteModule, updateModule } from "@/features/modules/services/module.service";

export interface ModuleRecord {
  id: string;
  title: string;
  description: string | null;
  order: number;
  courseId: string;
}

export interface ModuleActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  module?: ModuleRecord;
}

function fromError(error: unknown): ModuleActionResult {
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

export async function createModuleAction(
  courseId: string,
  input: { title: string; description?: string },
): Promise<ModuleActionResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = createModuleSchema.parse(input);
    const created = await createModule(user, courseId, parsed);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, module: created };
  } catch (error) {
    return fromError(error);
  }
}

export async function updateModuleAction(
  courseId: string,
  moduleId: string,
  input: { title?: string; description?: string },
): Promise<ModuleActionResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = updateModuleSchema.parse(input);
    const updated = await updateModule(user, courseId, moduleId, parsed);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, module: updated };
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteModuleAction(courseId: string, moduleId: string): Promise<ModuleActionResult> {
  try {
    const user = await requireCurrentUser();
    await deleteModule(user, courseId, moduleId);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    return fromError(error);
  }
}
