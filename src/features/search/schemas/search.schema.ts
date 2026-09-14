import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
