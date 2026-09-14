import "server-only";
import { prisma } from "@/lib/db/client";
import { UnauthorizedError } from "@/lib/errors/app-error";
import { Role } from "@/generated/prisma";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/auth.schema";
import { wpLogin, wpRegister, type WordPressProfile } from "./wordpress-bridge.service";
import { syncEnrollmentsFromAccess } from "@/features/access/services/access.service";

/**
 * Upserts the local "shadow" profile for a WordPress identity. This local
 * User record is what Enrollment/Progress/Notification/etc. relations key
 * off internally -- but it never holds a password, and role defaults to
 * STUDENT for a first-time sign-in (an admin promotes INSTRUCTOR/ADMIN
 * afterward from the admin panel; that assignment is a Parrot LMS concept,
 * independent of WordPress's own roles).
 */
async function syncLocalUser(profile: WordPressProfile) {
  const user = await prisma.user.upsert({
    where: { wordpressUserId: profile.wordpressUserId },
    create: {
      wordpressUserId: profile.wordpressUserId,
      email: profile.email.toLowerCase(),
      name: profile.name,
      role: Role.STUDENT,
    },
    update: {
      email: profile.email.toLowerCase(),
      name: profile.name,
    },
  });

  await syncEnrollmentsFromAccess(user.id, profile.wordpressUserId);

  return user;
}

/** Registers a brand-new account in WordPress, then mirrors it locally. */
export async function registerUser(input: RegisterInput) {
  const data = registerSchema.parse(input);
  const profile = await wpRegister(data.name, data.email, data.password);
  const user = await syncLocalUser(profile);
  return { id: user.id, name: user.name, email: user.email, role: user.role, wordpressUserId: user.wordpressUserId };
}

/**
 * Verifies credentials against WordPress -- the password itself never
 * touches this process's memory beyond this call, is never logged, and is
 * never persisted anywhere.
 */
export async function verifyCredentials(email: string, password: string) {
  const profile = await wpLogin(email, password);
  if (!profile) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const user = await syncLocalUser(profile);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    wordpressUserId: user.wordpressUserId,
  };
}
