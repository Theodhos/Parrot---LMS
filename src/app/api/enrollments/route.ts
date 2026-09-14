import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { enrollInCourse } from "@/features/enrollments/services/enrollment.service";

const enrollSchema = z.object({ courseId: z.string().length(24) });

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const { courseId } = await parseJsonBody(enrollSchema, req);
  const enrollment = await enrollInCourse(user, courseId);
  return apiSuccess(enrollment, { status: 201 });
});
