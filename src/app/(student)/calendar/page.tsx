import { requireCurrentUser } from "@/lib/auth/session";
import { CalendarSchedule } from "@/components/calendar/calendar-schedule";
import { listUpcomingEvents } from "@/features/calendar/services/calendar.service";
import { Role } from "@/generated/prisma";

export default async function CalendarPage() {
  const user = await requireCurrentUser();
  const events = await listUpcomingEvents(user);

  return (
    <CalendarSchedule
      // Keyed by the events and their RSVP state so a refresh after a change re-seeds each row.
      key={events.map((e) => `${e.id}:${e.rsvpedByMe}:${e.startsAt}`).join("|")}
      events={events}
      canManage={user.role === Role.ADMIN || user.role === Role.INSTRUCTOR}
    />
  );
}
