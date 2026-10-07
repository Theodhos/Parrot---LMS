"use server";

import { AuthError } from "next-auth";
import { z, ZodError } from "zod";
import { signIn } from "@/lib/auth/auth";
import { registerSchema, usernameSchema } from "@/features/auth/schemas/auth.schema";
import {
  activateAccountFromToken,
  claimAccountAfterCheckout,
  claimInvitedAccount,
  getCheckoutEmailStatus,
  getInviteEmailStatus,
  type SetupEmailStatus,
} from "@/features/auth/services/activation.service";
import { AppError } from "@/lib/errors/app-error";

const activateSchema = z.object({
  token: z.string().min(1),
  username: usernameSchema,
  password: registerSchema.shape.password,
});

export interface ActivateActionState {
  error: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
}

const claimSchema = z.object({
  email: registerSchema.shape.email,
  username: usernameSchema,
  password: registerSchema.shape.password,
});

export interface ClaimActionState extends ActivateActionState {
  /** Nothing is on record for this email yet -- the webhook may still be on its way; retry shortly. */
  notOnRecord?: boolean;
}

/**
 * The post-checkout page verifies the email as soon as it is typed, so a
 * buyer learns whether it matches their purchase before choosing a password.
 */
export async function checkCheckoutEmailAction(email: string): Promise<SetupEmailStatus | "invalid"> {
  const parsed = claimSchema.shape.email.safeParse(email);
  if (!parsed.success) return "invalid";
  return getCheckoutEmailStatus(parsed.data);
}

/**
 * The post-checkout page: sets the username and password of the account a
 * just-completed purchase created, then signs the buyer straight in.
 */
export async function claimAccountAfterCheckoutAction(formData: FormData): Promise<ClaimActionState> {
  let email: string;
  try {
    const parsed = claimSchema.parse({
      email: formData.get("email"),
      username: formData.get("username"),
      password: formData.get("password"),
    });
    const result = await claimAccountAfterCheckout(parsed.email, parsed.username, parsed.password);
    if (result.status === "not-on-record") {
      return { error: null, notOnRecord: true };
    }
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
    // A brand-new member sees the one-time offer page first; its "No thanks"
    // leads on to the dashboard. A checkout that redirects to
    // /welcome?next=course skips the offer and opens the course right away.
    // Only these two destinations exist -- `next` is never used as a URL.
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: formData.get("next") === "course" ? "/dashboard" : "/offer",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created -- please sign in." };
    }
    throw error;
  }
}

const invitePasswordSchema = z.object({
  email: registerSchema.shape.email,
  password: registerSchema.shape.password,
});

/** The create-password page verifies the email as soon as it is typed, like the post-checkout page. */
export async function checkInviteEmailAction(email: string): Promise<SetupEmailStatus | "invalid"> {
  const parsed = invitePasswordSchema.shape.email.safeParse(email);
  if (!parsed.success) return "invalid";
  return getInviteEmailStatus(parsed.data);
}

/**
 * The create-password page: sets the password of the account GoHighLevel
 * registered as a free member (its email and username are already stored),
 * then signs the member in on the free courses page.
 */
export async function claimInvitedAccountAction(formData: FormData): Promise<ClaimActionState> {
  let email: string;
  try {
    const parsed = invitePasswordSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    const result = await claimInvitedAccount(parsed.email, parsed.password);
    if (result.status === "not-on-record") {
      return { error: null, notOnRecord: true };
    }
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
    // /create-password opens the free courses; /set-password (next=upsell)
    // goes on to the funnel's offer page. Only these two destinations
    // exist -- `next` is never used as a URL.
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: formData.get("next") === "upsell" ? "/login-upsell-thank-you" : "/free-courses",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Password created -- please sign in." };
    }
    throw error;
  }
}

/** Sets the account's username and password from a valid activation token, then signs the buyer straight in. */
export async function activateAccountAction(
  _prevState: ActivateActionState,
  formData: FormData,
): Promise<ActivateActionState> {
  let email: string;
  try {
    const parsed = activateSchema.parse({
      token: formData.get("token"),
      username: formData.get("username"),
      password: formData.get("password"),
    });
    const result = await activateAccountFromToken(parsed.token, parsed.username, parsed.password);
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
      return { error: "Account created -- please sign in." };
    }
    throw error;
  }
}
