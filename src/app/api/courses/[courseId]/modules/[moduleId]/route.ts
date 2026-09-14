import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateModuleSchema } from "@/features/modules/schemas/module.schema";
import { deleteModule, updateModule } from "@/features/modules/services/module.service";

type Params = { courseId: string; moduleId: string };

export const PATCH = withApiHandler(async (req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(updateModuleSchema, req);
  const updated = await updateModule(user, courseId, moduleId, input);
  return apiSuccess(updated);
});

export const DELETE = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<Params> }) => {
  const { courseId, moduleId } = await ctx.params;
  const user = await requireCurrentUser();
  await deleteModule(user, courseId, moduleId);
  return apiSuccess({ deleted: true });
});
