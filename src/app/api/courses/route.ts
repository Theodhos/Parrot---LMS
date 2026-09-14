import type { NextRequest } from "next/server";
import { CourseStatus, Role } from "@/generated/prisma";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { getCurrentUser, requireCurrentRole } from "@/lib/auth/session";
import { parseJsonBody, parseSearchParams } from "@/lib/validation";
import { createCourseSchema, listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { createCourse, listCourses } from "@/features/courses/services/course.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const query = parseSearchParams(listCoursesQuerySchema, req.nextUrl.searchParams);
  const user = await getCurrentUser();

  if (!user || user.role === Role.STUDENT) {
    query.status = CourseStatus.PUBLISHED;
  } else if (user.role === Role.INSTRUCTOR) {
    query.instructorId = user.id;
  }

  const result = await listCourses(query);
  return apiSuccess(result.items, {
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, pageCount: result.pageCount },
  });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentRole(Role.ADMIN, Role.INSTRUCTOR);
  const input = await parseJsonBody(createCourseSchema, req);
  const course = await createCourse(user, input);
  return apiSuccess(course, { status: 201 });
});
