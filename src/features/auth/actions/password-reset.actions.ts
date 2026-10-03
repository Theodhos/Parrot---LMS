"use server";

import { AuthError } from "next-auth";
import { z, ZodError } from "zod";
import { signIn } from "@/lib/auth/auth";
import { requestSiteUrl } from "@/lib/site-url";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { resetPasswordFromToken } from "@/features/auth/services/activation.service";
import { requestPasswordReset } from "@/features/auth/services/password-reset.service";
import { AppError } from "@/lib/errors/app-error";

export interface ForgotPasswordActionState {
  error: string | null;
  sent: boolean;
}

/** Always reports "sent" for a well-formed request -- never reveals whether the account exists. */
export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const identifier = String(formData.get("identifier") || "").trim();
  if (!identifier || identifier.length > 254) {
    return { error: "Enter your email or username.", sent: false };
  }

  try {
    await requestPasswordReset(identifier, await requestSiteUrl());
  } catch (error) {
    console.error(`[auth] password reset request failed: ${error instanceof Error ? error.message : error}`);
  }
  return { error: null, sent: true };
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: registerSchema.shape.password,
});

export interface ResetPasswordActionState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Sets the new password from a valid reset token, then signs the user straight in. */
export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  let email: string;
  try {
    const parsed = resetSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
    });
    if (parsed.password !== formData.get("confirmPassword")) {
      return { error: "Please fix the errors below.", fieldErrors: { confirmPassword: ["Passwords do not match"] } };
    }
    const result = await resetPasswordFromToken(parsed.token, parsed.password);
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
      return { error: "Password changed -- please sign in." };
    }
    throw error;
  }
}
