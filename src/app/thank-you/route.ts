import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { thankYouDocument } from "./thank-you-document";

/**
 * The thank-you page a buyer lands on the first time they sign in through
 * the login form (see loginAction); its "Access Course" button leads on to
 * the dashboard. Like /offer it is a self-contained HTML document with its
 * own stylesheet, outside the platform's layout and menu. Members only -- a
 * signed-out visitor is sent to sign in first.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", "/thank-you");
    return NextResponse.redirect(loginUrl);
  }

  return new Response(thankYouDocument, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
