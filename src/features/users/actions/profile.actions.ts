"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { updateProfile } from "@/features/users/services/user.service";
import { updateProfileSchema } from "@/features/users/schemas/user.schema";
import { AppError } from "@/lib/errors/app-error";

export interface UpdateProfileActionState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success: boolean;
}

export async function updateProfileAction(
  _prevState: UpdateProfileActionState,
  formData: FormData,
): Promise<UpdateProfileActionState> {
  try {
    const user = await requireCurrentUser();
    const input = updateProfileSchema.parse({
      name: formData.get("name")?.toString(),
      bio: formData.get("bio")?.toString(),
      image: formData.get("image")?.toString(),
    });
    await updateProfile(user, input);
    revalidatePath("/profile");
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: "Please fix the errors below.", fieldErrors: error.flatten().fieldErrors, success: false };
    }
    if (error instanceof AppError) {
      return { error: error.message, success: false };
    }
    return { error: "Something went wrong. Please try again.", success: false };
  }
}
