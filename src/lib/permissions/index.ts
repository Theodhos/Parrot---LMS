import { Role } from "@/generated/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";

export interface SessionUser {
  id: string;
  role: Role;
  email: string;
  name: string;
  /** Identity lives in WordPress; this links the local profile to it. */
  wordpressUserId: number | null;
}

/** Throws 401 if there is no authenticated user. Use at the top of every server action / route handler. */
export function requireUser(user: SessionUser | null | undefined): SessionUser {
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Throws 401/403 unless the current user holds one of the allowed roles. */
export function requireRole(user: SessionUser | null | undefined, ...roles: Role[]): SessionUser {
  const current = requireUser(user);
  if (!roles.includes(current.role)) throw new ForbiddenError();
  return current;
}

export const isAdmin = (user: Pick<SessionUser, "role">): boolean => user.role === Role.ADMIN;
export const isInstructor = (user: Pick<SessionUser, "role">): boolean => user.role === Role.INSTRUCTOR;
export const isStudent = (user: Pick<SessionUser, "role">): boolean => user.role === Role.STUDENT;

/** Admins manage every course; instructors only the ones they own. */
export function canManageCourse(user: SessionUser, course: { instructorId: string }): boolean {
  return isAdmin(user) || (isInstructor(user) && course.instructorId === user.id);
}

export function requireCourseManager(
  user: SessionUser | null | undefined,
  course: { instructorId: string },
): SessionUser {
  const current = requireUser(user);
  if (!canManageCourse(current, course)) {
    throw new ForbiddenError("You do not have permission to manage this course");
  }
  return current;
}

/** A student may only act on progress/enrollment records that belong to them; admins bypass. */
export function requireSelfOrAdmin(user: SessionUser | null | undefined, ownerId: string): SessionUser {
  const current = requireUser(user);
  if (current.id !== ownerId && !isAdmin(current)) {
    throw new ForbiddenError();
  }
  return current;
}
