import "server-only";
import { Role } from "@/generated/prisma";
import { NotFoundError } from "@/lib/errors/app-error";
import { requireRole, type SessionUser } from "@/lib/permissions";
import * as userRepo from "@/features/users/repositories/user.repository";
import { registerUser } from "@/features/auth/services/auth.service";
import type {
  CreateInstructorInput,
  ListUsersQuery,
  UpdateProfileInput,
} from "@/features/users/schemas/user.schema";

export async function getProfile(user: SessionUser) {
  const record = await userRepo.findUserById(user.id);
  if (!record) throw new NotFoundError("User");
  return record;
}

export async function updateProfile(user: SessionUser, input: UpdateProfileInput) {
  return userRepo.updateUser(user.id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.image !== undefined ? { image: input.image || null } : {}),
  });
}

/**
 * An admin sees every account. An instructor sees only the people enrolled
 * in their own courses -- never the rest of the platform's accounts.
 */
export async function listUsers(user: SessionUser, query: ListUsersQuery) {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);
  const { total, users } = await userRepo.listUsers({
    ...query,
    ...(user.role === Role.INSTRUCTOR ? { enrolledWithInstructorId: user.id } : {}),
  });
  return { items: users, total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
}

/**
 * Instructors never sign up on their own: an admin adds each one here and
 * hands them the email and password to log in with.
 */
export async function createInstructor(admin: SessionUser, input: CreateInstructorInput) {
  requireRole(admin, Role.ADMIN);
  return registerUser(input, Role.INSTRUCTOR);
}

export async function updateUserRole(admin: SessionUser, userId: string, role: Role) {
  requireRole(admin, Role.ADMIN);
  const target = await userRepo.findUserById(userId);
  if (!target) throw new NotFoundError("User");
  return userRepo.updateUser(userId, { role });
}
