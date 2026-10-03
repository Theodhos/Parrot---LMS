import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/db/client";

const USERNAME_MAX_BASE_LENGTH = 20;
const USERNAME_ATTEMPTS = 8;

const PASSWORD_LENGTH = 14;
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
// Kept to characters that paste cleanly from an email and survive being
// typed on any keyboard layout.
const SPECIAL = "!@#$%^&*-_?";
const ALL_CLASSES = [LOWER, UPPER, DIGITS, SPECIAL] as const;

/** "John Smith" / "john.smith+shop@x.com" -> "john.smith" (lowercase, [a-z0-9.], trimmed). */
function usernameBase(email: string, name?: string | null): string {
  const source = name?.trim() || email.split("@")[0]!;
  const base = source
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, USERNAME_MAX_BASE_LENGTH);
  return base || "student";
}

/**
 * Derives a friendly, unique login handle from the buyer's name/email
 * (e.g. "john.smith8291") for an account provisioned by a verified purchase.
 * Collisions are retried with a new random suffix; usernames never contain
 * sensitive data. Matches the lowercase convention findUserByLogin expects.
 */
export async function generateUniqueUsername(email: string, name?: string | null): Promise<string> {
  const base = usernameBase(email, name);

  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt++) {
    // First try the bare base -- nicest handle -- then base + 4 random digits.
    const candidate = attempt === 0 ? base : `${base}${randomInt(1000, 10000)}`;
    const taken = await prisma.user.findFirst({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  // Practically unreachable; random hex cannot collide in any realistic run.
  return `${base}.${randomBytes(4).toString("hex")}`;
}

/**
 * Cryptographically random temporary password with at least one lowercase,
 * uppercase, digit, and special character. The caller hashes it immediately;
 * the plaintext only ever travels inside the credentials email.
 */
export function generateTemporaryPassword(length = PASSWORD_LENGTH): string {
  const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]!;

  // One guaranteed character per class, the rest drawn from all classes.
  const chars = ALL_CLASSES.map(pick);
  const everything = ALL_CLASSES.join("");
  while (chars.length < length) chars.push(pick(everything));

  // Fisher-Yates with crypto randomness so the guaranteed characters do not
  // sit at predictable positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join("");
}
