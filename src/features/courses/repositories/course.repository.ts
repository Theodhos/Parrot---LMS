import "server-only";
import { prisma } from "@/lib/db/client";
import { CourseStatus, type Prisma } from "@/generated/prisma";
import type { ListCoursesQuery } from "@/features/courses/schemas/course.schema";

const courseWithRelationsArgs = {
  include: {
    category: { select: { name: true, slug: true } },
    instructor: { select: { id: true, name: true, image: true, bio: true } },
    modules: {
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: { quiz: { select: { id: true } } },
        },
      },
    },
    _count: { select: { enrollments: true, ratings: true } },
  },
} satisfies Prisma.CourseDefaultArgs;

export type CourseWithRelations = Prisma.CourseGetPayload<typeof courseWithRelationsArgs>;

export function findCourseBySlug(slug: string) {
  return prisma.course.findUnique({ where: { slug }, ...courseWithRelationsArgs });
}

export function findCourseById(id: string) {
  return prisma.course.findUnique({ where: { id }, ...courseWithRelationsArgs });
}

export async function findCourseOwnerInfo(id: string) {
  return prisma.course.findUnique({ where: { id }, select: { id: true, instructorId: true, status: true } });
}

export async function listCourses(query: ListCoursesQuery) {
  const where: Prisma.CourseWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.level) where.level = query.level;
  if (query.instructorId) where.instructorId = query.instructorId;
  if (query.category) where.category = { slug: query.category };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        category: { select: { name: true } },
        instructor: { select: { name: true } },
        modules: { select: { id: true, lessons: { select: { id: true, duration: true } } } },
        _count: { select: { enrollments: true, ratings: true } },
      },
    }),
  ]);

  return { courses, total };
}

export async function averageRatingForCourse(courseId: string) {
  const result = await prisma.courseRating.aggregate({ where: { courseId }, _avg: { rating: true } });
  return result._avg.rating;
}

export async function averageRatingsForCourses(courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, number>();
  const grouped = await prisma.courseRating.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds } },
    _avg: { rating: true },
  });
  return new Map(grouped.map((g) => [g.courseId, g._avg.rating ?? 0]));
}

export function createCourse(data: Prisma.CourseCreateInput) {
  return prisma.course.create({ data });
}

export function updateCourse(id: string, data: Prisma.CourseUpdateInput) {
  return prisma.course.update({ where: { id }, data });
}

export function deleteCourse(id: string) {
  return prisma.course.delete({ where: { id } });
}

export function courseSlugExists(slug: string, excludeId?: string) {
  return prisma.course
    .findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })
    .then(Boolean);
}

export function listCategories() {
  return prisma.courseCategory.findMany({ orderBy: { name: "asc" } });
}

export const publishedCourseFilter = { status: CourseStatus.PUBLISHED } as const;

export function findCategoryBySlug(slug: string) {
  return prisma.courseCategory.findUnique({ where: { slug }, select: { id: true } });
}

export function findCategoryById(id: string) {
  return prisma.courseCategory.findUnique({ where: { id }, select: { id: true } });
}

export function createCategory(data: { name: string; slug: string }) {
  return prisma.courseCategory.create({ data });
}

export function updateCategory(id: string, data: { name: string; slug: string }) {
  return prisma.courseCategory.update({ where: { id }, data });
}

/** Courses in the category are kept and simply lose it (the relation is optional, so it is set to null). */
export function deleteCategory(id: string) {
  return prisma.courseCategory.delete({ where: { id } });
}
