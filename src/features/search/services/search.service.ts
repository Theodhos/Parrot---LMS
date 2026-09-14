import "server-only";
import { prisma } from "@/lib/db/client";
import { CourseStatus } from "@/generated/prisma";
import type { SearchQuery } from "@/features/search/schemas/search.schema";

export async function searchCourses(query: SearchQuery) {
  return prisma.course.findMany({
    where: {
      status: CourseStatus.PUBLISHED,
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    },
    take: query.limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      level: true,
      category: { select: { name: true } },
      instructor: { select: { name: true } },
    },
  });
}
