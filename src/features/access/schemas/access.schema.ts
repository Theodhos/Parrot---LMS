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
