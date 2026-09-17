import { NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Clears a stale session cookie (its JWT is still cryptographically valid,
 * but the User row behind it is gone -- deleted, or the database was reset)
 * and sends the visitor to login. proxy.ts redirects here instead of
 * deleting the cookie itself: proxy runs inside the `auth()` wrapper, which
 * transparently re-issues a rolling session cookie on its own response,
 * silently undoing an in-place delete. A plain route handler has no such
 * interference, so the delete here actually sticks.
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}
