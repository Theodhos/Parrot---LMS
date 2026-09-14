import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseSearchParams } from "@/lib/validation";
import { listUsersQuerySchema } from "@/features/users/schemas/user.schema";
import { listUsers } from "@/features/users/services/user.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const query = parseSearchParams(listUsersQuerySchema, req.nextUrl.searchParams);
  const result = await listUsers(user, query);
  return apiSuccess(result.items, {
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, pageCount: result.pageCount },
  });
});
