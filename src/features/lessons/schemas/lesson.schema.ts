import { z } from "zod";
import { LessonType } from "@/generated/prisma";

export const createLessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  content: z.string().max(200_000).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")).optional(),
  duration: z.coerce.number().int().min(0).default(0),
  type: z.enum(LessonType).default(LessonType.ARTICLE),
  published: z.boolean().default(false),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonSchema.partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const reorderLessonsSchema = z.object({
  orderedLessonIds: z.array(z.string().length(24)).min(1),
});
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
