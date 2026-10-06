import { FREE_CLASS_LESSONS } from "./free-class-lessons";

/** Where the big button under the lessons leads: the main registration landing page. */
const REGISTRATION_URL = "https://registration.parrotkindergarten.com/main-landing-page-2";

const firstLesson = FREE_CLASS_LESSONS[0]!;

/** For lesson text placed into the page as plain text (a lesson's `desc` is HTML already). */
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The <body> of the free class page. Styled by free-class-styles.ts; the
 * playlist is filled in by the script in free-class-document.ts. There is no
 * email gate: the page opens straight away for anyone with the link.
 */
export const freeClassMarkup = `
<!-- FIRST SCREEN (top bar + hero) — fills 100vh -->
<div class="hero-shell">

<!-- TOP BAR -->
<div class="topbar">
  <div class="container">
    <span class="topbar-badge">You're in</span>
    <span>Your free class is unlocked — press play whenever you're ready.</span>
  </div>
</div>

<!-- HERO + BIG VIDEO -->
<section class="hero" id="top">
  <div class="container">
    <div class="hero-inner fade-in">
      <div class="hero-eyebrow">
        <span class="eyebrow-text">You made it in</span>
      </div>
      <h1 class="hero-headline">
        Your Bird's <span class="accent">First Conversation</span><br>Starts Right Here
      </h1>
      <p class="hero-sub">
        Welcome to the <strong>free Communication Class</strong>. Press play, grab two small objects your bird likes, and let's go.
      </p>
    </div>

    <!-- STAGE: big player on the left, clickable video playlist on the right -->
    <div class="hero-stage fade-in">
      <div class="stage-main">
        <div class="stage-video-frame">
          <video id="pkPlayer" controls playsinline preload="metadata">
            <source id="pkPlayerSrc" src="${escapeHtml(firstLesson.src)}" type="video/mp4">
            Your browser doesn't support embedded video.
          </video>
        </div>
        <div class="stage-caption">
          <div class="stage-eyebrow" id="pkNowEyebrow">${escapeHtml(firstLesson.caption)}</div>
          <h3 class="stage-title" id="pkNowTitle">${escapeHtml(firstLesson.title)}</h3>
          <p class="stage-desc" id="pkNowDesc">${firstLesson.desc}</p>
        </div>
      </div>

      <aside class="stage-playlist" aria-label="Class lessons">
        <div class="playlist-head">
          <span class="playlist-head-title">Your lessons</span>
          <span class="playlist-count" id="pkCount">${FREE_CLASS_LESSONS.length} videos</span>
        </div>
        <div class="playlist-scroll" id="pkPlaylist"><!-- rendered by JS --></div>
      </aside>
    </div>
  </div>
</section>

</div><!-- /hero-shell -->

<!-- WAVE — flows straight into the dark "keep going" section -->
<div class="wave-divider" aria-hidden="true">
  <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none">
    <path d="M0,20 Q180,40 360,20 Q540,0 720,20 Q900,40 1080,20 Q1260,0 1440,20 L1440,40 L0,40 Z" fill="#1F142B"/>
  </svg>
</div>

<!-- KEEP GOING — big button to another page -->
<section class="nextstep" id="keep-going">
  <div class="nextstep-orbit" aria-hidden="true"></div>
  <div class="nextstep-orbit two" aria-hidden="true"></div>
  <div class="container">
    <div class="nextstep-inner fade-in">
      <div class="nextstep-badge">Want to keep going?</div>
      <h2>This Class Is One Tool.<br>Here's Everything It Opens Up.</h2>
      <p>The full Parrot Kindergarten curriculum is built on top of this — reading, counting, color identification, tablet games, communication boards, story time, the whole thing.</p>
      <p>Five minutes a day, every day, compounds into something extraordinary over the course of a year.</p>
      <div class="nextstep-cta">
        <a href="${REGISTRATION_URL}" class="btn-primary btn-glow">See What's Inside Parrot Kindergarten →</a>
      </div>
      <p class="nextstep-note">No pressure. The free class is yours either way — use it for as long as it serves you.</p>
    </div>
  </div>
</section>

<!-- CLOSING -->
<section class="closing">
  <div class="container">
    <div class="closing-inner fade-in">
      <div class="closing-divider">
        <div class="closing-divider-line"></div>
        <div class="closing-divider-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3C9 3 7 5 7 7c0 1.5.8 2.8 2 3.5L7 14l-2 4h4l1-2h4l1 2h4l-2-4-2-3.5c1.2-.7 2-2 2-3.5 0-2-2-4-5-4z" fill="rgba(255,255,255,.95)"/><circle cx="10" cy="7" r=".9" fill="#EB6B62"/></svg>
        </div>
        <div class="closing-divider-line"></div>
      </div>
      <div class="closing-sig">
        Loving your bird right back,
        <span>Jen · Parrot Kindergarten</span>
      </div>
      <div class="ps-card">
        <span class="ps-icon">📌</span>
        <p><strong>P.S.</strong> Your lessons stay right here at the top of this page. Come back any time — five minutes a day is all it takes.</p>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="container">
    <div class="footer-brand">
      Parrot Kindergarten · Free Communication Class
    </div>
    <div class="footer-copy">© 2026 Parrot Kindergarten. All rights reserved.</div>
  </div>
</footer>
`;
