import { thankYouMarkup } from "./thank-you-markup";
import { thankYouStyles } from "./thank-you-styles";

/** The complete HTML document served at /thank-you (see route.ts). */
export const thankYouDocument = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Thank You | Parrot Kindergarten</title>
<link rel="icon" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,700&display=swap" rel="stylesheet">
<style>${thankYouStyles}</style>
</head>
<body>
${thankYouMarkup}
</body>
</html>`;
