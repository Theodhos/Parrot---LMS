import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { renderOfferDocument } from "../offer/offer-document";

/** The checkout this step of the funnel sells: every "YES" button on the page leads here. */
const DOWNSELL_CHECKOUT_URL = "https://registration.parrotkindergarten.com/downlell2---checkout-page";

/**
 * The page a member reaches right after signing in on /login-thank-you:
 * the private-sessions offer (the same document as /offer, see
 * src/app/offer) with this funnel step's own checkout behind its buttons.
 * Members only -- a signed-out visitor is sent to the funnel's sign-in page.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login-thank-you", req.nextUrl));
  }

  return new Response(renderOfferDocument(DOWNSELL_CHECKOUT_URL), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
