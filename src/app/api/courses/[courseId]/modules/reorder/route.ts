import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { reorderModulesSchema } from "@/features/modules/schemas/module.schema";
import { reorderModules } from "@/features/modules/services/module.service";

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const { orderedModuleIds } = await parseJsonBody(reorderModulesSchema, req);
  const modules = await reorderModules(user, courseId, orderedModuleIds);
  return apiSuccess(modules);
});
