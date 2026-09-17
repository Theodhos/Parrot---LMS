import "server-only";
import { prisma } from "@/lib/db/client";
import { getStripe } from "@/lib/payments/stripe";
import { requestSiteUrl } from "@/lib/site-url";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/permissions";
import { CourseStatus } from "@/generated/prisma";
import * as enrollmentRepo from "@/features/enrollments/repositories/enrollment.repository";

/**
 * Creates a Stripe Checkout Session for a paid course and returns its URL.
 * The buyer must already be signed in to Parrot LMS -- their account id
 * travels in the session metadata, so the webhook (checkout.service's
 * counterpart in the route handler) knows exactly which account to grant
 * access to once payment succeeds. No separate "guest checkout" identity is
 * ever created: the credentials used to buy are the same ones used to log
 * back in and view the course.
 */
export async function createCourseCheckoutSession(user: SessionUser, courseId: string): Promise<string> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true, title: true, description: true, status: true, priceCents: true },
  });
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError("Course");
  }
  if (course.priceCents <= 0) {
    throw new ValidationError("This course is free -- enroll directly instead of checking out");
  }

  const existing = await enrollmentRepo.findEnrollment(user.id, course.id);
  if (existing) {
    throw new ConflictError("You are already enrolled in this course");
  }

  const stripe = getStripe();
  const courseUrl = `${await requestSiteUrl()}/courses/${course.slug}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: course.priceCents,
          product_data: {
            name: course.title,
            description: course.description.slice(0, 500),
          },
        },
        quantity: 1,
      },
    ],
    metadata: { courseId: course.id, userId: user.id },
    success_url: `${courseUrl}?checkout=success`,
    cancel_url: `${courseUrl}?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL");
  }
  return session.url;
}
