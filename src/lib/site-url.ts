import "server-only";

/** This app's own public origin, no trailing slash. Used to build absolute links (Stripe redirects, activation emails/links, etc). */
export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3010").replace(/\/+$/, "");
}
