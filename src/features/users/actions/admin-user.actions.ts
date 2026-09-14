"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { updateUserRoleSchema } from "@/features/users/schemas/user.schema";
import { updateUserRole } from "@/features/users/services/user.service";

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
