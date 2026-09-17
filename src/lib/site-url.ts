import "server-only";
import { headers } from "next/headers";

/**
 * Static fallback only -- prefer requestSiteUrl() in any request-scoped code
 * (Server Actions, Route Handlers). This depends on NEXTAUTH_URL being kept
 * in sync with wherever the app is actually deployed, which is exactly the
 * kind of thing that goes stale (a Vercel URL changes, an env var doesn't
 * get updated) and silently sends links to the wrong host.
 */
export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3010").replace(/\/+$/, "");
}

/** Derives the origin from the incoming request's Host header, so links/redirects always point wherever the visitor actually is -- correct on Vercel (production, preview, custom domains) and local dev alike, with no env var to keep in sync. Call from a Server Action or Server Component. */
export async function requestSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return siteUrl();
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return siteUrl();
  }
}

/** Same as requestSiteUrl(), but for Route Handlers, which get a plain Request/NextRequest instead of next/headers(). */
export function siteUrlFromHeaders(requestHeaders: Headers): string {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return siteUrl();
  const proto =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}
