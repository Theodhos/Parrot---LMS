import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EventRow } from "@/components/calendar/event-row";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";

/** The next few events on the schedule, with the same RSVP and add-to-calendar actions as the full calendar. */
export function ThisWeekCard({ events }: { events: CalendarEventDTO[] }) {
  return (
    <div className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <span className="mb-6 text-[11px] font-bold tracking-widest text-[#FF5757] uppercase">Coming Up</span>

      {events.length === 0 ? (
        <p className="text-muted-foreground mb-6 text-sm">Nothing scheduled yet. Check back soon.</p>
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          {events.map((event) => (
            <EventRow key={`${event.id}:${event.rsvpedByMe}`} event={event} compact />
          ))}
        </div>
      )}

      <div className="mt-auto flex justify-center border-t border-gray-100 pt-4">
        <Link
          href="/calendar"
          className="flex items-center gap-2 text-sm font-bold text-[#3B82F6] transition-colors hover:text-blue-700"
        >
          View Full Calendar
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
