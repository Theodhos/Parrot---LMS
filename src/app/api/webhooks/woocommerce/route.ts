import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { wooCommerceWebhookSchema } from "@/features/access/schemas/access.schema";
import { applyAccessWebhookEvent } from "@/features/access/services/access.service";
import { verifyBridgeSignature } from "@/lib/webhooks/verify-bridge-signature";

/**
 * Receives signed access-change events from the course-platform-bridge
 * WordPress plugin (wordpress-plugin/course-platform-bridge/includes/class-webhooks.php).
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const secret = process.env.WORDPRESS_BRIDGE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("WORDPRESS_BRIDGE_WEBHOOK_SECRET is not configured");
  }

  const rawBody = await req.text();
  if (!verifyBridgeSignature(rawBody, req.headers.get("x-bridge-signature"), secret)) {
    throw new UnauthorizedError("Invalid webhook signature");
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Malformed webhook payload");
  }

  const payload = wooCommerceWebhookSchema.parse(json);
  const result = await applyAccessWebhookEvent(payload);

  return apiSuccess(result);
});
