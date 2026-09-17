"use server";

import { AuthError } from "next-auth";
import { z, ZodError } from "zod";
import { signIn } from "@/lib/auth/auth";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { setPasswordFromToken } from "@/features/auth/services/activation.service";
import { AppError } from "@/lib/errors/app-error";

const activateSchema = z.object({
  token: z.string().min(1),
  password: registerSchema.shape.password,
});

export interface ActivateActionState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Sets the account's password from a valid activation token, then signs the buyer straight in. */
export async function activateAccountAction(
  _prevState: ActivateActionState,
  formData: FormData,
): Promise<ActivateActionState> {
  let email: string;
  try {
    const parsed = activateSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });
    const result = await setPasswordFromToken(parsed.token, parsed.password);
    email = result.email;
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: "Please fix the errors below.", fieldErrors: error.flatten().fieldErrors };
    }
    if (error instanceof AppError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return { error: null };
  } catch (error) {
    // signIn() redirects internally on success by throwing a special
    // Next.js redirect error -- it must propagate, not be swallowed here.
    if (error instanceof AuthError) {
      return { error: "Password saved -- please sign in." };
    }
    throw error;
  }
}
