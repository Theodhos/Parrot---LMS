import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateCourseStatusSchema } from "@/features/courses/schemas/course.schema";
import { updateCourseStatus } from "@/features/courses/services/course.service";

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const { status } = await parseJsonBody(updateCourseStatusSchema, req);
  const course = await updateCourseStatus(user, courseId, status);
  return apiSuccess(course);
});
