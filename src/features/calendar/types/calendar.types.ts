import type { CalendarEventKind } from "@/generated/prisma";

export interface CalendarEventDTO {
  id: string;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  /** ISO timestamps (UTC); shown in each viewer's own time zone on the client. */
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  /** Live calls and group sessions take RSVPs; reminders and releases do not. */
  takesRsvp: boolean;
  rsvpedByMe: boolean;
  rsvpCount: number;
  /**
   * Where to join. Only sent to members who RSVP'd (and to staff), so the
   * link is not handed out to people who did not sign up.
   */
  joinUrl: string | null;
  hasJoinLink: boolean;
  /** The viewer may edit or delete it (an admin, or the instructor who created it). */
  canManage: boolean;
}
