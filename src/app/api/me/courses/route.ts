import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { listMyEnrollments } from "@/features/enrollments/services/enrollment.service";

export const GET = withApiHandler(async () => {
  const user = await requireCurrentUser();
  const enrollments = await listMyEnrollments(user);
  return apiSuccess(enrollments);
});
