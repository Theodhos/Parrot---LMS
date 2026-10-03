import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma, Role } from "@/generated/prisma";

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function listUsers(params: {
  page: number;
  pageSize: number;
  role?: Role;
  search?: string;
  /** Limits the list to users enrolled in at least one course taught by this instructor. */
  enrolledWithInstructorId?: string;
}) {
  const where: Prisma.UserWhereInput = {};
  if (params.role) where.role = params.role;
  if (params.enrolledWithInstructorId) {
    where.enrollments = { some: { course: { instructorId: params.enrolledWithInstructorId } } };
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        _count: { select: { enrollments: true, coursesTaught: true } },
      },
    }),
  ]);

  return { total, users };
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}
