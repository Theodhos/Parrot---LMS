import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { ConflictError, UnauthorizedError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/auth.schema";

const PASSWORD_HASH_ROUNDS = 10;

/**
 * Creates a brand-new local account. The first account ever created has no
 * special treatment here -- every self-service signup is a STUDENT; an
 * admin promotes INSTRUCTOR/ADMIN afterward from the admin panel.
 */
export async function registerUser(input: RegisterInput) {
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
      role: Role.STUDENT,
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
