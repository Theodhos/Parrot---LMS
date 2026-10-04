/**
 * Builds the calendar file (.ics, RFC 5545) and the Google Calendar link for
 * an event, so "Add to Calendar" puts it in the member's own calendar app.
 * Pure: used by the download route and by the browser.
 */

export interface CalendarExportEvent {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  joinUrl: string | null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 2026-05-16T19:00:00.000Z -> 20260516T190000Z */
const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** 2026-05-16T19:00:00.000Z -> 20260516 */
const utcDay = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

/** A timed event without an end lasts an hour; an all-day one covers its day(s). The end is exclusive. */
function resolveSpan(event: CalendarExportEvent): { start: Date; end: Date } {
  const start = new Date(event.startsAt);
  if (event.allDay) {
    const lastDay = event.endsAt ? new Date(event.endsAt) : start;
    return { start, end: new Date(Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()) + DAY_MS) };
  }
  return { start, end: event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + HOUR_MS) };
}

/** Text values escape backslash, semicolon, comma and line breaks. */
const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets are folded onto continuation lines that start with a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join("\r\n");
}

function describe(event: CalendarExportEvent): string {
  return [event.description, event.joinUrl ? `Join: ${event.joinUrl}` : null].filter(Boolean).join("\n\n");
}

export function buildIcs(event: CalendarExportEvent, options: { host: string; now?: Date }): string {
  const { start, end } = resolveSpan(event);
  const description = describe(event);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Parrot Kindergarten//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${options.host}`,
    `DTSTAMP:${utcStamp(options.now ?? new Date())}`,
    event.allDay ? `DTSTART;VALUE=DATE:${utcDay(start)}` : `DTSTART:${utcStamp(start)}`,
    event.allDay ? `DTEND;VALUE=DATE:${utcDay(end)}` : `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    ...(event.joinUrl ? [`URL:${event.joinUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(event: CalendarExportEvent): string {
  const { start, end } = resolveSpan(event);
  const dates = event.allDay ? `${utcDay(start)}/${utcDay(end)}` : `${utcStamp(start)}/${utcStamp(end)}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  const details = describe(event);
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
