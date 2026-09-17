import "server-only";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { requireRole, requireUser, type SessionUser } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

/**
 * Resolves the current session AND confirms the underlying account still
 * exists. A JWT session stays cryptographically valid even after its User
 * row is deleted (an admin removed the account, or the database was reset)
 * -- without this check every downstream service call would throw a raw
 * NotFoundError instead of the caller getting a clean "not signed in".
 * proxy.ts performs the same check for the routes it gates and bounces the
 * request to login before this ever runs; this covers everywhere else
 * (e.g. the public "/" entry page).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;

  const stillExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!stillExists) return null;

  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    wordpressUserId: session.user.wordpressUserId ?? null,
  };
}

/** Throws 401 if unauthenticated. Use at the top of server actions / route handlers. */
export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  return requireUser(user);
}

/** Throws 401/403 unless the signed-in user has one of the given roles. */
export async function requireCurrentRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  return requireRole(user, ...roles);
}
