import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { parseJsonBody } from "@/lib/validation";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { registerUser } from "@/features/auth/services/auth.service";

export const POST = withApiHandler(async (req: NextRequest) => {
  const input = await parseJsonBody(registerSchema, req);
  const user = await registerUser(input);
  return apiSuccess(user, { status: 201 });
});
