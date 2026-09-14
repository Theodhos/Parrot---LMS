import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { getQuizForTaking } from "@/features/quizzes/services/quiz.service";

export const GET = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ lessonId: string }> }) => {
  const { lessonId } = await ctx.params;
  await requireCurrentUser();
  const quiz = await getQuizForTaking(lessonId);
  return apiSuccess(quiz);
});
