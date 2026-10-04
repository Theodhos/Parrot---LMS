"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Settings2 } from "lucide-react";
import { EventRow } from "@/components/calendar/event-row";
import { useMounted } from "@/hooks/use-mounted";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";

const DAY_MS = 24 * 60 * 60 * 1000;
const GROUPS = ["Today", "This week", "Next week", "Later"] as const;
type Group = (typeof GROUPS)[number];

/**
 * Which heading an event falls under, by the viewer's own calendar (weeks
 * start on Monday). An all-day event is compared by its stored UTC date so it
 * lands on the day it was scheduled for.
 */
function groupOf(event: CalendarEventDTO, now: Date): Group {
  const start = new Date(event.startsAt);
  const eventDay = event.allDay
    ? new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    : new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (eventDay.getTime() <= today.getTime()) return "Today";
  const mondayOffset = (today.getDay() + 6) % 7;
  const nextMonday = new Date(today.getTime() + (7 - mondayOffset) * DAY_MS);
  if (eventDay < nextMonday) return "This week";
  if (eventDay.getTime() < nextMonday.getTime() + 7 * DAY_MS) return "Next week";
  return "Later";
}

export interface CalendarScheduleProps {
  events: CalendarEventDTO[];
  /** Staff get a shortcut to the page where events are created and edited. */
  canManage: boolean;
}

export function CalendarSchedule({ events, canManage }: CalendarScheduleProps) {
  const mounted = useMounted();
  // Read the clock once, when the page opens, rather than on every render.
  const [openedAt] = useState(() => new Date());

  // Grouping depends on the viewer's clock and time zone, so it happens in the browser.
  const grouped = mounted
    ? GROUPS.map((label) => ({ label, events: events.filter((event) => groupOf(event, openedAt) === label) })).filter(
        (group) => group.events.length > 0,
      )
    : [];

  return (
    <div className="flex w-full flex-col gap-6 pb-10">
      <div className="flex flex-col gap-4 rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-12">
        <div>
          <h1 className="font-heading mb-2 text-3xl font-bold text-[#1f1737] md:text-4xl">Calendar</h1>
          <p className="text-base font-medium text-[#6D5D3B]">
            Coaching calls, practice reminders, and everything else on the schedule.
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/calendar"
            className="flex w-fit items-center gap-2 rounded-full bg-[#1f1737] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#33265c]"
          >
            <Settings2 className="size-4" />
            Manage events
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <CalendarDays className="size-8 text-gray-400" />
          <p className="font-heading font-semibold text-[#1F2937]">Nothing scheduled yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            New coaching calls and practice sessions will show up here as soon as they are announced.
          </p>
        </div>
      ) : !mounted ? (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="h-28 animate-pulse rounded-3xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.label} className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold tracking-widest text-[#FF5757] uppercase">{group.label}</h2>
            <div className="flex flex-col gap-4">
              {group.events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
