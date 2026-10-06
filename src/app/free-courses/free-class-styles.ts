/**
 * Stylesheet of the free class page (see free-class-markup.ts). The colours,
 * type and shared pieces (top bar, buttons, closing, footer) are those of
 * the offer page; the video stage, playlist and "keep going" section are
 * specific to this one. It resets and styles the whole document, which is
 * why the page is served on its own (route.ts).
 */
export const freeClassStyles = `
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0 }

:root {
  --teal: #EB6B62;
  --amber: #FEDB7F;
  --slate: #1F142B;
  --slate-light: #6A6354;
  --cream: #FCFCFC;
  --green: #ABBE62;
  --text-primary: #1F142B;
  --text-body: #5E5E5F;
  --text-muted: #6A6354;
  --grad-hero: linear-gradient(135deg,#EB6B62 0%,#EB6B62 40%,#EB6B62 100%);
  --grad-amber: linear-gradient(135deg,#FEDB7F,#FEDB7F);
  --grad-gold: linear-gradient(135deg,#EB6B62,#FEDB7F 55%,#FEDB7F);
  --radius-lg: 28px;
  --shadow-sm: 0 2px 8px rgba(0,0,0,.08);
  --shadow-md: 0 8px 32px rgba(0,0,0,.12);
  --shadow-lg: 0 20px 60px rgba(0,0,0,.18);
  --shadow-teal: 0 8px 32px rgba(235,107,98,.35);
  --shadow-amber: 0 8px 32px rgba(254,219,127,.35);
  --transition: all .28s cubic-bezier(.4,0,.2,1);
}

html { scroll-behavior: smooth; font-size: 16px }
body { font-family: 'Nunito',sans-serif; color: var(--text-primary); background: var(--cream); overflow-x: hidden; line-height: 1.6 }
img { display: block; max-width: 100%; height: auto }
a { text-decoration: none; color: inherit }
button { cursor: pointer; font-family: inherit; border: none; background: none }

.container { width: 100%; max-width: 1160px; margin: 0 auto; padding: 0 24px }

@keyframes shine { 0% { left: -100% } 100% { left: 200% } }
@keyframes glow-pulse { 0%,100% { box-shadow: var(--shadow-amber) } 50% { box-shadow: 0 8px 48px rgba(254,219,127,.6) } }
@keyframes orbit-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }

.fade-in { opacity: 0; transform: translateY(28px); transition: opacity .7s ease,transform .7s ease }
.fade-in.visible { opacity: 1; transform: none }

/* TOP BAR */
.topbar { background: var(--slate); color: #fff; padding: 10px 0; font-size: 13px; font-weight: 500; letter-spacing: .01em }
.topbar .container { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; text-align: center }
.topbar-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(254,219,127,.2); border: 1px solid rgba(254,219,127,.4); border-radius: 100px; padding: 3px 11px; font-size: 11.5px; color: #FEDB7F; font-weight: 700; letter-spacing: .06em; text-transform: uppercase }

/* BUTTONS */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: var(--grad-gold); color: #fff; font-weight: 700; font-size: 16px; padding: 17px 34px; border-radius: 100px; box-shadow: var(--shadow-amber); position: relative; overflow: hidden; transition: var(--transition); animation: glow-pulse 2.6s ease-in-out infinite; cursor: pointer; border: none; font-family: 'Nunito',sans-serif; text-align: center; line-height: 1.25 }
.btn-primary::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent); animation: shine 2.2s infinite }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 48px rgba(254,219,127,.55) }
.btn-primary:focus-visible { outline: 3px solid rgba(254,219,127,.8); outline-offset: 3px }
.btn-glow { font-size: 17px; padding: 19px 38px }

/* FIRST SCREEN: top bar + hero fill the viewport */
.hero-shell { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: linear-gradient(165deg,#FCFCFC 0%,#FCFCFC 55%,var(--cream) 100%) }
.hero { flex: 1; display: flex; align-items: center; padding: 34px 0 56px; position: relative }
.hero-inner { max-width: 820px; margin: 0 auto 30px; text-align: center; display: flex; flex-direction: column; align-items: center }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 9px; background: rgba(235,107,98,.1); border: 1px solid rgba(235,107,98,.3); border-radius: 100px; padding: 7px 17px; margin-bottom: 18px }
.eyebrow-text { font-size: 12px; font-weight: 700; color: #EB6B62; text-transform: uppercase; letter-spacing: .09em }
.hero-headline { font-family: 'Baloo 2',sans-serif; font-size: clamp(28px,4vw,48px); font-weight: 800; line-height: 1.1; color: var(--text-primary); margin-bottom: 14px }
.hero-headline .accent { color: var(--teal); position: relative; display: inline-block }
.hero-headline .accent::after { content: ''; position: absolute; left: 0; bottom: -3px; width: 100%; height: 4px; background: var(--grad-amber); border-radius: 2px; opacity: .75 }
.hero-sub { font-size: 16.5px; line-height: 1.7; color: var(--text-body); max-width: 600px }
.hero-sub strong { color: var(--teal); font-weight: 700 }

/* STAGE: big player + playlist */
.hero-stage { display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 24px; align-items: start }
.stage-main { min-width: 0 }
.stage-video-frame { position: relative; aspect-ratio: 16/9; background: #000; border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-lg) }
.stage-video-frame video { display: block; width: 100%; height: 100%; object-fit: contain; background: #000 }
.stage-caption { padding: 20px 6px 0 }
.stage-eyebrow { font-size: 11.5px; font-weight: 800; color: var(--teal); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px }
.stage-title { font-family: 'Baloo 2',sans-serif; font-size: 24px; font-weight: 700; line-height: 1.2; color: var(--text-primary); margin-bottom: 6px }
.stage-desc { font-size: 15px; line-height: 1.65; color: var(--text-body); max-width: 660px }

.stage-playlist { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 24px; box-shadow: var(--shadow-md); overflow: hidden; display: flex; flex-direction: column; min-width: 0 }
.playlist-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,.07) }
.playlist-head-title { font-family: 'Baloo 2',sans-serif; font-size: 18px; font-weight: 700; color: var(--text-primary) }
.playlist-count { font-size: 11.5px; font-weight: 700; color: var(--teal); background: rgba(235,107,98,.1); border-radius: 100px; padding: 3px 11px; white-space: nowrap }
.playlist-scroll { display: flex; flex-direction: column; gap: 6px; padding: 10px; max-height: 470px; overflow-y: auto }

.pl-item { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 10px 12px; border-radius: 16px; border: 1.5px solid transparent; background: transparent; color: inherit; transition: background-color .2s ease,border-color .2s ease }
.pl-item:hover { background: rgba(235,107,98,.06) }
.pl-item.active { background: rgba(235,107,98,.1); border-color: rgba(235,107,98,.35) }
.pl-item:focus-visible { outline: 3px solid rgba(235,107,98,.45); outline-offset: 2px }
.pl-thumb { position: relative; width: 46px; height: 46px; border-radius: 14px; background: var(--slate); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background-color .2s ease }
.pl-item.active .pl-thumb { background: var(--teal) }
.pl-num { font-family: 'Baloo 2',sans-serif; font-size: 20px; font-weight: 800; line-height: 1 }
.pl-play { position: absolute; right: -5px; bottom: -5px; width: 21px; height: 21px; border-radius: 50%; background: var(--amber); border: 2px solid #fff; display: flex; align-items: center; justify-content: center }
.pl-meta { display: flex; flex-direction: column; min-width: 0; flex: 1 }
.pl-eyebrow { font-size: 10.5px; font-weight: 800; color: var(--teal); text-transform: uppercase; letter-spacing: .08em }
.pl-title { font-size: 14.5px; font-weight: 700; color: var(--text-primary); line-height: 1.3; overflow-wrap: break-word }
.pl-dur { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-top: 3px }
.pl-badge { flex-shrink: 0; max-width: 96px; font-size: 10px; font-weight: 800; line-height: 1.25; text-align: center; text-transform: uppercase; letter-spacing: .04em; color: #56661f; background: rgba(171,190,98,.24); border-radius: 12px; padding: 4px 9px }

.wave-divider { display: block; width: 100%; line-height: 0; overflow: hidden }
.wave-divider svg { display: block; width: 100% }

/* KEEP GOING (dark) */
.nextstep { background: linear-gradient(160deg,var(--slate) 0%,#1F142B 100%); padding: 76px 0 92px; position: relative; overflow: hidden; text-align: center }
.nextstep-orbit { position: absolute; top: -190px; right: -170px; width: 520px; height: 520px; border-radius: 50%; border: 1.5px dashed rgba(254,219,127,.2); pointer-events: none; animation: orbit-spin 70s linear infinite }
.nextstep-orbit.two { top: auto; right: auto; bottom: -160px; left: -130px; width: 390px; height: 390px; border-color: rgba(235,107,98,.28); animation-duration: 90s; animation-direction: reverse }
.nextstep-inner { position: relative; max-width: 720px; margin: 0 auto }
.nextstep-badge { display: inline-flex; align-items: center; background: rgba(254,219,127,.14); border: 1px solid rgba(254,219,127,.4); border-radius: 100px; padding: 6px 16px; font-size: 12px; font-weight: 700; color: #FEDB7F; text-transform: uppercase; letter-spacing: .09em; margin-bottom: 20px }
.nextstep h2 { font-family: 'Baloo 2',sans-serif; font-size: clamp(26px,3.4vw,42px); font-weight: 800; line-height: 1.16; color: #FCFCFC; margin-bottom: 18px }
.nextstep p { font-size: 16px; line-height: 1.72; color: rgba(255,255,255,.8); max-width: 620px; margin: 0 auto 14px }
.nextstep-cta { margin: 32px 0 20px }
.nextstep .nextstep-note { font-size: 13px; color: rgba(255,255,255,.62); margin-bottom: 0 }

/* CLOSING (warm) */
.closing { padding: 80px 0; background: var(--cream); position: relative; overflow: hidden }
.closing-inner { max-width: 640px; margin: 0 auto; text-align: center }
.closing-divider { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; justify-content: center }
.closing-divider-line { flex: 1; height: 1px; background: linear-gradient(to right,transparent,var(--teal),transparent); max-width: 120px }
.closing-divider-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--grad-hero); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-teal) }
.closing-sig { font-family: 'Baloo 2',sans-serif; font-size: 21px; color: var(--teal); font-style: italic; font-weight: 700; line-height: 1.5 }
.closing-sig span { display: block; font-family: 'Nunito',sans-serif; font-style: normal; font-size: 13px; color: var(--text-muted); font-weight: 500; margin-top: 4px }
.ps-card { display: flex; gap: 14px; align-items: flex-start; text-align: left; background: #fff; border-left: 5px solid var(--amber); border-radius: 20px; padding: 22px 26px; box-shadow: var(--shadow-md); margin-top: 34px }
.ps-icon { font-size: 20px; line-height: 1.4; flex-shrink: 0 }
.ps-card p { font-size: 14.5px; line-height: 1.65; color: var(--text-body) }
.ps-card p strong { color: var(--text-primary); font-weight: 700 }

/* FOOTER */
.footer { background: var(--slate); padding: 28px 0 }
.footer .container { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px }
.footer-brand { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.78); font-size: 13px }
.footer-copy { font-size: 12.5px; color: #6A6354 }

/* RESPONSIVE */
@media(max-width:960px) {
  .hero { align-items: flex-start }
  .hero-stage { grid-template-columns: 1fr }
  .playlist-scroll { max-height: none }
}

@media(max-width:560px) {
  .container { padding: 0 16px }
  .hero { padding: 24px 0 44px }
  .hero-sub { font-size: 15.5px }
  .stage-video-frame { border-radius: 18px }
  .stage-title { font-size: 21px }
  .nextstep { padding: 60px 0 70px }
  .closing { padding: 60px 0 }
  .btn-primary,.btn-glow { font-size: 15px; padding: 16px 24px }
  .ps-card { padding: 18px 20px }
  .footer .container { justify-content: center; text-align: center }
}

@media(prefers-reduced-motion:reduce) {
  html { scroll-behavior: auto }
  .btn-primary,.btn-primary::after,.nextstep-orbit { animation: none }
  .fade-in { opacity: 1; transform: none; transition: none }
}
`;
