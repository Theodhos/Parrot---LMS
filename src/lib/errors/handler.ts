import { NextRequest, NextResponse } from "next/server";
import { apiError, type ApiFailure } from "./api-response";

type RouteContext<Params> = { params: Promise<Params> };
type RouteHandler<Params, T> = (req: NextRequest, ctx: RouteContext<Params>) => Promise<NextResponse<T>>;

/**
 * Wraps an API route handler so every thrown AppError / ZodError / Prisma error
 * is converted into the shared { success, error } response shape instead of
 * leaking a raw 500 or an unhandled exception.
 */
export function withApiHandler<Params = Record<string, string>, T = unknown>(
  handler: RouteHandler<Params, T>,
): RouteHandler<Params, T | ApiFailure["error"]> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return apiError(error) as NextResponse<T | ApiFailure["error"]>;
    }
  };
}

export { apiSuccess, apiError } from "./api-response";
export * from "./app-error";
