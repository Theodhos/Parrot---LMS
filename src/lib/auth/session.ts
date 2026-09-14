import "server-only";
import { auth } from "@/lib/auth/auth";
import { requireRole, requireUser, type SessionUser } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
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
