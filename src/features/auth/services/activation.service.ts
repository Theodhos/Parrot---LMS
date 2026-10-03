import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors/app-error";

const TOKEN_TTL_HOURS = 48;
const PASSWORD_HASH_ROUNDS = 10;

/**
 * Issues a fresh single-use token for a user to set their username and
 * password (see PasswordSetupToken), or -- with a shorter lifetime -- to
 * choose a new password after forgetting the old one.
 */
export async function createPasswordSetupToken(userId: string, ttlHours = TOKEN_TTL_HOURS): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordSetupToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    },
  });
  return token;
}

// MongoDB: `usedAt: null` alone misses rows where the field was never
// written, which is every unused token.
const UNUSED = { OR: [{ usedAt: null }, { usedAt: { isSet: false } }] };

/** Whether the user still holds a setup link they can use (unused and unexpired). */
export async function hasLivePasswordSetupToken(userId: string): Promise<boolean> {
  const live = await prisma.passwordSetupToken.findFirst({
    where: { userId, expiresAt: { gt: new Date() }, ...UNUSED },
    select: { id: true },
  });
  return live !== null;
}

/** Looks up a token for the "create your password" page. Never reveals *why* a token is invalid beyond this. */
export async function getPasswordSetupContext(token: string) {
  const row = await prisma.passwordSetupToken.findUnique({
    where: { token },
    include: { user: { select: { email: true, name: true, username: true } } },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }

  return { email: row.user.email, name: row.user.name, username: row.user.username };
}

/**
 * Replaces the account's password from a valid, unused token (the forgot-
 * password link). The username is untouched. Every other outstanding link
 * for the account dies with it, so an older emailed link cannot be used to
 * change the password again.
 */
export async function resetPasswordFromToken(token: string, password: string) {
  const row = await prisma.passwordSetupToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new ValidationError("This link is invalid or has expired");
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw new NotFoundError("Account");

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Reaching this page required opening the link emailed to this address.
      data: { password: passwordHash, emailVerified: user.emailVerified ?? new Date() },
    }),
    prisma.passwordSetupToken.updateMany({
      where: { userId: user.id, ...UNUSED },
      data: { usedAt: new Date() },
    }),
  ]);

  return { email: user.email };
}

/** Sets the account's username and password from a valid, unused token and consumes it. */
export async function activateAccountFromToken(token: string, username: string, password: string) {
  const row = await prisma.passwordSetupToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new ValidationError("This link is invalid or has expired");
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw new NotFoundError("Account");

  const usernameTaken = await prisma.user.findFirst({
    where: { username, id: { not: user.id } },
    select: { id: true },
  });
  if (usernameTaken) {
    throw new ConflictError("That username is already taken -- please choose another");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Reaching this page required opening the link emailed to this address.
      data: { username, password: passwordHash, emailVerified: user.emailVerified ?? new Date() },
    }),
    prisma.passwordSetupToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  return { email: user.email };
}
