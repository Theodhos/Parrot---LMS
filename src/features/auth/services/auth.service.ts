import "server-only";
import { prisma } from "@/lib/db/client";
import { ConflictError, UnauthorizedError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/auth.schema";
import { hashPassword, verifyPassword } from "./password.service";

export async function registerUser(input: RegisterInput) {
  const data = registerSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: Role.STUDENT,
    },
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image };
}
