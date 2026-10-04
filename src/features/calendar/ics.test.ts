import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "./ics";

const call = {
  id: "abc123",
  title: "Coaching Call; Q&A, live",
  description: "Bring your questions.\nAll levels welcome.",
  startsAt: "2026-10-15T19:00:00.000Z",
  endsAt: "2026-10-15T20:30:00.000Z",
  allDay: false,
  joinUrl: "https://meet.example.com/room",
};
const options = { host: "parrot-lms.vercel.app", now: new Date("2026-10-01T08:00:00.000Z") };

describe("buildIcs", () => {
  it("writes a timed event with UTC start and end, escaped text and the join link", () => {
    const ics = buildIcs(call, options);
    const lines = ics.split("\r\n");

    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("UID:abc123@parrot-lms.vercel.app");
    expect(lines).toContain("DTSTAMP:20261001T080000Z");
    expect(lines).toContain("DTSTART:20261015T190000Z");
    expect(lines).toContain("DTEND:20261015T203000Z");
    expect(lines).toContain("SUMMARY:Coaching Call\\; Q&A\\, live");
    expect(ics).toContain("DESCRIPTION:Bring your questions.\\nAll levels welcome.\\n\\nJoin: https://");
    expect(lines).toContain("URL:https://meet.example.com/room");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("gives a timed event without an end one hour", () => {
    expect(buildIcs({ ...call, endsAt: null }, options)).toContain("DTEND:20261015T200000Z");
  });

  it("writes an all-day event as dates, with the end on the following day", () => {
    const ics = buildIcs(
      { ...call, allDay: true, startsAt: "2026-10-17T12:00:00.000Z", endsAt: null, joinUrl: null, description: null },
      options,
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261017");
    expect(ics).toContain("DTEND;VALUE=DATE:20261018");
    expect(ics).not.toContain("DESCRIPTION");
    expect(ics).not.toContain("URL:");
  });

  it("folds lines longer than 75 characters", () => {
    const ics = buildIcs({ ...call, description: "x".repeat(200) }, options);
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
    // Unfolding restores the original value.
    expect(ics.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"x".repeat(200)}`);
  });
});

describe("googleCalendarUrl", () => {
  it("carries the title, the UTC span and the details", () => {
    const url = new URL(googleCalendarUrl(call));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Coaching Call; Q&A, live");
    expect(url.searchParams.get("dates")).toBe("20261015T190000Z/20261015T203000Z");
    expect(url.searchParams.get("details")).toContain("Join: https://meet.example.com/room");
  });

  it("uses plain dates for an all-day event", () => {
    const url = new URL(googleCalendarUrl({ ...call, allDay: true, startsAt: "2026-10-17T12:00:00.000Z", endsAt: null }));
    expect(url.searchParams.get("dates")).toBe("20261017/20261018");
  });
});
