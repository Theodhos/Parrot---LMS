import "server-only";
import { prisma } from "@/lib/db/client";
import { CalendarEventKind, Role, type Prisma } from "@/generated/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors/app-error";
import { requireRole, type SessionUser } from "@/lib/permissions";
import {
  createEventSchema,
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/features/calendar/schemas/calendar.schema";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";

const isStaff = (role: Role) => role === Role.ADMIN || role === Role.INSTRUCTOR;

/** Live calls and group sessions are attended, so they take RSVPs; reminders and releases just happen. */
const takesRsvp = (kind: CalendarEventKind) => kind === CalendarEventKind.CALL || kind === CalendarEventKind.SESSION;

/** An event stays on the "upcoming" list until this long after it started (or until its end, if it has one). */
const STARTED_GRACE_MS = 2 * 60 * 60 * 1000;

const eventInclude = { rsvps: { select: { userId: true } } } satisfies Prisma.CalendarEventInclude;
type EventRow = Prisma.CalendarEventGetPayload<{ include: typeof eventInclude }>;

/** An admin manages every event; an instructor the ones they created. */
function canManage(viewer: SessionUser, event: { createdById: string }): boolean {
  return viewer.role === Role.ADMIN || (viewer.role === Role.INSTRUCTOR && event.createdById === viewer.id);
}

function toDTO(event: EventRow, viewer: SessionUser): CalendarEventDTO {
  const rsvpedByMe = event.rsvps.some((r) => r.userId === viewer.id);
  const rsvp = takesRsvp(event.kind);
  // The join link goes to people who signed up (and staff). An event that
  // takes no RSVPs has nothing to sign up for, so its link is open.
  const mayJoin = isStaff(viewer.role) || rsvpedByMe || !rsvp;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    allDay: event.allDay,
    takesRsvp: rsvp,
    rsvpedByMe,
    rsvpCount: event.rsvps.length,
    joinUrl: mayJoin ? event.joinUrl : null,
    hasJoinLink: Boolean(event.joinUrl),
    canManage: canManage(viewer, event),
  };
}

/**
 * An all-day event is stored at 12:00 UTC of its date (so it reads as the
 * same calendar day everywhere); it stays listed until that day is over in
 * every time zone west of UTC as well.
 */
const ALL_DAY_GRACE_MS = 24 * 60 * 60 * 1000;

/** Not finished yet: it has not started, started recently, or has an end still in the future. */
function upcomingFilter(now: Date): Prisma.CalendarEventWhereInput {
  return {
    OR: [
      { startsAt: { gte: new Date(now.getTime() - STARTED_GRACE_MS) } },
      { endsAt: { gte: now } },
      { allDay: true, startsAt: { gte: new Date(now.getTime() - ALL_DAY_GRACE_MS) } },
    ],
  };
}

/** What every signed-in member sees: the schedule from now on, soonest first. */
export async function listUpcomingEvents(
  viewer: SessionUser,
  options: { limit?: number; now?: Date } = {},
): Promise<CalendarEventDTO[]> {
  const events = await prisma.calendarEvent.findMany({
    where: upcomingFilter(options.now ?? new Date()),
    orderBy: { startsAt: "asc" },
    take: options.limit ?? 100,
    include: eventInclude,
  });
  return events.map((event) => toDTO(event, viewer));
}

/** The admin panel's list: everything, past events included, newest first. */
export async function listAllEvents(staff: SessionUser): Promise<CalendarEventDTO[]> {
  requireRole(staff, Role.ADMIN, Role.INSTRUCTOR);
  const events = await prisma.calendarEvent.findMany({
    orderBy: { startsAt: "desc" },
    take: 200,
    include: eventInclude,
  });
  return events.map((event) => toDTO(event, staff));
}

export async function getEvent(viewer: SessionUser, eventId: string): Promise<CalendarEventDTO> {
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId }, include: eventInclude });
  if (!event) throw new NotFoundError("Event");
  return toDTO(event, viewer);
}

export async function createEvent(staff: SessionUser, input: CreateEventInput): Promise<CalendarEventDTO> {
  requireRole(staff, Role.ADMIN, Role.INSTRUCTOR);
  const data = createEventSchema.parse(input);
  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description || null,
      kind: data.kind,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      allDay: data.allDay,
      joinUrl: data.joinUrl || null,
      createdById: staff.id,
    },
    include: eventInclude,
  });
  return toDTO(event, staff);
}

async function getManageableEvent(staff: SessionUser, eventId: string) {
  requireRole(staff, Role.ADMIN, Role.INSTRUCTOR);
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event");
  if (!canManage(staff, event)) throw new ForbiddenError("You can only change events you created");
  return event;
}

export async function updateEvent(
  staff: SessionUser,
  eventId: string,
  input: UpdateEventInput,
): Promise<CalendarEventDTO> {
  const existing = await getManageableEvent(staff, eventId);
  const data = updateEventSchema.parse(input);

  const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
  const endsAt = data.endsAt === undefined ? existing.endsAt : data.endsAt ? new Date(data.endsAt) : null;
  if (endsAt && endsAt <= startsAt) throw new ValidationError("The end must be after the start");

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.allDay !== undefined ? { allDay: data.allDay } : {}),
      ...(data.joinUrl !== undefined ? { joinUrl: data.joinUrl || null } : {}),
      startsAt,
      endsAt,
    },
    include: eventInclude,
  });
  return toDTO(event, staff);
}

export async function deleteEvent(staff: SessionUser, eventId: string): Promise<void> {
  await getManageableEvent(staff, eventId);
  await prisma.calendarEvent.delete({ where: { id: eventId } });
}

/**
 * Signs the member up, or takes them off the list if they were on it.
 * Only for events that take RSVPs and have not already ended.
 */
export async function toggleRsvp(
  user: SessionUser,
  eventId: string,
  now: Date = new Date(),
): Promise<CalendarEventDTO> {
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event");
  if (!takesRsvp(event.kind)) throw new ValidationError("This event does not take RSVPs");

  const over = (event.endsAt ?? new Date(event.startsAt.getTime() + STARTED_GRACE_MS)) < now;
  if (over) throw new ValidationError("This event has already taken place");

  const key = { eventId_userId: { eventId, userId: user.id } };
  const existing = await prisma.eventRsvp.findUnique({ where: key, select: { id: true } });
  if (existing) {
    await prisma.eventRsvp.delete({ where: { id: existing.id } });
  } else {
    // upsert, not create: a double click must not fail on the unique index.
    await prisma.eventRsvp.upsert({ where: key, create: { eventId, userId: user.id }, update: {} });
  }
  return getEvent(user, eventId);
}

/** Who signed up, for the staff member running the event. */
export async function listAttendees(staff: SessionUser, eventId: string) {
  await getManageableEvent(staff, eventId);
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return rsvps.map((r) => r.user);
}
