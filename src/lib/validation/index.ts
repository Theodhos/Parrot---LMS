import type { ZodType, z } from "zod";

/** Converts a URLSearchParams into a plain object and parses it with the given schema. */
export function parseSearchParams<S extends ZodType>(schema: S, searchParams: URLSearchParams): z.infer<S> {
  return schema.parse(Object.fromEntries(searchParams.entries()));
}

export async function parseJsonBody<S extends ZodType>(schema: S, req: Request): Promise<z.infer<S>> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body);
}
