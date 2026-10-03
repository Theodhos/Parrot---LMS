import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { ghlPurchaseWebhookSchema, toCourseRefund } from "@/features/access/schemas/access.schema";
import { handleCourseRefund } from "@/features/access/services/access.service";
import { verifySharedSecret } from "@/lib/webhooks/verify-shared-secret";

/**
 * Called by a GoHighLevel workflow triggered on a refund/chargeback for a
 * course product. Marks the original payment REFUNDED and revokes the course
 * access it granted (Enrollment.status = REVOKED); the account itself stays.
 * Authenticated exactly like the purchase webhook: shared secret in the
 * `x-webhook-secret` header or a `secret` Custom Data field. Identify the
 * purchase with `transaction_id` Custom Data (preferred) or email +
 * `course_slug`.
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

  const result = await handleCourseRefund(toCourseRefund(payload));

  return apiSuccess(result);
});
