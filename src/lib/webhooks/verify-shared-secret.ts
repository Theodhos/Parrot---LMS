import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a caller-supplied shared secret. Both sides are
 * hashed first so the comparison never leaks the expected secret's length.
 */
export function verifySharedSecret(provided: string | null | undefined, secret: string): boolean {
  if (!provided) return false;

  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(secret).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
