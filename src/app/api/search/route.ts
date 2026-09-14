import type { NextRequest } from "next/server";
import { apiSuccess, withApiHandler } from "@/lib/errors/handler";
import { parseSearchParams } from "@/lib/validation";
import { searchQuerySchema } from "@/features/search/schemas/search.schema";
import { searchCourses } from "@/features/search/services/search.service";

export const GET = withApiHandler(async (req: NextRequest) => {
  const query = parseSearchParams(searchQuerySchema, req.nextUrl.searchParams);
  const results = await searchCourses(query);
  return apiSuccess(results);
});
