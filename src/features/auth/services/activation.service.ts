import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";

const TOKEN_TTL_HOURS = 48;
const PASSWORD_HASH_ROUNDS = 10;

/** Issues a fresh single-use token for a user to set their password (see PasswordSetupToken). */
export async function createPasswordSetupToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordSetupToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  return token;
}

/** Looks up a token for the "create your password" page. Never reveals *why* a token is invalid beyond this. */
export async function getPasswordSetupContext(token: string) {
  const row = await prisma.passwordSetupToken.findUnique({
    where: { token },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }

  return { email: row.user.email, name: row.user.name };
}

/** Sets the account's password from a valid, unused token and consumes it. */
export async function setPasswordFromToken(token: string, password: string) {
  const row = await prisma.passwordSetupToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new ValidationError("This link is invalid or has expired");
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw new NotFoundError("Account");

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } }),
    prisma.passwordSetupToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  return { email: user.email };
}
