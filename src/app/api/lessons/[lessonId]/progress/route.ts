import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors/app-error";
import { markLessonComplete, updateLessonPosition } from "@/features/progress/services/progress.service";
import { updateLessonPositionSchema } from "@/features/progress/schemas/progress.schema";

const bodySchema = z.union([
  z.object({ completed: z.literal(true) }),
  z.object({ completed: z.literal(false).optional() }).extend(updateLessonPositionSchema.shape),
]);

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ lessonId: string }> }) => {
  const { lessonId } = await ctx.params;
  const user = await requireCurrentUser();

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) throw new NotFoundError("Lesson");

  const body = bodySchema.parse(await req.json().catch(() => ({})));

  const result =
    "completed" in body && body.completed === true
      ? await markLessonComplete(user, lesson.courseId, lessonId)
      : await updateLessonPosition(user, lesson.courseId, lessonId, updateLessonPositionSchema.parse(body));

  return apiSuccess(result);
});
