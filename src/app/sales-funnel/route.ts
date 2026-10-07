import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { offerDocument } from "../offer/offer-document";

/**
 * The sales-funnel page a member reaches right after signing in on
 * /login-thank-you. Its content is the private-sessions offer -- the very
 * same markup and stylesheet as /offer (src/app/offer), served under its
 * own address so the funnel can link to it. Members only -- a signed-out
 * visitor is sent to the funnel's sign-in page first.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login-thank-you", req.nextUrl));
  }

  return new Response(offerDocument, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
