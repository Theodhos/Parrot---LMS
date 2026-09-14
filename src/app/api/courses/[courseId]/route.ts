import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateCourseSchema } from "@/features/courses/schemas/course.schema";
import {
  deleteCourse,
  getManageableCourseById,
  getPublishedCourseBySlug,
  updateCourse,
} from "@/features/courses/services/course.service";

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

// This segment doubles as "id or slug": an ObjectId means an authenticated
// manage-view lookup (any status, owner/admin only); anything else is
// treated as a public slug lookup (published courses only). Next.js's App
// Router requires every dynamic segment at this path level to share one
// param name, so the nested /modules, /status, /enrollments routes under
// [courseId] all assume this is a real id, not a slug.
export const GET = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;

  if (OBJECT_ID_RE.test(courseId)) {
    const user = await requireCurrentUser();
    const course = await getManageableCourseById(user, courseId);
    return apiSuccess(course);
  }

  const course = await getPublishedCourseBySlug(courseId);
  return apiSuccess(course);
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(updateCourseSchema, req);
  const course = await updateCourse(user, courseId, input);
  return apiSuccess(course);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  await deleteCourse(user, courseId);
  return apiSuccess({ deleted: true });
});
