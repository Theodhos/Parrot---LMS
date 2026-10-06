import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { PaymentStatus } from "@/generated/prisma";
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

const CHECKOUT_CLAIM_WINDOW_HOURS = 24;

export type CheckoutClaimResult = { status: "claimed"; email: string } | { status: "awaiting-payment" };

/**
 * The page GoHighLevel redirects a buyer to straight after checkout: they
 * type the email they paid with and choose a username and password, with no
 * emailed link in between. The browser redirect carries no proof of who
 * paid, so the claim is only honoured for an account the purchase webhook
 * created (a SUCCEEDED payment), that has no password yet, within 24 hours
 * of that payment -- after that, forgot-password's emailed link is the way in.
 *
 * The redirect can beat the webhook: "awaiting-payment" means no purchase is
 * on record for this email yet, and the caller should retry shortly.
 */
export async function claimAccountAfterCheckout(
  email: string,
  username: string,
  password: string,
): Promise<CheckoutClaimResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { status: "awaiting-payment" };
  if (user.password) {
    throw new ConflictError("This email already has a login -- sign in instead");
  }

  const payment = await prisma.payment.findFirst({
    where: { userId: user.id, status: PaymentStatus.SUCCEEDED },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!payment) return { status: "awaiting-payment" };
  if (payment.createdAt.getTime() < Date.now() - CHECKOUT_CLAIM_WINDOW_HOURS * 60 * 60 * 1000) {
    throw new ValidationError(
      'This page works for 24 hours after a purchase. Use "Forgot password" on the sign-in page to finish setting up your account',
    );
  }

  const usernameTaken = await prisma.user.findFirst({
    where: { username, id: { not: user.id } },
    select: { id: true },
  });
  if (usernameTaken) {
    throw new ConflictError("That username is already taken -- please choose another");
  }

  // Conditional on the password still being unset, so two claims racing for
  // the same account cannot both win.
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, OR: [{ password: null }, { password: { isSet: false } }] },
    data: { username, password: passwordHash },
  });
  if (count === 0) {
    throw new ConflictError("This email already has a login -- sign in instead");
  }

  // An emailed setup link still out there must not be able to replace the
  // credentials just chosen.
  await prisma.passwordSetupToken.updateMany({
    where: { userId: user.id, ...UNUSED },
    data: { usedAt: new Date() },
  });

  return { status: "claimed", email: user.email };
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
