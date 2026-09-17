import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an `X-Bridge-Signature: sha256=<hex>` header from the
 * course-platform-bridge WordPress plugin. Always verify over the RAW
 * request body -- never re-serialize and compare, since that can silently
 * disagree with what WordPress signed.
 */
export function verifyBridgeSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  return provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);
}
