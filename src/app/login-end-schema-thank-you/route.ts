import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { renderThankYouDocument } from "../thank-you/thank-you-document";

/** The button on this page, as the funnel has it: on to the members area in GoHighLevel. */
const MEMBERS_AREA_BUTTON = {
  label: "Take Me To My Membership",
  href: "https://registration.parrotkindergarten.com/members-area-end-page",
};

/**
 * The thank-you page at the end of the funnel: the same document as
 * /thank-you (see src/app/thank-you) with the funnel's own button. A member
 * whose browser is still signed in opens it directly; anyone else is sent
 * to /login-end-schema to sign in, which then leads straight back here.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login-end-schema", req.nextUrl));
  }

  return new Response(renderThankYouDocument(MEMBERS_AREA_BUTTON), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
