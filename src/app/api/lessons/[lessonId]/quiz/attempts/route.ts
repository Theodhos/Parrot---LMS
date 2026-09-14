import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors/app-error";
import { submitQuizAttempt } from "@/features/quizzes/services/quiz.service";
import { submitQuizAttemptSchema } from "@/features/quizzes/schemas/quiz.schema";

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ lessonId: string }> }) => {
  const { lessonId } = await ctx.params;
  const user = await requireCurrentUser();

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) throw new NotFoundError("Lesson");

  const quiz = await prisma.quiz.findUnique({ where: { lessonId }, select: { id: true } });
  if (!quiz) throw new NotFoundError("Quiz");

  const input = await parseJsonBody(submitQuizAttemptSchema, req);
  const result = await submitQuizAttempt(user, lesson.courseId, quiz.id, input);
  return apiSuccess(result, { status: 201 });
});
