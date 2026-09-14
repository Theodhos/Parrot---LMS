import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseSearchParams } from "@/lib/validation";
import { listCourseEnrollments } from "@/features/enrollments/services/enrollment.service";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const { page, pageSize } = parseSearchParams(querySchema, req.nextUrl.searchParams);
  const result = await listCourseEnrollments(user, courseId, page, pageSize);
  return apiSuccess(result.enrollments, { meta: { total: result.total, page, pageSize } });
});
