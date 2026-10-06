import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors/app-error";
import { ghlContactWebhookSchema, toMemberSignup } from "@/features/access/schemas/access.schema";
import { handleMemberSignup } from "@/features/access/services/member-signup.service";
import { verifySharedSecret } from "@/lib/webhooks/verify-shared-secret";

/**
 * Called by the Webhook action of a GoHighLevel workflow triggered when a
 * contact joins as a free member (e.g. a tag is added, or a form is
 * submitted). Stores the contact's email and username on the platform; the
 * member then creates a password on /create-password. Authenticated like the
 * purchase webhook, with the shared secret -- as the `x-webhook-secret`
 * header, or as a `secret` Custom Data field.
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

  const payload = ghlContactWebhookSchema.parse(json);
  const providedSecret = req.headers.get("x-webhook-secret") ?? payload.customData?.secret ?? payload.secret;
  if (!verifySharedSecret(providedSecret, secret)) {
    throw new UnauthorizedError("Invalid webhook secret");
  }

  const result = await handleMemberSignup(toMemberSignup(payload));

  return apiSuccess(result);
});
