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

export type SetupClaimResult = { status: "claimed"; email: string } | { status: "not-on-record" };

/**
 * Where an email stands for a page that sets up a login without an emailed
 * link (/welcome after a purchase, /create-password for a free member):
 * "ready" (GoHighLevel's webhook put it on record and the login is still to
 * be created), "not-on-record" (a wrong email, or the webhook is still on
 * its way), "already-set-up", or "expired" (on record for too long).
 */
export type SetupEmailStatus = "ready" | "not-on-record" | "already-set-up" | "expired";

async function lookUpCheckoutClaim(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true },
  });
  if (!user) return { status: "not-on-record" } as const;
  if (user.password) return { status: "already-set-up" } as const;

  const payment = await prisma.payment.findFirst({
    where: { userId: user.id, status: PaymentStatus.SUCCEEDED },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!payment) return { status: "not-on-record" } as const;
  if (payment.createdAt.getTime() < Date.now() - CHECKOUT_CLAIM_WINDOW_HOURS * 60 * 60 * 1000) {
    return { status: "expired" } as const;
  }
  return { status: "ready", user } as const;
}

/** The same check claimAccountAfterCheckout makes, without changing anything -- for verifying the email as it is typed. */
export async function getCheckoutEmailStatus(email: string): Promise<SetupEmailStatus> {
  return (await lookUpCheckoutClaim(email)).status;
}

/**
 * The page GoHighLevel redirects a buyer to straight after checkout: they
 * type the email they paid with and choose a username and password, with no
 * emailed link in between. The browser redirect carries no proof of who
 * paid, so the claim is only honoured for an account the purchase webhook
 * created (a SUCCEEDED payment), that has no password yet, within 24 hours
 * of that payment -- after that, forgot-password's emailed link is the way in.
 *
 * The redirect can beat the webhook: "not-on-record" means no purchase is
 * on record for this email yet, and the caller should retry shortly.
 */
export async function claimAccountAfterCheckout(
  email: string,
  username: string,
  password: string,
): Promise<SetupClaimResult> {
  const claim = await lookUpCheckoutClaim(email);
  if (claim.status === "not-on-record") return { status: "not-on-record" };
  if (claim.status === "already-set-up") {
    throw new ConflictError("This email already has a login -- sign in instead");
  }
  if (claim.status === "expired") {
    throw new ValidationError(
      'This page works for 24 hours after a purchase. Use "Forgot password" on the sign-in page to finish setting up your account',
    );
  }
  const { user } = claim;

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

const INVITE_CLAIM_WINDOW_DAYS = 7;

async function lookUpInviteClaim(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, invitedAt: true },
  });
  if (!user) return { status: "not-on-record" } as const;
  if (user.password) return { status: "already-set-up" } as const;
  if (!user.invitedAt) return { status: "not-on-record" } as const;
  if (user.invitedAt.getTime() < Date.now() - INVITE_CLAIM_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return { status: "expired" } as const;
  }
  return { status: "ready", user } as const;
}

/** The same check claimInvitedAccount makes, without changing anything -- for verifying the email as it is typed. */
export async function getInviteEmailStatus(email: string): Promise<SetupEmailStatus> {
  return (await lookUpInviteClaim(email)).status;
}

/**
 * The page a free member lands on after GoHighLevel registered them (the
 * contact webhook, which already stored their email and username): they type
 * that email and choose only a password. As on the post-checkout page, the
 * visit carries no proof of who they are, so the claim is only honoured for
 * an account that webhook registered, that has no password yet, within 7
 * days of the registration -- re-running the GoHighLevel workflow for the
 * contact opens a fresh 7 days.
 *
 * "not-on-record" means the webhook has not registered this email (yet), and
 * the caller should retry shortly.
 */
export async function claimInvitedAccount(email: string, password: string): Promise<SetupClaimResult> {
  const claim = await lookUpInviteClaim(email);
  if (claim.status === "not-on-record") return { status: "not-on-record" };
  if (claim.status === "already-set-up") {
    throw new ConflictError("This email already has a login -- sign in instead");
  }
  if (claim.status === "expired") {
    throw new ValidationError(
      'This page works for 7 days after you register. Use "Forgot password" on the sign-in page to finish setting up your account',
    );
  }
  const { user } = claim;

  // Conditional on the password still being unset, so two claims racing for
  // the same account cannot both win.
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, OR: [{ password: null }, { password: { isSet: false } }] },
    data: { password: passwordHash },
  });
  if (count === 0) {
    throw new ConflictError("This email already has a login -- sign in instead");
  }

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
