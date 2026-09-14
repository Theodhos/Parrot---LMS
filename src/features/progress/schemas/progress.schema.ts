import { z } from "zod";

export const updateLessonPositionSchema = z.object({
  lastPosition: z.coerce.number().int().min(0).default(0),
  progressPercent: z.coerce.number().min(0).max(100).default(0),
});
export type UpdateLessonPositionInput = z.infer<typeof updateLessonPositionSchema>;

export const markLessonCompleteSchema = z.object({
  courseId: z.string().length(24),
});
export type MarkLessonCompleteInput = z.infer<typeof markLessonCompleteSchema>;
