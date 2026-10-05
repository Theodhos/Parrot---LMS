"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { categoryIdSchema, createCategorySchema } from "@/features/courses/schemas/course.schema";
import { createCategory, deleteCategory, renameCategory } from "@/features/courses/services/course.service";

export interface CreateCategoryResult {
  success: boolean;
  error?: string;
  category?: { id: string; name: string };
}

function fromError(error: unknown): CreateCategoryResult {
  if (error instanceof ZodError) {
    return { success: false, error: error.issues[0]?.message ?? "Enter a valid category name." };
  }
  if (error instanceof AppError) return { success: false, error: error.message };
  return { success: false, error: "Something went wrong. Please try again." };
}

/** Category names show on the admin course pages and on the student catalogue and its filter. */
function revalidateCategoryViews() {
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/courses", "layout");
}

export async function createCategoryAction(name: string): Promise<CreateCategoryResult> {
  try {
    const user = await requireCurrentUser();
    const parsed = createCategorySchema.parse({ name });
    const created = await createCategory(user, parsed);
    revalidateCategoryViews();
    return { success: true, category: { id: created.id, name: created.name } };
  } catch (error) {
    return fromError(error);
  }
}

export async function renameCategoryAction(categoryId: string, name: string): Promise<CreateCategoryResult> {
  try {
    const user = await requireCurrentUser();
    const id = categoryIdSchema.parse(categoryId);
    const parsed = createCategorySchema.parse({ name });
    const updated = await renameCategory(user, id, parsed);
    revalidateCategoryViews();
    return { success: true, category: { id: updated.id, name: updated.name } };
  } catch (error) {
    return fromError(error);
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<CreateCategoryResult> {
  try {
    const user = await requireCurrentUser();
    await deleteCategory(user, categoryIdSchema.parse(categoryId));
    revalidateCategoryViews();
    return { success: true };
  } catch (error) {
    return fromError(error);
  }
}
