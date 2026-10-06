import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { offerDocument } from "./offer-document";

/**
 * The one-time private-sessions offer a buyer lands on straight after
 * creating their login on /welcome. Served as a self-contained HTML document
 * rather than a page: it is a standalone landing page with its own
 * stylesheet, and must not pick up the platform's layout, menu or styles.
 * Members only -- a signed-out visitor is sent to sign in first.
 */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", "/offer");
    return NextResponse.redirect(loginUrl);
  }

  return new Response(offerDocument, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
