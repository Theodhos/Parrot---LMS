/** GoHighLevel checkout for the 12-session package on /offer: every "YES" button leads here. */
export const OFFER_CHECKOUT_URL = "https://registration.parrotkindergarten.com/chechout-after-page-522121";
/** Where "No thanks" takes the member: into the platform. */
const MEMBERS_AREA_URL = "/dashboard";

/**
 * The <body> of the offer page, with every "YES" button leading to
 * `checkoutUrl`. Styled by offer-styles.ts; no platform layout or menu
 * around it. The same offer is served at more than one address, each with
 * its own checkout (see offer-document.ts).
 */
export function renderOfferMarkup(checkoutUrl: string): string {
  const yesButton = (label: string, attributes = "") =>
    `<a class="btn-primary" href="${checkoutUrl}"${attributes}>${label}</a>`;

  return `
<!-- TOP BAR -->
<div class="topbar">
  <div class="container">
    <span id="demo1"><strong>This offer lives on this page only</strong> — it's gone the moment you leave.</span>
    <div class="topbar-urgency">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      One-time price. No second chance at $50/session.
    </div>
  </div>
</div>

<!-- HERO -->
<section class="hero" id="top">
  <div class="hero-deco" aria-hidden="true">
    <svg style="top:8%;right:4%;opacity:.07;width:170px" viewBox="0 0 100 200" fill="none">
      <path d="M50 10 Q80 50 70 100 Q60 150 50 190 Q40 150 30 100 Q20 50 50 10Z" fill="#EB6B62"/>
      <line x1="50" y1="10" x2="50" y2="190" stroke="#EB6B62" stroke-width="1.5"/>
    </svg>
    <svg style="bottom:6%;left:3%;opacity:.06;width:140px" viewBox="0 0 100 200" fill="none">
      <path d="M50 10 Q80 50 70 100 Q60 150 50 190 Q40 150 30 100 Q20 50 50 10Z" fill="#EB6B62"/>
      <line x1="50" y1="10" x2="50" y2="190" stroke="#EB6B62" stroke-width="1.5"/>
    </svg>
  </div>
  <div class="container">
    <div class="hero-inner fade-in">
      <div class="alert-pill">
        <span>One More Thing — Only For A Real Behavior Case</span>
      </div>
      <h1 class="hero-headline">
        12 Private Sessions With <span class="accent">Justice Bellar,</span> CPBT-KA — For The Bird You <span class="italic">Can't Crack On Your Own</span>
      </h1>
      <p class="hero-sub">
        Twelve one-on-one Zoom sessions with one of the most respected parrot behavior professionals in the country. <strong>$600 total. $50 a session.</strong> Only available right here, right now — you won't see it again at this price.
      </p>

      <div class="price-flash">
        <div class="pf-cell"><div class="pf-num">12</div><div class="pf-label">Private Sessions</div></div>
        <div class="pf-cell"><div class="pf-num gold">$600</div><div class="pf-label">Total, Paid Once</div></div>
        <div class="pf-cell"><div class="pf-num">$50</div><div class="pf-label">Per Session</div></div>
      </div>

      <div class="hero-cta-wrap">
        ${yesButton("YES, Add 12 Sessions For $600")}
        <div class="urgency-line">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          This $50/session price disappears when you leave this page.
        </div>
      </div>

      <div class="hero-trust-row">
        <div class="trust-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#EB6B62"/></svg>14-Day Refund</div>
        <div class="trust-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#EB6B62"/><path d="M8 12l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>CPBT-KA Certified</div>
        <div class="trust-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#EB6B62"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>~80% Off Public Rate</div>
      </div>
    </div>
  </div>
</section>

<!-- LETTER -->
<section class="letter">
  <div class="container">
    <div class="narrow">
      <div class="letter-card fade-in">
        <div class="letter-from">
          <div class="letter-avatar">
            <img src="https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/69f3959822c9963731a74c55.jpg" alt="Jen Taylor-O'Connor, founder of Parrot Kindergarten" loading="lazy" width="108" height="108"/>
          </div>
          <div class="letter-from-meta">
            <b>Hi friend, it's Jen.</b>
            <span>Founder, Parrot Kindergarten</span>
          </div>
        </div>
        <p>The curriculum, the Thursday calls, the monthly behavior workshops with Justice, the community — for the vast majority of caregivers, <strong>that's everything.</strong> Their bird improves, the screaming quiets down, the bond deepens, and they never need anything more.</p>
        <p>But some of you came in carrying something heavier. A bird who's been plucking for years. A rescue with trauma you'll never fully know about. A fear-aggressive bird who can't be in the same room as your partner. A multi-bird household where the dynamics have gotten complicated.</p>
        <p class="lede">If that's you, this page is the reason I'm writing it.</p>
      </div>
    </div>
  </div>
</section>

<!-- WAVE -->
<div class="wave-divider" aria-hidden="true">
  <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
    <path d="M0,24 Q180,48 360,24 Q540,0 720,24 Q900,48 1080,24 Q1260,0 1440,24 L1440,48 L0,48 Z" fill="#1F142B"/>
  </svg>
</div>

<!-- PROBLEM -->
<section class="problem">
  <div class="container">
    <div class="problem-head fade-in">
      <div class="section-eyebrow"><span style="color:#EB6B62">When The Curriculum Isn't Enough</span></div>
      <h2 class="section-title" style="color:#FCFCFC">Some Cases Need Eyes On Your Specific Bird.</h2>
      <p class="section-body" style="color:rgba(255,255,255,.78);max-width:620px">If your bird is screaming, biting, plucking, fearful, aggressive, or struggling in a way you can't crack on your own, general advice only takes you so far. These are the situations Justice was built for.</p>
    </div>

    <div class="problem-grid fade-in">
      <div class="problem-img-wrap">
        <img src="https://images.pexels.com/photos/34410226/pexels-photo-34410226.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=720" alt="African grey parrot showing signs of stress and feather damage — a real behavior case" loading="lazy" width="720" height="900"/>
        <div class="problem-img-overlay"></div>
        <div class="problem-img-badge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19h20L12 2z" fill="#fff"/><line x1="12" y1="9" x2="12" y2="14" stroke="#EB6B62" stroke-width="2"/><circle cx="12" cy="17" r="1" fill="#EB6B62"/></svg>
          A hard case isn't a failure — it's a case that needs a professional in your corner.
        </div>
      </div>
      <div class="problem-cards">
        <div class="problem-card">
          <div class="pcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L3 14.7V21h6.3l10.1-10.1a5.5 5.5 0 0 0 0-7.8z" stroke="#EB6B62" stroke-width="1.7"/><line x1="16" y1="8" x2="3" y2="21" stroke="#EB6B62" stroke-width="1.4"/></svg></div>
          <div><div class="pcard-title">Years Of Plucking</div><div class="pcard-text">A bird who's been pulling feathers for years — long enough that it's become a pattern no quick fix touches.</div></div>
        </div>
        <div class="problem-card">
          <div class="pcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#EB6B62" stroke-width="1.7"/><path d="M9 9l6 6M15 9l-6 6" stroke="#EB6B62" stroke-width="1.5" stroke-linecap="round"/></svg></div>
          <div><div class="pcard-title">Rescue With Trauma</div><div class="pcard-text">A history you'll never fully know about — and a bird who needs someone reading the specific signs, not a generic plan.</div></div>
        </div>
        <div class="problem-card">
          <div class="pcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 18h18M8 18V9M16 18V9M5 9h14" stroke="#EB6B62" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="5" r="2" stroke="#EB6B62" stroke-width="1.6"/></svg></div>
          <div><div class="pcard-title">Fear-Aggression</div><div class="pcard-text">A bird who can't be in the same room as your partner — where the wrong move sets everyone back weeks.</div></div>
        </div>
        <div class="problem-card">
          <div class="pcard-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11c2.2 0 4-2 4-4S11.2 3 9 3 5 5 5 7s1.8 4 4 4z" stroke="#EB6B62" stroke-width="1.6"/><path d="M17 13c1.7 0 3-1.6 3-3.5S18.7 6 17 6" stroke="#EB6B62" stroke-width="1.6"/><path d="M2 20c0-3 3.1-5 7-5s7 2 7 5M16 20c0-2-1-3.6-2.7-4.4" stroke="#EB6B62" stroke-width="1.6" stroke-linecap="round"/></svg></div>
          <div><div class="pcard-title">Complicated Multi-Bird Dynamics</div><div class="pcard-text">A household where the relationships between birds have tangled up, and every change ripples across the whole flock.</div></div>
        </div>
      </div>
    </div>

    <div class="bridge-card fade-in">
      <div class="bridge-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M12 5l7 7-7 7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="bridge-text">
        <h3>There's A Professional For Exactly This</h3>
        <p>You don't have to white-knuckle a hard case alone. The next part of this page is about who steps in — and why $600 for twelve hours of her time is the part that doesn't make sense until you see her rate.</p>
      </div>
      ${yesButton("See The Offer →", ' style="white-space:nowrap;flex-shrink:0;font-size:14px;padding:13px 22px;animation:none"')}
    </div>
  </div>
</section>

<!-- WAVE -->
<div class="wave-divider" aria-hidden="true">
  <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
    <path d="M0,24 Q180,0 360,24 Q540,48 720,24 Q900,0 1080,24 Q1260,48 1440,24 L1440,0 L0,0 Z" fill="#1F142B"/>
  </svg>
</div>

<!-- SOLUTION / WHAT YOU GET -->
<section class="solution">
  <div class="container">
    <div class="solution-grid fade-in">
      <div>
        <div class="section-eyebrow" style="color:var(--teal-dark)"><span>What You Actually Get</span></div>
        <h2 class="section-title">Twelve Hours Of One-On-One Professional Behavior Support</h2>
        <p class="section-body" style="margin-bottom:18px">Twelve one-hour private Zoom sessions with Justice Bellar, CPBT-KA. You schedule them when you need them. She watches <em>your</em> specific bird, in <em>your</em> specific home, with <em>your</em> specific situation — and she works the case with you across all twelve sessions.</p>
        <p class="section-body" style="margin-bottom:0">That's it. Twelve hours of one-on-one professional behavior support, paid for in advance — at a price we don't offer anywhere else.</p>
        <div class="highlight-card">
          <h4>Not A Group Call. Not General Advice.</h4>
          <p>This is your bird, your room, your case — watched and worked by a professional behavior consultant, over time, until you see real movement.</p>
        </div>
      </div>
      <div class="get-card">
        <div class="get-card-top">
          <span class="get-tag">The $600 Package</span>
          <div class="get-price">$600 <small>total</small></div>
          <div class="get-price-sub">12 private sessions · just $50 each</div>
        </div>
        <div class="get-list">
          <div class="get-item"><div class="get-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p><strong>12 one-hour private Zoom sessions</strong> with Justice Bellar, CPBT-KA.</p></div>
          <div class="get-item"><div class="get-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p><strong>You schedule them when you need them</strong> — book the first, then space the rest as the case unfolds.</p></div>
          <div class="get-item"><div class="get-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>She works <strong>your specific bird, in your specific home,</strong> across all twelve sessions.</p></div>
          <div class="get-item"><div class="get-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p><strong>Same 14-day refund</strong> as the membership — full $600 back if it's not the right fit.</p></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- INSTRUCTOR -->
<section class="instructor" id="justice">
  <div class="container">
    <div class="instructor-grid fade-in">
      <div class="instructor-img-card">
        <div class="instructor-img-outer">
          <div class="instructor-img-ring">
            <div class="instructor-img-ring-inner">
              <div class="instructor-img-inner">
                <img src="https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/69f3959822c9963731a74c55.jpg" alt="Justice Bellar, CPBT-KA — Certified Behavior Professional" loading="lazy" width="230" height="230"/>
              </div>
            </div>
          </div>
          <div class="instructor-badge-cert">CPBT-KA</div>
        </div>
        <h3 class="section-title" style="text-align:center;font-size:22px;margin-bottom:4px">Justice Bellar</h3>
        <p style="text-align:center;font-size:13px;color:var(--text-muted);margin-bottom:20px">CPBT-KA · Certified Parrot Behavior &amp; Training Professional</p>
        <div class="instructor-stats">
          <div class="istat"><div class="istat-num">100s</div><div class="istat-label">Rescue Cases&#10;Managed</div></div>
          <div class="istat"><div class="istat-num">$240</div><div class="istat-label">Public Rate&#10;Per Session</div></div>
          <div class="istat"><div class="istat-num">1:1</div><div class="istat-label">Private&#10;Your Bird</div></div>
        </div>
      </div>
      <div>
        <div class="section-eyebrow" style="color:var(--teal-dark)"><span>Who Justice Is</span></div>
        <h2 class="section-title">The Person You Want In Your Corner.</h2>
        <p class="bio-text">Justice is certified through the <strong>International Avian Certification Board</strong> and is a graduate of <strong>Dr. Susan Friedman's Professional Learning and Living with Animals</strong> program — the gold standard in applied behavior education.</p>
        <p class="bio-text">She spent years as the <strong>Behavior and Training Coordinator at The Gabriel Foundation</strong>, one of the largest parrot sanctuaries in the world — managing behavior cases for hundreds of rescue parrots and the families who adopted them.</p>
        <div class="achievements">
          <div class="achievement-item">
            <div class="ach-icon" style="background:#FCFCFC"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7L12 16l-6.3 4.3 2.3-7-6-4.4h7.6z" stroke="#ABBE62" stroke-width="1.7" stroke-linejoin="round"/></svg></div>
            <div class="ach-text"><h4>International Avian Certification Board</h4><p>Certified CPBT-KA — a credential held by a small number of behavior professionals worldwide.</p></div>
          </div>
          <div class="achievement-item">
            <div class="ach-icon" style="background:#FCFCFC"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#74AEF7" stroke-width="1.8"/><polyline points="9 22 9 12 15 12 15 22" stroke="#74AEF7" stroke-width="1.7"/></svg></div>
            <div class="ach-text"><h4>Dr. Susan Friedman's PLLA Graduate</h4><p>Trained in the science of applied behavior analysis for living and working with animals.</p></div>
          </div>
          <div class="achievement-item">
            <div class="ach-icon" style="background:#FCFCFC"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3C9 3 7 5 7 8c0 2 1 3.4 2.4 4.4C8.4 14 8 16 9 17.5c.8 1.2 2.5 1.5 3 1.5s2.2-.3 3-1.5c1-1.5.6-3.5-.4-5C16 11.4 17 10 17 8c0-3-2-5-5-5z" stroke="#EB6B62" stroke-width="1.7"/><circle cx="10" cy="8" r=".9" fill="#EB6B62"/></svg></div>
            <div class="ach-text"><h4>Years At The Gabriel Foundation</h4><p>Behavior &amp; Training Coordinator at one of the world's largest parrot sanctuaries — hundreds of cases, real outcomes.</p></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- WAVE -->
<div class="wave-divider" aria-hidden="true">
  <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
    <path d="M0,24 Q180,48 360,24 Q540,0 720,24 Q900,48 1080,24 Q1260,0 1440,24 L1440,48 L0,48 Z" fill="#1F142B"/>
  </svg>
</div>

<!-- THE MATH -->
<section class="math">
  <div class="container">
    <div class="math-head fade-in">
      <div class="section-eyebrow" style="color:#FEDB7F;justify-content:center"><span>The Math — Because The Price Tells The Whole Story</span></div>
      <h2 class="section-title" style="color:#FCFCFC">Same Twelve Sessions. Three Very Different Prices.</h2>
    </div>
    <div class="math-grid fade-in">
      <div class="math-card">
        <div class="mc-label">Justice's Public Rate</div>
        <div class="mc-rate"><span class="strike">$240</span> <span class="per">/ session</span></div>
        <div class="mc-total">12 sessions = <b class="strike">$2,880</b></div>
      </div>
      <div class="math-card win">
        <div class="win-flag">On This Page · Today Only</div>
        <div class="mc-label" style="color:#FEDB7F">This Package</div>
        <div class="mc-rate">$50 <span class="per" style="color:#FEDB7F">/ session</span></div>
        <div class="mc-total">12 sessions = <b>$600</b></div>
      </div>
      <div class="math-card">
        <div class="mc-label">Normal Member Rate</div>
        <div class="mc-rate"><span class="strike">~$120</span> <span class="per">/ session</span></div>
        <div class="mc-total">12 sessions = <b class="strike">$1,440</b></div>
      </div>
    </div>
    <p class="math-saving fade-in">That's roughly <b>80% off her public rate.</b> We don't offer this price anywhere else, and we don't offer it again after you leave this page.</p>
  </div>
</section>

<!-- NO EXPIRATION -->
<section class="noexp">
  <div class="container">
    <div class="narrow">
      <div class="noexp-card fade-in">
        <div class="noexp-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2.5" stroke="#EB6B62" stroke-width="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="#EB6B62" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="#EB6B62" stroke-width="1.8" stroke-linecap="round"/><line x1="3" y1="9" x2="21" y2="9" stroke="#EB6B62" stroke-width="1.8"/><path d="M8 14l2.5 2.5L15 12" stroke="#EB6B62" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="noexp-text">
          <h3>Use Them When You Need Them. No Expiration Pressure.</h3>
          <p>Once you order, you'll get an email to schedule your first session at a time that works for you. After that, you book the rest as the case unfolds. Some members use all twelve in three months working a hard case; some space them across the year. You don't have to plan it now — just have them ready when you need them.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FIT -->
<section class="fit">
  <div class="container">
    <div class="fit-head fade-in">
      <div class="section-eyebrow" style="color:var(--teal-dark);justify-content:center"><span>Honestly — Is This For You?</span></div>
      <h2 class="section-title" style="margin:0 auto">Most Members Don't Need This. Some Genuinely Do.</h2>
    </div>
    <div class="fit-grid">
      <div class="fit-col no fade-in">
        <h3>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EB6B62" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="16" stroke="#EB6B62" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="8" x2="8" y2="16" stroke="#EB6B62" stroke-width="2" stroke-linecap="round"/></svg>
          This Is NOT For You If…
        </h3>
        <p class="fit-sub">Skip it — keep the $600 and use the curriculum first.</p>
        <div class="fit-list">
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/></svg></div><p>Your bird is <strong>already doing well</strong>, or improving steadily on the curriculum alone.</p></div>
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/></svg></div><p>You <strong>haven't actually started the lessons yet.</strong> Do those first — the curriculum solves more than people expect.</p></div>
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round"/></svg></div><p>You're hoping a session will <strong>"fix" your bird in one call.</strong> Behavior work is iterative — it takes a few sessions to see real movement.</p></div>
        </div>
        <p class="fit-note">If any of those describe you, skip this offer. You can always book individual sessions at the member rate later if you change your mind.</p>
      </div>
      <div class="fit-col yes fade-in">
        <h3>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EB6B62" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="#EB6B62" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          This IS For You If…
        </h3>
        <p class="fit-sub">You need a professional working your case over time.</p>
        <div class="fit-list">
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>Your bird is <strong>plucking, biting, fear-aggressive, or screaming</strong> in ways the group calls and workshops haven't been able to solve.</p></div>
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>You've got a <strong>rescue or a complicated history</strong> and you know you need eyes on your specific situation, not general advice.</p></div>
          <div class="fit-item"><div class="fit-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#EB6B62" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p>You want <strong>Justice working the case with you over time</strong> — not in a single one-off call.</p></div>
        </div>
        <p class="fit-note">If that's you, this is the one page where twelve hours of her time costs $600 instead of $2,880.</p>
      </div>
    </div>
  </div>
</section>

<!-- GUARANTEE -->
<section class="guarantee">
  <div class="container">
    <div class="guar-card fade-in">
      <div class="guar-seal">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V5z" stroke="#fff" stroke-width="1.6"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="guar-text">
        <h3>The Same 14-Day Refund — Even On This.</h3>
        <p>If within 14 days of your first session you feel like it's not the right fit, email us. We'll refund the full $600. Same rule as the membership. No catch, no hard feelings.</p>
      </div>
    </div>
  </div>
</section>

<!-- REGISTRATION / FINAL CTA -->
<section class="registration" id="register">
  <div class="container">
    <div class="reg-inner fade-in">
      <div class="reg-mascot">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none"><path d="M14 3c-3.3 0-6 2.4-6 6 0 2 .9 3.4 2.3 4.6L8 18l-3 3h6l1.2-2.4c.6.1 1.2.1 1.8 0C18 18 21 14 21 9c0-3.4-2.7-6-7-6z" fill="rgba(254,219,127,.9)"/><circle cx="12" cy="8" r="1.2" fill="#1F142B"/></svg>
      </div>
      <p class="reg-recap">12 sessions. <b>$50 each.</b> Justice in your corner for as long as the case takes.</p>
      <div class="reg-cta-wrap">
        ${yesButton("YES, Add 12 Sessions For $600", ' id="yes-btn"')}
        <a class="btn-ghost" id="no-btn" href="${MEMBERS_AREA_URL}">No thanks, take me to the membership</a>
      </div>
      <div class="reg-chips">
        <div class="reg-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17 23 7" fill="rgba(255,255,255,.78)" opacity=".6"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="rgba(255,255,255,.78)" stroke-width="1.8"/></svg>Private on Zoom</div>
        <div class="reg-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.78)" stroke-width="1.8"/><polyline points="12 7 12 12 15 14" stroke="rgba(255,255,255,.78)" stroke-width="2" stroke-linecap="round"/></svg>No Expiration</div>
        <div class="reg-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="rgba(255,255,255,.78)" stroke-width="1.8"/></svg>14-Day Refund</div>
        <div class="reg-chip" style="color:#FEDB7F"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FEDB7F" stroke-width="1.8"/><path d="M12 7v10M7 12h10" stroke="#FEDB7F" stroke-width="2" stroke-linecap="round"/></svg>~80% Off</div>
      </div>
      <p class="reg-fine">This price is only available on this page. After you leave, individual sessions are bookable at the member rate (~$120 each), but the 12-pack at $600 is gone.</p>
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3C9 3 7 5 7 7c0 1.5.8 2.8 2 3.5L7 14l-2 4h4l1-2h4l1 2h4l-2-4-2-3.5c1.2-.7 2-2 2-3.5 0-2-2-4-5-4z" fill="rgba(255,255,255,.9)"/><circle cx="10" cy="7" r=".9" fill="#EB6B62"/></svg>
        </div>
        <div class="closing-divider-line"></div>
      </div>
      <p class="closing-quote">"I'd rather you keep the $600 and use the curriculum first — unless you're carrying one of the <span>hard cases this was built for.</span>"</p>
      <p class="closing-sub">Either way, I'll see you on Thursday.</p>
      ${yesButton("YES, Add 12 Sessions For $600", ' style="animation:none;margin-bottom:8px"')}
      <div class="closing-sig">
        Loving your bird right back,<br>Jen
        <small>Parrot Kindergarten</small>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="container">
    <div class="footer-brand">
      Parrot Kindergarten · Members Behavior Offer
    </div>
    <div class="footer-copy">© 2026 Parrot Kindergarten. All rights reserved.</div>
  </div>
</footer>
`;
}
