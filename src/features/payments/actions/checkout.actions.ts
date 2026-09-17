"use server";

import { requireCurrentUser } from "@/lib/auth/session";
import { createCourseCheckoutSession } from "@/features/payments/services/checkout.service";
import { AppError } from "@/lib/errors/app-error";

export interface CheckoutActionResult {
  success: boolean;
  url?: string;
  error?: string;
}

/** Starts a Stripe Checkout for a paid course. The client redirects to `url` on success. */
export async function startCourseCheckoutAction(courseId: string): Promise<CheckoutActionResult> {
  try {
    const user = await requireCurrentUser();
    const url = await createCourseCheckoutSession(user, courseId);
    return { success: true, url };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Could not start checkout. Please try again." };
  }
}
