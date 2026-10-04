import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/errors/handler";
import { requireCurrentUser } from "@/lib/auth/session";
import { eventIdSchema } from "@/features/calendar/schemas/calendar.schema";
import { getEvent } from "@/features/calendar/services/calendar.service";
import { buildIcs } from "@/features/calendar/ics";

/**
 * "Add to Calendar": downloads the event as an .ics file, which every
 * calendar app (Apple, Outlook, Google, phones) opens and adds. Signed-in
 * members only; the join link is included only for those who may see it
 * (see calendar.service's toDTO).
 */
export const GET = withApiHandler(async (req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) => {
  const { eventId } = await ctx.params;
  const user = await requireCurrentUser();
  const event = await getEvent(user, eventIdSchema.parse(eventId));

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "parrot-lms";
  const fileName = `${event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`;

  return new Response(buildIcs(event, { host }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  }) as never;
});
