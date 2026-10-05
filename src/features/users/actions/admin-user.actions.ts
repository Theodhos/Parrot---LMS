"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { createInstructorSchema, updateUserRoleSchema } from "@/features/users/schemas/user.schema";
import { createInstructor, updateUserRole } from "@/features/users/services/user.service";

export interface CreateInstructorResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createInstructorAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CreateInstructorResult> {
  try {
    const admin = await requireCurrentUser();
    const parsed = createInstructorSchema.parse(input);
    await createInstructor(admin, parsed);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: error.flatten().fieldErrors as Record<string, string[] | undefined>,
      };
    }
    if (error instanceof AppError) return { success: false, error: error.message };
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export interface UpdateUserRoleResult {
  success: boolean;
  error?: string;
  role?: Role;
}

export async function updateUserRoleAction(userId: string, role: Role): Promise<UpdateUserRoleResult> {
  try {
    const admin = await requireCurrentUser();
    const parsed = updateUserRoleSchema.parse({ role });
    const updated = await updateUserRole(admin, userId, parsed.role);
    revalidatePath("/admin/users");
    return { success: true, role: updated.role };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
