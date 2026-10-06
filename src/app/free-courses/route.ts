import { freeClassDocument } from "./free-class-document";

// The page is the same for everyone and reads nothing per request.
export const dynamic = "force-static";

/**
 * The free Communication Class: a public page -- no sign-in, no platform
 * menu -- with the class videos and one button on to the registration
 * landing page. Like /offer and /thank-you it is a self-contained HTML
 * document with its own stylesheet, outside the platform's layout.
 */
export function GET() {
  return new Response(freeClassDocument, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
