import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { CalendarEventKind, Role } from "@/generated/prisma";
import { ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import {
  createEvent,
  deleteEvent,
  listAllEvents,
  listAttendees,
  listUpcomingEvents,
  toggleRsvp,
  updateEvent,
} from "./calendar.service";

describe("calendar.service (local MongoDB-backed)", () => {
  const stamp = Date.now();
  const ids = { admin: "", instructor: "", otherInstructor: "", student: "" };
  const session = (id: string, role: Role) => ({ id, role, name: "User", email: "", wordpressUserId: null }) as never;
  const admin = () => session(ids.admin, Role.ADMIN);
  const instructor = () => session(ids.instructor, Role.INSTRUCTOR);
  const otherInstructor = () => session(ids.otherInstructor, Role.INSTRUCTOR);
  const student = () => session(ids.student, Role.STUDENT);

  const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000).toISOString();
  // The schedule is shared with whatever real events exist; look only at this test's own.
  const title = (label: string) => `${label} ${stamp}`;
  const mine = (events: { title: string }[]) => events.filter((e) => e.title.endsWith(String(stamp))).map((e) => e.title);

  let callId: string;

  beforeAll(async () => {
    const create = (label: string, role: Role) =>
      prisma.user.create({ data: { name: label, email: `calendar-${label}-${stamp}@test.local`, role } });
    ids.admin = (await create("admin", Role.ADMIN)).id;
    ids.instructor = (await create("instructor", Role.INSTRUCTOR)).id;
    ids.otherInstructor = (await create("other", Role.INSTRUCTOR)).id;
    ids.student = (await create("student", Role.STUDENT)).id;
  });

  afterAll(async () => {
    // Events cascade from their creators, RSVPs from events and users.
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  });

  it("lets staff create events and refuses a student", async () => {
    const call = await createEvent(instructor(), {
      title: title("Coaching Call"),
      description: "Live Q&A",
      kind: CalendarEventKind.CALL,
      startsAt: hours(48),
      endsAt: hours(49),
      allDay: false,
      joinUrl: "https://meet.example.com/call",
    });
    callId = call.id;
    expect(call).toMatchObject({ takesRsvp: true, rsvpCount: 0, canManage: true, joinUrl: "https://meet.example.com/call" });

    await createEvent(admin(), { title: title("Practice Reminder"), kind: CalendarEventKind.REMINDER, startsAt: hours(24), allDay: true });
    await createEvent(admin(), { title: title("Old Session"), kind: CalendarEventKind.SESSION, startsAt: hours(-72), allDay: false });

    await expect(
      createEvent(student(), { title: title("Nope"), kind: CalendarEventKind.CALL, startsAt: hours(1), allDay: false }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects an end before the start, and a link that is not a web address", async () => {
    const base = { title: title("Bad"), kind: CalendarEventKind.CALL, allDay: false };
    await expect(createEvent(admin(), { ...base, startsAt: hours(5), endsAt: hours(4) })).rejects.toThrow();
    await expect(createEvent(admin(), { ...base, startsAt: hours(5), joinUrl: "javascript:alert(1)" })).rejects.toThrow();
  });

  it("shows members the upcoming schedule soonest first, without past events", async () => {
    expect(mine(await listUpcomingEvents(student()))).toEqual([title("Practice Reminder"), title("Coaching Call")]);
    // Staff see everything, newest first, past events included.
    expect(mine(await listAllEvents(admin()))).toEqual([
      title("Coaching Call"),
      title("Practice Reminder"),
      title("Old Session"),
    ]);
    await expect(listAllEvents(student())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("keeps the join link from a member until they RSVP, and takes it back when they cancel", async () => {
    const before = (await listUpcomingEvents(student())).find((e) => e.id === callId)!;
    expect(before).toMatchObject({ joinUrl: null, hasJoinLink: true, rsvpedByMe: false, canManage: false });

    const joined = await toggleRsvp(student(), callId);
    expect(joined).toMatchObject({ rsvpedByMe: true, rsvpCount: 1, joinUrl: "https://meet.example.com/call" });
    expect((await listAttendees(instructor(), callId)).map((a) => a.id)).toEqual([ids.student]);

    const cancelled = await toggleRsvp(student(), callId);
    expect(cancelled).toMatchObject({ rsvpedByMe: false, rsvpCount: 0, joinUrl: null });
  });

  it("does not take RSVPs for a reminder or for an event that is over", async () => {
    const all = await listAllEvents(admin());
    const reminder = all.find((e) => e.title === title("Practice Reminder"))!;
    const old = all.find((e) => e.title === title("Old Session"))!;
    expect(reminder.takesRsvp).toBe(false);
    await expect(toggleRsvp(student(), reminder.id)).rejects.toBeInstanceOf(ValidationError);
    await expect(toggleRsvp(student(), old.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("lets the creator and an admin change an event, but not another instructor", async () => {
    await expect(updateEvent(otherInstructor(), callId, { title: title("Hijacked") })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteEvent(otherInstructor(), callId)).rejects.toBeInstanceOf(ForbiddenError);

    const renamed = await updateEvent(instructor(), callId, { title: title("Coaching Call (moved)") });
    // Only the title changed.
    expect(renamed).toMatchObject({ kind: "CALL", allDay: false, joinUrl: "https://meet.example.com/call" });
    expect(renamed.description).toBe("Live Q&A");

    const cleared = await updateEvent(admin(), callId, { joinUrl: null, endsAt: null });
    expect(cleared).toMatchObject({ joinUrl: null, hasJoinLink: false, endsAt: null });
    await expect(updateEvent(admin(), callId, { endsAt: hours(1) })).rejects.toBeInstanceOf(ValidationError);
  });

  it("deletes an event along with its RSVPs", async () => {
    await toggleRsvp(student(), callId);
    await deleteEvent(admin(), callId);
    expect(await prisma.eventRsvp.count({ where: { eventId: callId } })).toBe(0);
    expect(mine(await listUpcomingEvents(student()))).toEqual([title("Practice Reminder")]);
  });
});
