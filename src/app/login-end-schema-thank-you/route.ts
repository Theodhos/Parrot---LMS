import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { renderThankYouDocument } from "../thank-you/thank-you-document";
import { ACCESS_COURSE_BUTTON } from "../thank-you/thank-you-markup";

/**
 * The thank-you page at the end of the funnel: the same document as
 * /thank-you (see src/app/thank-you), with the "Access Course" button into
 * the dashboard and without the note about a scheduling email. A member
 * whose browser is still signed in opens it directly; anyone else is sent
 * to /login-end-schema to sign in, which then leads straight back here.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login-end-schema", req.nextUrl));
  }

  return new Response(renderThankYouDocument({ button: ACCESS_COURSE_BUTTON, emailNote: false }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
