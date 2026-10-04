import { z } from "zod";
import { CalendarEventKind } from "@/generated/prisma";

export const eventIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid id");

const eventFields = {
  title: z.string().trim().min(2, "Give the event a title").max(120),
  description: z.string().trim().max(2000).optional(),
  kind: z.enum(CalendarEventKind),
  /** ISO timestamps; the browser converts the admin's local date and time. */
  startsAt: z.string().datetime("Choose a start date and time"),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean(),
  joinUrl: z
    .string()
    .trim()
    .url("Enter the full link, starting with https://")
    .refine((url) => /^https?:\/\//i.test(url), "Enter the full link, starting with https://")
    .optional(),
};

const endsAfterStart = (event: { startsAt?: string; endsAt?: string }) =>
  !event.startsAt || !event.endsAt || new Date(event.endsAt) > new Date(event.startsAt);

export const createEventSchema = z
  .object(eventFields)
  .refine(endsAfterStart, { message: "The end must be after the start", path: ["endsAt"] });
export type CreateEventInput = z.infer<typeof createEventSchema>;

// Built from the fields directly rather than createEventSchema.partial(): an
// update names only what changes. `null` clears an optional field.
export const updateEventSchema = z
  .object({
    ...eventFields,
    description: eventFields.description.nullable(),
    endsAt: eventFields.endsAt.nullable(),
    joinUrl: eventFields.joinUrl.nullable(),
  })
  .partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
