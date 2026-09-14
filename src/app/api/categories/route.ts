import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { listCategories } from "@/features/courses/services/course.service";

export const GET = withApiHandler(async () => {
  const categories = await listCategories();
  return apiSuccess(categories);
});
