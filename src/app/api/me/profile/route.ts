import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { parseJsonBody } from "@/lib/validation";
import { updateProfileSchema } from "@/features/users/schemas/user.schema";
import { getProfile, updateProfile } from "@/features/users/services/user.service";

export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  const profile = await getProfile(user);
  return apiSuccess(profile);
});

export const PATCH = withApiHandler(async (req: NextRequest) => {
  const user = await requireCurrentUser();
  const input = await parseJsonBody(updateProfileSchema, req);
  const profile = await updateProfile(user, input);
  return apiSuccess(profile);
});
