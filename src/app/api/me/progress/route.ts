import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseSearchParams } from "@/lib/validation";
import { getCourseProgress } from "@/features/progress/services/progress.service";

const querySchema = z.object({ courseId: z.string().length(24) });

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const { courseId } = parseSearchParams(querySchema, req.nextUrl.searchParams);
  const summary = await getCourseProgress(user, courseId);
  return apiSuccess(summary);
});
