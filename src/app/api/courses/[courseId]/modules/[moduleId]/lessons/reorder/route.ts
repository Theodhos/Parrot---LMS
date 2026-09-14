import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { reorderLessonsSchema } from "@/features/lessons/schemas/lesson.schema";
import { reorderLessons } from "@/features/lessons/services/lesson.service";

type Params = { courseId: string; moduleId: string };

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId } = await ctx.params;
  const user = await requireCurrentUser();
  const { orderedLessonIds } = await parseJsonBody(reorderLessonsSchema, req);
  const lessons = await reorderLessons(user, courseId, moduleId, orderedLessonIds);
  return apiSuccess(lessons);
});
