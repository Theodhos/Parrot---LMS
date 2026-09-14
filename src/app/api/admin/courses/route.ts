import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentRole } from "@/lib/auth/session";
import { Role } from "@/generated/prisma";
import { parseSearchParams } from "@/lib/validation";
import { listCoursesQuerySchema } from "@/features/courses/schemas/course.schema";
import { listCourses } from "@/features/courses/services/course.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  await requireCurrentRole(Role.ADMIN);
  const query = parseSearchParams(listCoursesQuerySchema, req.nextUrl.searchParams);
  const result = await listCourses(query);
  return apiSuccess(result.items, {
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, pageCount: result.pageCount },
  });
});
