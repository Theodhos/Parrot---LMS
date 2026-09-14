import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { getStudentAnalytics } from "@/features/analytics/services/student-analytics.service";

export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  const analytics = await getStudentAnalytics(user);
  return apiSuccess(analytics);
});
