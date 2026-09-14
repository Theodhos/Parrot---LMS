import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { wooCommerceWebhookSchema } from "@/features/access/schemas/access.schema";
import { applyAccessWebhookEvent } from "@/features/access/services/access.service";

/**
 * Receives signed access-change events from the course-platform-bridge
 * WordPress plugin (wordpress-plugin/course-platform-bridge/includes/class-webhooks.php).
 * The signature is verified over the RAW request body -- never re-serialize
 * and compare, since that can silently disagree with what WordPress signed.
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const secret = process.env.WORDPRESS_BRIDGE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("WORDPRESS_BRIDGE_WEBHOOK_SECRET is not configured");
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-bridge-signature") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  const validSignature =
    provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);

  if (!validSignature) {
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
