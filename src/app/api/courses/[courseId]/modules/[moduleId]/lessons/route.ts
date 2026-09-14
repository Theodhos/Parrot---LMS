import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { createLessonSchema } from "@/features/lessons/schemas/lesson.schema";
import { createLesson } from "@/features/lessons/services/lesson.service";

type Params = { courseId: string; moduleId: string };

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(createLessonSchema, req);
  const lesson = await createLesson(user, courseId, moduleId, input);
  return apiSuccess(lesson, { status: 201 });
});
