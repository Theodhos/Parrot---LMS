import { z } from "zod";

export const createModuleSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
});
export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = createModuleSchema.partial();
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const reorderModulesSchema = z.object({
  orderedModuleIds: z.array(z.string().length(24)).min(1),
});
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;
