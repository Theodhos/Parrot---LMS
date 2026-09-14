import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { createQuizSchema } from "@/features/quizzes/schemas/quiz.schema";
import { createQuiz, updateQuiz } from "@/features/quizzes/services/quiz.service";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors/app-error";

type Params = { courseId: string; moduleId: string; lessonId: string };

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { lessonId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(createQuizSchema, req);
  const quiz = await createQuiz(user, lessonId, input);
  return apiSuccess(quiz, { status: 201 });
});

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { lessonId } = await ctx.params;
  const user = await requireCurrentUser();
  const existing = await prisma.quiz.findUnique({ where: { lessonId }, select: { id: true } });
  if (!existing) throw new NotFoundError("Quiz");
  const input = await parseJsonBody(createQuizSchema, req);
  const quiz = await updateQuiz(user, lessonId, existing.id, input);
  return apiSuccess(quiz);
});
