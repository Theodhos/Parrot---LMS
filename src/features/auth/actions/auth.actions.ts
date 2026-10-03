"use server";

import { AuthError } from "next-auth";
import { ZodError } from "zod";
import { signIn } from "@/lib/auth/auth";
import { Role } from "@/generated/prisma";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { findUserByLogin, registerUser } from "@/features/auth/services/auth.service";
import { AppError } from "@/lib/errors/app-error";

export interface LoginActionState {
  error: string | null;
}

/**
 * Server-side signIn (not next-auth/react's client-side signIn). This
 * matters: the client-side signIn() internally does a GET /api/auth/csrf
 * then a POST, and under fast automated form submits (Playwright, or just a
 * quick double-click) those two requests can race, occasionally producing a
 * MissingCSRF error even with correct credentials. Calling the server-side
 * signIn() from a Server Action does the whole exchange in one server-side
 * call with no client-side race to have.
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your email or username and your password." };
  }

  // An explicit callbackUrl (e.g. redirected here from a protected route) is
  // always honored. Otherwise, land the user on the dashboard that matches
  // their role -- admins/instructors go straight to the admin panel.
  const explicitCallbackUrl = String(formData.get("callbackUrl") || "").trim();
  let callbackUrl = explicitCallbackUrl;
  if (!callbackUrl) {
    const existingUser = await findUserByLogin(parsed.data.email);
    callbackUrl =
      existingUser && (existingUser.role === Role.ADMIN || existingUser.role === Role.INSTRUCTOR)
        ? "/admin/dashboard"
        : "/dashboard";
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
    return { error: null };
  } catch (error) {
    // signIn() redirects internally on success by throwing a special
    // Next.js redirect error -- it must propagate, not be swallowed here.
    if (error instanceof AuthError) {
      return { error: "Invalid email/username or password." };
    }
    throw error;
  }
}

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
