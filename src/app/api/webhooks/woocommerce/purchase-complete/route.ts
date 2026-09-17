import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { coursePurchaseCompleteSchema } from "@/features/access/schemas/access.schema";
import { handleCoursePurchaseComplete } from "@/features/access/services/access.service";
import { verifyBridgeSignature } from "@/lib/webhooks/verify-bridge-signature";

/**
 * Called synchronously from the WordPress plugin's order-received page
 * (class-woocommerce.php's `maybe_redirect_after_purchase`, on
 * `template_redirect`) -- unlike the async access.granted/revoked webhook,
 * this one runs while the buyer's browser is still on WordPress, so the
 * response tells the plugin exactly where to send them next: a one-time
 * "create your password" link for a new account, or straight to login for
 * an existing one.
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

  const payload = coursePurchaseCompleteSchema.parse(json);
  const result = await handleCoursePurchaseComplete(payload);

  return apiSuccess(result);
});
