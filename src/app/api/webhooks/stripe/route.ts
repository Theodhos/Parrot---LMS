import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { ensureEnrollment } from "@/features/enrollments/services/enrollment.service";
import type Stripe from "stripe";

/**
 * Grants course access once Stripe confirms payment. This is the ONLY place
 * that creates an Enrollment for a paid course -- never trust a client
 * redirect back to `success_url` as proof of payment, only a verified
 * webhook event. The buyer's account id travels in `metadata.userId` (set
 * when the Checkout Session was created), so access lands on the same
 * account they log in with.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[webhooks:stripe] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { courseId, userId } = session.metadata ?? {};
    if (session.payment_status === "paid" && courseId && userId) {
      await ensureEnrollment(userId, courseId);
    } else {
      console.warn("[webhooks:stripe] checkout.session.completed missing metadata or unpaid", {
        id: session.id,
        paymentStatus: session.payment_status,
      });
    }
  }

  return NextResponse.json({ received: true });
}
