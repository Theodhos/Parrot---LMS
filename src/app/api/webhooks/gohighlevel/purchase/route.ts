import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { ghlPurchaseWebhookSchema, toCoursePurchase } from "@/features/access/schemas/access.schema";
import { handleCoursePurchase } from "@/features/access/services/access.service";
import { verifySharedSecret } from "@/lib/webhooks/verify-shared-secret";

/**
 * Called by the Webhook action of a GoHighLevel workflow triggered when a
 * course order is paid. GoHighLevel doesn't sign workflow webhooks, so the
 * call is authenticated with a shared secret instead -- sent as the
 * `x-webhook-secret` header, or as a `secret` Custom Data field for
 * workflow actions that can't set headers.
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("GHL_WEBHOOK_SECRET is not configured");
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ValidationError("Malformed webhook payload");
  }

  const payload = ghlPurchaseWebhookSchema.parse(json);
  const providedSecret = req.headers.get("x-webhook-secret") ?? payload.customData?.secret ?? payload.secret;
  if (!verifySharedSecret(providedSecret, secret)) {
    throw new UnauthorizedError("Invalid webhook secret");
  }

  const result = await handleCoursePurchase(toCoursePurchase(payload), req.headers);

  return apiSuccess(result);
});
