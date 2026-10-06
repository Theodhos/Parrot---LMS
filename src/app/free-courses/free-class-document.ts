import { FREE_CLASS_LESSONS } from "./free-class-lessons";
import { freeClassMarkup } from "./free-class-markup";
import { freeClassStyles } from "./free-class-styles";

// "<" is escaped so no lesson text can close the <script> element it is embedded in.
const lessonsJson = JSON.stringify(FREE_CLASS_LESSONS).replace(/</g, "\\u003c");

/** The complete HTML document served at /free-courses (see route.ts). */
export const freeClassDocument = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Free Communication Class | Parrot Kindergarten</title>
<meta name="description" content="The free Parrot Kindergarten Communication Class: press play and teach your bird to tell you what they want.">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap" rel="stylesheet">
<style>${freeClassStyles}</style>
<noscript><style>.fade-in{opacity:1;transform:none}</style></noscript>
</head>
<body>
${freeClassMarkup}
<script>
// IntersectionObserver: fade-in
(function() {
  var fadeEls = document.querySelectorAll('.fade-in');
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  fadeEls.forEach(function(el) { obs.observe(el); });
})();

/* ============================================================
   VIDEO PLAYLIST — click a lesson on the right, it plays in
   the big player on the left. The lessons come from
   free-class-lessons.ts.
   ============================================================ */
(function () {
  var LESSONS = ${lessonsJson};

  var listEl   = document.getElementById('pkPlaylist');
  var playerEl = document.getElementById('pkPlayer');
  var srcEl    = document.getElementById('pkPlayerSrc');
  var eyebrowEl= document.getElementById('pkNowEyebrow');
  var titleEl  = document.getElementById('pkNowTitle');
  var descEl   = document.getElementById('pkNowDesc');
  var countEl  = document.getElementById('pkCount');
  if (!listEl || !playerEl) return;

  var PLAY_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="#1F142B"><path d="M8 5v14l11-7z"/></svg>';
  // The first lesson is already in the page when it arrives.
  var current = 0;

  countEl.textContent = LESSONS.length + ' videos';

  // Build the playlist
  LESSONS.forEach(function (l, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pl-item' + (i === current ? ' active' : '');
    btn.setAttribute('data-i', i);
    btn.innerHTML =
      '<span class="pl-thumb"><span class="pl-num">' + l.num + '</span>' +
        '<span class="pl-play">' + PLAY_SVG + '</span></span>' +
      '<span class="pl-meta">' +
        '<span class="pl-eyebrow">' + l.eyebrow + '</span>' +
        '<span class="pl-title">' + l.title + '</span>' +
        '<span class="pl-dur">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
          l.dur + '</span>' +
      '</span>' +
      (l.badge ? '<span class="pl-badge">' + l.badge + '</span>' : '');
    btn.addEventListener('click', function () { select(i, true); });
    listEl.appendChild(btn);
  });

  function select(i, autoplay) {
    if (i === current) { if (autoplay) playerEl.play().catch(function(){}); return; }
    current = i;
    var l = LESSONS[i];

    srcEl.src = l.src;
    playerEl.load();
    eyebrowEl.textContent = l.caption;
    titleEl.textContent = l.title;
    descEl.innerHTML = l.desc;

    var items = listEl.querySelectorAll('.pl-item');
    items.forEach(function (el, idx) { el.classList.toggle('active', idx === i); });

    if (autoplay) playerEl.play().catch(function () {});
  }

  // Auto-advance to the next lesson when one finishes
  playerEl.addEventListener('ended', function () {
    if (current < LESSONS.length - 1) select(current + 1, true);
  });
})();
</script>
</body>
</html>`;
