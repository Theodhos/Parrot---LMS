import { CalendarManager } from "@/components/admin/calendar-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { listAllEvents } from "@/features/calendar/services/calendar.service";

export default async function AdminCalendarPage() {
  const user = await requireCurrentUser();
  const events = await listAllEvents(user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm">
          Live calls, group sessions, reminders and releases that members see on their calendar.
        </p>
      </div>

      {/* Keyed by its rows: the manager copies them into state, so a refresh must re-seed it. */}
      <CalendarManager key={events.map((e) => `${e.id}:${e.rsvpCount}`).join(",")} initialEvents={events} />
    </div>
  );
}
