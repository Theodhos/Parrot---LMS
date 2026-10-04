import { z } from "zod";

const optionalString = z.string().trim().optional();

/** The key/value pairs configured under "Custom Data" on the GoHighLevel workflow's Webhook action. */
const ghlCustomDataSchema = z.object({
  secret: optionalString,
  // Still accepted so existing workflows keep working, but no longer read:
  // every purchase unlocks every published course.
  course_slug: optionalString,
  email: optionalString,
  name: optionalString,
  // GHL transaction/payment/order id (e.g. the {{payment.id}} or {{order.id}}
  // merge tag). Strongly recommended: it is the idempotency key that makes a
  // redelivered webhook a no-op instead of a second provisioning.
  transaction_id: optionalString,
  // Defense in depth: when sent (e.g. {{payment.status}}), anything that isn't
  // clearly a successful payment is rejected and provisions nothing.
  payment_status: optionalString,
  product_id: optionalString,
  // Informational echo of the charge, accepted as "49.99" or 49.99.
  amount: z.union([z.string(), z.number()]).optional(),
  currency: optionalString,
});

/**
 * Body of the GoHighLevel workflow Webhook action fired after a paid order.
 * GoHighLevel sends the contact's standard fields at the top level and the
 * action's own key/value pairs under `customData`; the same keys are also
 * accepted at the top level for a "Custom Webhook" action with a raw JSON body.
 */
export const ghlPurchaseWebhookSchema = ghlCustomDataSchema.extend({
  contact_id: optionalString,
  full_name: optionalString,
  first_name: optionalString,
  last_name: optionalString,
  location: z.object({ id: optionalString }).optional(),
  customData: ghlCustomDataSchema.optional(),
});
export type GhlPurchaseWebhookPayload = z.infer<typeof ghlPurchaseWebhookSchema>;

export const coursePurchaseSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(160).optional(),
  contactId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  transactionId: z.string().min(1).optional(),
  paymentStatus: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).max(8).optional(),
});
export type CoursePurchase = z.infer<typeof coursePurchaseSchema>;

/**
 * What Payment.courseSlugs records for a purchase: every purchase unlocks
 * every published course, including ones published later.
 */
export const ALL_COURSES = "*";

/** "49.99" / 49.99 -> 4999; anything unparseable is dropped rather than failing the webhook. */
function toAmountCents(amount: string | number | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const parsed = typeof amount === "number" ? amount : Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

/** Flattens the raw GoHighLevel body into the purchase the access service works with. */
export function toCoursePurchase(payload: GhlPurchaseWebhookPayload): CoursePurchase {
  const custom = payload.customData ?? {};
  const fullName =
    payload.full_name || [payload.first_name, payload.last_name].filter(Boolean).join(" ");

  return coursePurchaseSchema.parse({
    email: custom.email || payload.email,
    name: custom.name || payload.name || fullName || undefined,
    contactId: payload.contact_id || undefined,
    locationId: payload.location?.id || undefined,
    transactionId: custom.transaction_id || payload.transaction_id || undefined,
    paymentStatus: custom.payment_status || payload.payment_status || undefined,
    productId: custom.product_id || payload.product_id || undefined,
    amountCents: toAmountCents(custom.amount ?? payload.amount),
    currency: custom.currency || payload.currency || undefined,
  });
}

export const courseRefundSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  transactionId: z.string().min(1).optional(),
});
export type CourseRefund = z.infer<typeof courseRefundSchema>;

/** Flattens a GoHighLevel refund/chargeback workflow body. Same shape as the purchase webhook. */
export function toCourseRefund(payload: GhlPurchaseWebhookPayload): CourseRefund {
  const custom = payload.customData ?? {};
  return courseRefundSchema.parse({
    email: custom.email || payload.email || undefined,
    transactionId: custom.transaction_id || payload.transaction_id || undefined,
  });
}
