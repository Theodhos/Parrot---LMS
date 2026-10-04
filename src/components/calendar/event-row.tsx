"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, CalendarPlus, Check, ExternalLink, Sparkles, Users, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { toggleRsvpAction } from "@/features/calendar/actions/calendar.actions";
import { googleCalendarUrl } from "@/features/calendar/ics";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";
import type { CalendarEventKind } from "@/generated/prisma";

const KIND_ICON: Record<CalendarEventKind, typeof Users> = {
  CALL: Users,
  SESSION: Video,
  REMINDER: Bell,
  RELEASE: Sparkles,
};

/**
 * Date parts in the viewer's own time zone. An all-day event is stored at
 * 12:00 UTC of its date and read back in UTC, so it shows the same calendar
 * day to everyone instead of sliding to the day before or after.
 */
export function eventDateParts(event: Pick<CalendarEventDTO, "startsAt" | "endsAt" | "allDay">) {
  const start = new Date(event.startsAt);
  const zone = event.allDay ? { timeZone: "UTC" } : {};
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { ...options, ...zone }).format(start);
  const time = (date: Date, withZone = false) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      ...(withZone ? { timeZoneName: "short" } : {}),
    }).format(date);

  return {
    weekday: part({ weekday: "short" }).toUpperCase(),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
    time: event.allDay
      ? "All day"
      : event.endsAt
        ? `${time(start)} – ${time(new Date(event.endsAt), true)}`
        : time(start, true),
  };
}

export interface EventRowProps {
  event: CalendarEventDTO;
  /** Tighter layout without the description, for the dashboard card. */
  compact?: boolean;
  className?: string;
}

/**
 * One event with everything a member can do with it: RSVP (and cancel),
 * join once signed up, and add it to their own calendar.
 */
export function EventRow({ event: initialEvent, compact = false, className }: EventRowProps) {
  const [event, setEvent] = useState(initialEvent);
  const [pending, startTransition] = useTransition();
  const mounted = useMounted();
  const parts = mounted ? eventDateParts(event) : null;
  const Icon = KIND_ICON[event.kind];

  function toggleRsvp() {
    startTransition(async () => {
      const result = await toggleRsvpAction(event.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEvent(result.data);
      if (result.data.rsvpedByMe) {
        toast.success(`You're in for ${event.title}.`, {
          description: result.data.joinUrl ? "The join link is now on the event." : "We saved your spot.",
        });
      } else {
        toast("RSVP cancelled.", { description: event.title });
      }
    });
  }

  return (
    <div
      id={`event-${event.id}`}
      className={cn(
        "flex scroll-mt-24 gap-4",
        compact
          ? "items-center"
          : "flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-7",
        className,
      )}
    >
      {/* min-w-0 lets the title truncate instead of pushing the buttons off a narrow screen. */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className={cn("flex shrink-0 flex-col items-center justify-center", compact ? "w-12" : "w-14")}>
          <div className="flex h-5 w-full items-center justify-center rounded-t-md bg-[#3B82F6] text-[10px] font-bold text-white">
            {parts?.weekday ?? " "}
          </div>
          <div
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-b-md border border-t-0 border-[#E5E7EB] bg-white font-bold text-[#1F2937]",
              compact ? "h-8 text-xs" : "h-11 text-sm leading-tight",
            )}
          >
            {parts?.day ?? " "}
            {!compact && <span className="text-[9px] font-semibold text-gray-500 uppercase">{parts?.month}</span>}
          </div>
        </div>

        {!compact && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E6F3FB] text-[#3B82F6]">
            <Icon className="size-5" />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading truncate font-semibold text-[#1F2937]">{event.title}</span>
          <span className="text-muted-foreground text-xs">
            {parts?.time ?? " "}
            {event.takesRsvp && event.rsvpCount > 0 && ` · ${event.rsvpCount} going`}
          </span>
          {!compact && event.description && (
            <p className="mt-1 text-sm break-words whitespace-pre-line text-[#4B5563]">{event.description}</p>
          )}
          {!compact && event.takesRsvp && event.hasJoinLink && !event.joinUrl && (
            <p className="mt-1 text-xs text-gray-500">RSVP to get the link to join.</p>
          )}
        </div>
      </div>

      <div className={cn("flex shrink-0 flex-wrap items-center gap-2", compact && "justify-end")}>
        {event.takesRsvp && (
          <button
            type="button"
            onClick={toggleRsvp}
            disabled={pending}
            aria-pressed={event.rsvpedByMe}
            title={event.rsvpedByMe ? "Click to cancel your RSVP" : undefined}
            className={cn(
              "flex items-center justify-center gap-1 rounded-full px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60",
              event.rsvpedByMe
                ? "bg-[#E8F5E9] text-[#10B981] hover:bg-green-100"
                : "bg-[#3B82F6] text-white hover:bg-blue-600",
            )}
          >
            {event.rsvpedByMe && <Check className="size-3.5" />}
            {pending ? "Saving..." : event.rsvpedByMe ? "You're in" : "RSVP"}
          </button>
        )}

        {event.joinUrl && (
          <a
            href={event.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-full bg-[#1f1737] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#33265c]"
          >
            <ExternalLink className="size-3.5" />
            Join
          </a>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center justify-center gap-1 rounded-full text-xs font-bold transition-colors outline-none",
              compact && event.takesRsvp
                ? "size-8 bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-[#E8F5E9] px-4 py-2 text-[#10B981] hover:bg-green-100",
            )}
            aria-label="Add to calendar"
          >
            <CalendarPlus className="size-3.5" />
            {!(compact && event.takesRsvp) && "Add to Calendar"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={<a href={`/api/calendar/events/${event.id}/ics`} download />}
              onClick={() => toast.success("Calendar file downloaded.", { description: "Open it to add the event." })}
            >
              Apple, Outlook or phone (.ics)
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" />}>
              Google Calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
