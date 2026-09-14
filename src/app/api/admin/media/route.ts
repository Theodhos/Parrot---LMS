import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseSearchParams } from "@/lib/validation";
import { listAllMedia } from "@/features/media/services/media.service";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const admin = await requireCurrentUser();
  const { page, pageSize } = parseSearchParams(querySchema, req.nextUrl.searchParams);
  const result = await listAllMedia(admin, page, pageSize);
  return apiSuccess(result.items, { meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
});
