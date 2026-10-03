import { z } from "zod";
import { CourseLevel, CourseStatus } from "@/generated/prisma";

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  thumbnail: z.string().url().optional().or(z.literal("")).optional(),
  categoryId: z.string().length(24).optional().nullable(),
  level: z.enum(CourseLevel).default(CourseLevel.BEGINNER),
  /** USD, whole dollars -- converted to cents when persisted. 0 (or omitted) means free/self-enroll. */
  price: z.coerce.number().min(0).max(10000).optional(),
  /** The GoHighLevel checkout page this course's "Buy" button links to. Empty clears it. */
  ghlCheckoutUrl: z
    .string()
    .trim()
    .url("Enter the full checkout URL, starting with https://")
    .refine((url) => /^https?:\/\//i.test(url), "Enter the full checkout URL, starting with https://")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const updateCourseStatusSchema = z.object({
  status: z.enum(CourseStatus),
});
export type UpdateCourseStatusInput = z.infer<typeof updateCourseStatusSchema>;

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  level: z.enum(CourseLevel).optional(),
  status: z.enum(CourseStatus).optional(),
  instructorId: z.string().length(24).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;

export const createRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(2000).optional(),
});
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
