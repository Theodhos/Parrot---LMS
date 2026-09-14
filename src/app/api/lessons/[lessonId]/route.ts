import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors/app-error";
import { getLearnLessonView } from "@/features/lessons/services/learning.service";

export const GET = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ lessonId: string }> }) => {
  const { lessonId } = await ctx.params;
  const user = await requireCurrentUser();

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) throw new NotFoundError("Lesson");

  const view = await getLearnLessonView(user, lesson.courseId, lessonId);
  return apiSuccess(view);
});
