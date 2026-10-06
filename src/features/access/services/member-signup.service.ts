import "server-only";
import { prisma } from "@/lib/db/client";
import { Role } from "@/generated/prisma";
import type { MemberSignup } from "@/features/access/schemas/access.schema";

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

/**
 * Turns the name a GoHighLevel contact carries into a login name the
 * platform accepts (see usernameSchema): lower case, no accents, spaces as
 * dots, only letters, digits, dots, hyphens and underscores, never an "@".
 * A value that already is a valid username comes back unchanged.
 */
export function toUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split("@")[0]!
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, USERNAME_MAX);
}

/** The first candidate that makes a usable username, with a number added while another account holds it. */
async function availableUsername(candidates: (string | undefined)[], ownUserId?: string): Promise<string> {
  const base =
    candidates.map((candidate) => toUsername(candidate ?? "")).find((name) => name.length >= USERNAME_MIN) ?? "member";

  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const username = `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
    const holder = await prisma.user.findFirst({ where: { username }, select: { id: true } });
    if (!holder || holder.id === ownUserId) return username;
  }
}

export interface MemberSignupResult {
  newAccount: boolean;
  username: string | null;
  /** The member still has to create their password on /create-password. */
  needsPassword: boolean;
}

/**
 * Handles a verified "contact joined" webhook from a GoHighLevel workflow:
 * stores the contact as a free member -- their email and username, exactly
 * the two things GoHighLevel sends -- with no password and no purchase. A
 * free member can open the free courses; a paid course only opens when an
 * admin assigns it (see course-access.service). They create their password
 * on /create-password. Nothing is sent back to GoHighLevel: no email results.
 *
 * Idempotent: a redelivery, or re-running the workflow for the contact,
 * creates nothing twice. Until the member has set a password GoHighLevel
 * stays the source of their username, and each delivery re-opens the
 * create-password window; an account that already has a login is left
 * exactly as it is.
 */
export async function handleMemberSignup(signup: MemberSignup): Promise<MemberSignupResult> {
  const existing = await prisma.user.findUnique({ where: { email: signup.email } });
  if (existing?.password) {
    return { newAccount: false, username: existing.username, needsPassword: false };
  }

  const username = await availableUsername(
    [signup.username, existing?.username ?? undefined, signup.name, signup.email],
    existing?.id,
  );

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { username, invitedAt: new Date() } });
    console.info(`[webhooks:gohighlevel] free member registered again: ${signup.email}`);
    return { newAccount: false, username, needsPassword: true };
  }

  await prisma.user.create({
    data: {
      email: signup.email,
      name: signup.name?.trim() || username,
      username,
      role: Role.STUDENT,
      password: null,
      invitedAt: new Date(),
    },
  });
  console.info(`[webhooks:gohighlevel] free member created for ${signup.email}`);
  return { newAccount: true, username, needsPassword: true };
}
