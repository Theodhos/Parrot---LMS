import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { createModuleSchema } from "@/features/modules/schemas/module.schema";
import { createModule, listModules } from "@/features/modules/services/module.service";

export const GET = withApiHandler(async (_req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const modules = await listModules(user, courseId);
  return apiSuccess(modules);
});

export const POST = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const { courseId } = await ctx.params;
  const user = await requireCurrentUser();
  const input = await parseJsonBody(createModuleSchema, req);
  const created = await createModule(user, courseId, input);
  return apiSuccess(created, { status: 201 });
});
