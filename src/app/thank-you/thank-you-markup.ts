/** The one button on the thank-you page: what it says and where it leads. */
export interface ThankYouButton {
  label: string;
  href: string;
}

/** The button of /thank-you: into the platform. */
export const ACCESS_COURSE_BUTTON: ThankYouButton = { label: "Access Course", href: "/dashboard" };

/**
 * The <body> of the thank-you page, with the given button. Styled by
 * thank-you-styles.ts; no platform layout or menu around it. The same page
 * is served at more than one address, each with its own button (see
 * thank-you-document.ts).
 */
export function renderThankYouMarkup(button: ThankYouButton): string {
  return `
<div id="ty-page">

  <div class="ty-bg-deco" aria-hidden="true">
    <svg style="top:8%;left:5%;opacity:.06;width:130px" viewBox="0 0 100 200" fill="none">
      <path d="M50 10 Q80 50 70 100 Q60 150 50 190 Q40 150 30 100 Q20 50 50 10Z" fill="#EB6B62"/>
      <line x1="50" y1="10" x2="50" y2="190" stroke="#EB6B62" stroke-width="1.5"/>
    </svg>
    <svg style="bottom:7%;right:5%;opacity:.07;width:150px" viewBox="0 0 100 200" fill="none">
      <path d="M50 10 Q80 50 70 100 Q60 150 50 190 Q40 150 30 100 Q20 50 50 10Z" fill="#EB6B62"/>
      <line x1="50" y1="10" x2="50" y2="190" stroke="#EB6B62" stroke-width="1.5"/>
    </svg>
  </div>

  <main class="ty-card">
    <div class="ty-check">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>

    <div class="ty-eyebrow">Payment Confirmed</div>

    <h1 class="ty-h1">Thank You — Justice Is <span class="ty-accent">In Your Corner.</span></h1>

    <p class="ty-lede">
      Your <strong>12 private one-on-one sessions</strong> with Justice Bellar, CPBT-KA, are confirmed. Twelve hours of professional behavior support — ready whenever your case needs them.
    </p>

    <div class="ty-email">
      <div class="ty-email-ico">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#fff" stroke-width="1.8"/><path d="M4 7l8 6 8-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <h3>Check your inbox — an email is on the way.</h3>
        <p>In the next few minutes you'll get an email with a link to <strong>schedule your first session</strong> at a time that works for you. After that, you book the rest as the case unfolds — no expiration, no pressure.</p>
      </div>
    </div>

    <div class="ty-order">
      <div class="ty-order-item"><div class="ty-order-num">12</div><div class="ty-order-label">Sessions</div></div>
      <div class="ty-order-sep"></div>
      <div class="ty-order-item"><div class="ty-order-num ty-gold">$600</div><div class="ty-order-label">Paid In Full</div></div>
      <div class="ty-order-sep"></div>
      <div class="ty-order-item"><div class="ty-order-num">14-Day</div><div class="ty-order-label">Refund</div></div>
    </div>

    <a class="ty-btn" href="${button.href}">
      ${button.label}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>

    <div class="ty-signoff">
      See you on Thursday — and loving your bird right back,<br>Jen
      <small>Parrot Kindergarten</small>
    </div>

    <p class="ty-support">Didn't get the email within 10 minutes? Check spam, or reach us at <a href="mailto:support@parrotkindergarten.com">support@parrotkindergarten.com</a>.</p>
  </main>
</div>
`;
}
