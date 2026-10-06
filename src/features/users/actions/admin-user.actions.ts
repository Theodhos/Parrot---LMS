"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { createInstructorSchema, updateUserRoleSchema } from "@/features/users/schemas/user.schema";
import { createInstructor, updateUserRole } from "@/features/users/services/user.service";
import {
  getUserCourseAccess,
  setUserCourseAccess,
  type UserCourseAccess,
} from "@/features/access/services/course-access.service";

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

const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i);

export type UserCourseAccessResult =
  | { success: true; access: UserCourseAccess }
  | { success: false; error: string };

/** Loads which published courses a member currently has, for the "Courses" dialog on the users page. */
export async function getUserCourseAccessAction(userId: string): Promise<UserCourseAccessResult> {
  try {
    const admin = await requireCurrentUser();
    return { success: true, access: await getUserCourseAccess(admin, objectIdSchema.parse(userId)) };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** Assigns a course to a member or takes it away (admin only -- the service enforces it). */
export async function setUserCourseAccessAction(
  userId: string,
  courseId: string,
  assigned: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireCurrentUser();
    await setUserCourseAccess(admin, objectIdSchema.parse(userId), objectIdSchema.parse(courseId), assigned === true);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
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
