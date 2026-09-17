import { z } from "zod";

export const wooCommerceWebhookSchema = z.object({
  event: z.enum(["access.granted", "access.revoked"]),
  wordpressUserId: z.number().int().positive(),
  courseId: z.string().min(1), // this is the course SLUG as sent by WordPress
  productId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  status: z.string(),
  timestamp: z.number().int(),
});
export type WooCommerceWebhookPayload = z.infer<typeof wooCommerceWebhookSchema>;

/**
 * Sent synchronously from the WordPress plugin's order-received page (see
 * class-woocommerce.php's `maybe_redirect_after_purchase`), not the async
 * access.granted/revoked webhook above -- this one needs a same-request
 * answer (where to redirect the buyer's browser next), which a fire-and-
 * forget webhook can't provide.
 */
export const coursePurchaseCompleteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(160).optional(),
  courseSlugs: z.array(z.string().min(1)).min(1),
  orderId: z.number().int().positive(),
  timestamp: z.number().int(),
});
export type CoursePurchaseCompletePayload = z.infer<typeof coursePurchaseCompleteSchema>;
