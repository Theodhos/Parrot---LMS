import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateLessonSchema } from "@/features/lessons/schemas/lesson.schema";
import { deleteLesson, updateLesson } from "@/features/lessons/services/lesson.service";

type Params = { courseId: string; moduleId: string; lessonId: string };

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId, lessonId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(updateLessonSchema, req);
  const lesson = await updateLesson(user, courseId, moduleId, lessonId, input);
  return apiSuccess(lesson);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId, lessonId } = await ctx.params;
  const user = await requireCurrentUser();
  await deleteLesson(user, courseId, moduleId, lessonId);
  return apiSuccess({ deleted: true });
});
