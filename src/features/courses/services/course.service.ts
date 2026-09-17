import "server-only";
import { CourseStatus, Role } from "@/generated/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireCourseManager, requireRole, type SessionUser } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import * as courseRepo from "@/features/courses/repositories/course.repository";
import type { CourseWithRelations } from "@/features/courses/repositories/course.repository";
import type {
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from "@/features/courses/schemas/course.schema";
import type { CourseDetailDTO, CourseListItemDTO } from "@/features/courses/types/course.types";

function toListItemDTO(
  course: CourseWithRelations | Awaited<ReturnType<typeof courseRepo.listCourses>>["courses"][number],
  averageRating: number | null = null,
): CourseListItemDTO {
  const modules = "modules" in course ? course.modules : [];
  const lessons = modules.flatMap((m) => m.lessons);

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    status: course.status,
    categoryName: course.category?.name ?? null,
    instructorId: "instructorId" in course ? course.instructorId : "",
    instructorName: course.instructor.name,
    moduleCount: modules.length,
    lessonCount: lessons.length,
    totalDurationSeconds: lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    enrollmentCount: course._count.enrollments,
    averageRating,
    createdAt: course.createdAt,
    priceCents: course.priceCents,
    woocommerceProductId: course.woocommerceProductId,
  };
}

function toDetailDTO(course: CourseWithRelations, averageRating: number | null): CourseDetailDTO {
  return {
    ...toListItemDTO(course, averageRating),
    instructorImage: course.instructor.image,
    instructorBio: course.instructor.bio,
    modules: course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      lessons: mod.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        type: lesson.type,
        duration: lesson.duration ?? 0,
        order: lesson.order,
        published: lesson.published,
        hasQuiz: !!lesson.quiz,
      })),
    })),
  };
}

export async function listCourses(query: ListCoursesQuery) {
  const { courses, total } = await courseRepo.listCourses(query);
  const ratings = await courseRepo.averageRatingsForCourses(courses.map((c) => c.id));

  const items: CourseListItemDTO[] = courses.map((c) => toListItemDTO(c, ratings.get(c.id) ?? null));
  return { items, total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
}

export async function getPublishedCourseBySlug(slug: string): Promise<CourseDetailDTO> {
  const course = await courseRepo.findCourseBySlug(slug);
  if (!course || course.status !== CourseStatus.PUBLISHED) {
    throw new NotFoundError("Course");
  }
  const averageRating = await courseRepo.averageRatingForCourse(course.id);
  return toDetailDTO(course, averageRating);
}

/** Instructors/admins get full visibility (draft/archived included) but only over courses they can manage. */
export async function getManageableCourseById(user: SessionUser, id: string): Promise<CourseDetailDTO> {
  const course = await courseRepo.findCourseById(id);
  if (!course) throw new NotFoundError("Course");
  requireCourseManager(user, course);
  const averageRating = await courseRepo.averageRatingForCourse(course.id);
  return toDetailDTO(course, averageRating);
}

export async function createCourse(user: SessionUser, input: CreateCourseInput) {
  requireRole(user, Role.ADMIN, Role.INSTRUCTOR);

  const baseSlug = slugify(input.slug || input.title);
  let slug = baseSlug;
  let suffix = 1;
  while (await courseRepo.courseSlugExists(slug)) {
    slug = `${baseSlug}-${++suffix}`;
  }

  return courseRepo.createCourse({
    title: input.title,
    slug,
    description: input.description,
    thumbnail: input.thumbnail || null,
    level: input.level,
    status: CourseStatus.DRAFT,
    priceCents: input.price !== undefined ? Math.round(input.price * 100) : 0,
    woocommerceProductId: input.woocommerceProductId ?? null,
    instructor: { connect: { id: user.id } },
    ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
  });
}

export async function updateCourse(user: SessionUser, id: string, input: UpdateCourseInput) {
  const existing = await courseRepo.findCourseOwnerInfo(id);
  if (!existing) throw new NotFoundError("Course");
  requireCourseManager(user, existing);

  let slug: string | undefined;
  if (input.slug || input.title) {
    const baseSlug = slugify(input.slug || input.title!);
    slug = baseSlug;
    let suffix = 1;
    while (await courseRepo.courseSlugExists(slug, id)) {
      slug = `${baseSlug}-${++suffix}`;
    }
  }

  return courseRepo.updateCourse(id, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail || null } : {}),
    ...(input.level !== undefined ? { level: input.level } : {}),
    ...(input.price !== undefined ? { priceCents: Math.round(input.price * 100) } : {}),
    ...(input.woocommerceProductId !== undefined
      ? { woocommerceProductId: input.woocommerceProductId }
      : {}),
    ...(input.categoryId !== undefined
      ? input.categoryId
        ? { category: { connect: { id: input.categoryId } } }
        : { category: { disconnect: true } }
      : {}),
  });
}

export async function updateCourseStatus(user: SessionUser, id: string, status: CourseStatus) {
  const existing = await courseRepo.findCourseOwnerInfo(id);
  if (!existing) throw new NotFoundError("Course");
  requireCourseManager(user, existing);

  if (status === CourseStatus.PUBLISHED) {
    const course = await courseRepo.findCourseById(id);
    const lessonCount = course?.modules.flatMap((m) => m.lessons).length ?? 0;
    if (!course || course.modules.length === 0 || lessonCount === 0) {
      throw new ValidationError("A course needs at least one module with one lesson before it can be published");
    }
  }

  return courseRepo.updateCourse(id, { status });
}

export async function deleteCourse(user: SessionUser, id: string) {
  const existing = await courseRepo.findCourseOwnerInfo(id);
  if (!existing) throw new NotFoundError("Course");
  requireCourseManager(user, existing);
  return courseRepo.deleteCourse(id);
}

export function listCategories() {
  return courseRepo.listCategories();
}
