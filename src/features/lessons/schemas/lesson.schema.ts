import { z } from "zod";
import { LessonType } from "@/generated/prisma";

const lessonFields = {
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  content: z.string().max(200_000).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")).optional(),
  duration: z.coerce.number().int().min(0),
  type: z.enum(LessonType),
  published: z.boolean(),
};

export const createLessonSchema = z.object({
  ...lessonFields,
  duration: lessonFields.duration.default(0),
  type: lessonFields.type.default(LessonType.ARTICLE),
  published: lessonFields.published.default(false),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// Built from the default-free fields, NOT createLessonSchema.partial(): zod
// applies a field's default even when the field is optional, so a partial
// update like `{ published: true }` would silently reset the lesson's type to
// ARTICLE and its duration to 0.
export const updateLessonSchema = z.object(lessonFields).partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const reorderLessonsSchema = z.object({
  orderedLessonIds: z.array(z.string().length(24)).min(1),
});
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
