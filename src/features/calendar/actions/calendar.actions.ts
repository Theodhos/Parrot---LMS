"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { eventIdSchema, type CreateEventInput, type UpdateEventInput } from "@/features/calendar/schemas/calendar.schema";
import * as calendar from "@/features/calendar/services/calendar.service";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";

export type CalendarActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/** Runs a calendar operation for the signed-in user and returns failures as a message the UI can show. */
async function run<T>(
  operation: (user: Awaited<ReturnType<typeof requireCurrentUser>>) => Promise<T>,
): Promise<CalendarActionResult<T>> {
  try {
    return { success: true, data: await operation(await requireCurrentUser()) };
  } catch (error) {
    if (error instanceof ZodError) return { success: false, error: error.issues[0]?.message ?? "Invalid input" };
    if (error instanceof AppError) return { success: false, error: error.message };
    console.error(`[calendar] ${error instanceof Error ? error.message : error}`);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/** The schedule shows on the calendar page, the student dashboard and the admin list. */
function refresh() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/admin/calendar");
}

export async function toggleRsvpAction(eventId: string): Promise<CalendarActionResult<CalendarEventDTO>> {
  const result = await run((user) => calendar.toggleRsvp(user, eventIdSchema.parse(eventId)));
  if (result.success) refresh();
  return result;
}

export async function createEventAction(input: CreateEventInput): Promise<CalendarActionResult<CalendarEventDTO>> {
  const result = await run((user) => calendar.createEvent(user, input));
  if (result.success) refresh();
  return result;
}

export async function updateEventAction(
  eventId: string,
  input: UpdateEventInput,
): Promise<CalendarActionResult<CalendarEventDTO>> {
  const result = await run((user) => calendar.updateEvent(user, eventIdSchema.parse(eventId), input));
  if (result.success) refresh();
  return result;
}

export async function deleteEventAction(eventId: string): Promise<CalendarActionResult> {
  const result = await run(async (user) => {
    await calendar.deleteEvent(user, eventIdSchema.parse(eventId));
    return undefined;
  });
  if (result.success) refresh();
  return result;
}

export async function listAttendeesAction(
  eventId: string,
): Promise<CalendarActionResult<{ id: string; name: string; email: string }[]>> {
  return run((user) => calendar.listAttendees(user, eventIdSchema.parse(eventId)));
}
