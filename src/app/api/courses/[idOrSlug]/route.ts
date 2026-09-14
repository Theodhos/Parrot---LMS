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

export const GET = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ idOrSlug: string }> }) => {
  const { idOrSlug } = await ctx.params;

  if (OBJECT_ID_RE.test(idOrSlug)) {
    const user = await requireCurrentUser();
    const course = await getManageableCourseById(user, idOrSlug);
    return apiSuccess(course);
  }

  const course = await getPublishedCourseBySlug(idOrSlug);
  return apiSuccess(course);
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ idOrSlug: string }> }) => {
  const { idOrSlug } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(updateCourseSchema, req);
  const course = await updateCourse(user, idOrSlug, input);
  return apiSuccess(course);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ idOrSlug: string }> }) => {
  const { idOrSlug } = await ctx.params;
  const user = await requireCurrentUser();
  await deleteCourse(user, idOrSlug);
  return apiSuccess({ deleted: true });
});
