import { z } from "zod";
import { Role } from "@/generated/prisma";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(1000).optional(),
  image: z.string().url().optional().or(z.literal("")).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(Role),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(Role).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
