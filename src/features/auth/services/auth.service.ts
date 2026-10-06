import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { ConflictError, UnauthorizedError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/auth.schema";

const PASSWORD_HASH_ROUNDS = 10;

/**
 * Creates a brand-new local account. The first account ever created has no
 * special treatment here -- every self-service signup is a STUDENT. The role
 * is never taken from a request: only an admin adding an instructor from the
 * admin panel (see user.service createInstructor) passes anything else.
 */
export async function registerUser(input: RegisterInput, role: Role = Role.STUDENT) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_HASH_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      password: passwordHash,
      role,
    },
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role, wordpressUserId: user.wordpressUserId };
}

/** Resolves a login identifier -- an email, or a username (which never contains "@"). */
export async function findUserByLogin(identifier: string) {
  const login = identifier.trim().toLowerCase();
  return login.includes("@")
    ? prisma.user.findUnique({ where: { email: login } })
    : prisma.user.findFirst({ where: { username: login } });
}

/**
 * Records an account's first sign-in through the login form, once its
 * credentials check out, and returns the account when this was that first
 * time (null on every later login, and for wrong credentials). Being signed
 * in automatically after choosing a password on /welcome does not count.
 */
export async function recordFirstLogin(identifier: string, password: string) {
  const user = await findUserByLogin(identifier);
  if (!user?.password || user.firstLoginAt) return null;
  if (!(await bcrypt.compare(password, user.password))) return null;

  // Conditional on the field still being unset (MongoDB: never written, or
  // null), so two logins racing each other cannot both be "the first".
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, OR: [{ firstLoginAt: null }, { firstLoginAt: { isSet: false } }] },
    data: { firstLoginAt: new Date() },
  });
  return count === 1 ? { id: user.id, role: user.role } : null;
}

/**
 * Verifies credentials against the local password hash. The plaintext
 * password never touches storage or logs -- only the bcrypt comparison
 * result does.
 */
export async function verifyCredentials(identifier: string, password: string) {
  const user = await findUserByLogin(identifier);
  if (!user || !user.password) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    wordpressUserId: user.wordpressUserId,
  };
}
