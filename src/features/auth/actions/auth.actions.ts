"use server";

import { ZodError } from "zod";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { registerUser } from "@/features/auth/services/auth.service";
import { AppError } from "@/lib/errors/app-error";

export interface RegisterActionState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  success: boolean;
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  try {
    const input = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    await registerUser(input);
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
