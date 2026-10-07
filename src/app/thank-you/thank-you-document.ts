import { ACCESS_COURSE_BUTTON, renderThankYouMarkup, type ThankYouOptions } from "./thank-you-markup";
import { thankYouStyles } from "./thank-you-styles";

/**
 * The complete HTML document of the thank-you page, with the given button
 * and options. Served at /thank-you (see route.ts) and, with its own
 * options, at /login-end-schema-thank-you.
 */
export function renderThankYouDocument(options: ThankYouOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Thank You | Parrot Kindergarten</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,700&display=swap" rel="stylesheet">
<style>${thankYouStyles}</style>
</head>
<body>
${renderThankYouMarkup(options)}
</body>
</html>`;
}

/** The document served at /thank-you: the page with its "Access Course" button and the email note. */
export const thankYouDocument = renderThankYouDocument({ button: ACCESS_COURSE_BUTTON, emailNote: true });
