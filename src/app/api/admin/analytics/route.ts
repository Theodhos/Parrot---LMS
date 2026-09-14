import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { getAdminAnalytics } from "@/features/analytics/services/admin-analytics.service";

export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  const analytics = await getAdminAnalytics(user);
  return apiSuccess(analytics);
});
