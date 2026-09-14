import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateUserRoleSchema } from "@/features/users/schemas/user.schema";
import { updateUserRole } from "@/features/users/services/user.service";

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ userId: string }> }) => {
  const { userId } = await ctx.params;
  const admin = await requireCurrentUser();
  const { role } = await parseJsonBody(updateUserRoleSchema, req);
  const updated = await updateUserRole(admin, userId, role);
  return apiSuccess(updated);
});
