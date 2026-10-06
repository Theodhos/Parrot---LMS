/**
 * Stylesheet of the offer page (see offer-markup.ts). It resets and styles
 * the whole document, which is why the page is served on its own (route.ts)
 * instead of inside the platform's layout.
 */
export const offerStyles = `
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0 }

:root {
  --teal: #EB6B62;
  --teal-light: #EB6B62;
  --teal-dark: #EB6B62;
  --teal-xlight: #FCFCFC;
  --amber: #FEDB7F;
  --amber-light: #FEDB7F;
  --amber-dark: #EB6B62;
  --slate: #1F142B;
  --slate-mid: #5E5E5F;
  --slate-light: #6A6354;
  --slate-xlight: rgba(255,255,255,.78);
  --cream: #FCFCFC;
  --warm: #FCFCFC;
  --warm2: #FCFCFC;
  --rose: #EB6B62;
  --rose-light: #EB6B62;
  --rose-xlight: #FCFCFC;
  --green: #ABBE62;
  --white: #ffffff;
  --off-white: #FCFCFC;
  --text-primary: #1F142B;
  --text-body: #5E5E5F;
  --text-muted: #6A6354;
  --grad-hero: linear-gradient(135deg,#EB6B62 0%,#EB6B62 40%,#EB6B62 100%);
  --grad-btn: linear-gradient(135deg,#EB6B62,#EB6B62 60%,#EB6B62);
  --grad-amber: linear-gradient(135deg,#FEDB7F,#FEDB7F);
  --grad-gold: linear-gradient(135deg,#EB6B62,#FEDB7F 55%,#FEDB7F);
  --radius: 16px;
  --radius-lg: 28px;
  --radius-xl: 40px;
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
.narrow { max-width: 820px; margin: 0 auto }

@keyframes shine { 0% { left: -100% } 100% { left: 200% } }
@keyframes glow-pulse { 0%,100% { box-shadow: var(--shadow-amber) } 50% { box-shadow: 0 8px 48px rgba(254,219,127,.6) } }
@keyframes price-pop { 0% { transform: scale(1) } 50% { transform: scale(1.04) } 100% { transform: scale(1) } }

.fade-in { opacity: 0; transform: translateY(28px); transition: opacity .7s ease,transform .7s ease }
.fade-in.visible { opacity: 1; transform: none }

/* TOP BAR */
.topbar { background: var(--slate); color: #fff; padding: 10px 0; font-size: 13px; font-weight: 500; letter-spacing: .01em }
.topbar .container { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; text-align: center }
.topbar-urgency { display: flex; align-items: center; gap: 6px; color: #EB6B62 }

/* BUTTONS */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: var(--grad-gold); color: #fff; font-weight: 700; font-size: 16px; padding: 17px 34px; border-radius: 100px; box-shadow: var(--shadow-amber); position: relative; overflow: hidden; transition: var(--transition); animation: glow-pulse 2.6s ease-in-out infinite; cursor: pointer; border: none; font-family: 'Nunito',sans-serif; text-align: center; line-height: 1.25 }
.btn-primary::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent); animation: shine 2.2s infinite }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 48px rgba(254,219,127,.55) }
.btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: var(--slate-light); font-weight: 600; font-size: 14px; padding: 13px 22px; border-radius: 100px; border: 1.5px solid rgba(106,99,84,.35); background: transparent; transition: var(--transition); font-family: 'Nunito',sans-serif }
.btn-ghost:hover { border-color: var(--slate-light); color: var(--slate); background: rgba(106,99,84,.06) }

/* HERO */
.hero { padding: 30px 0 80px; background: linear-gradient(165deg,#FCFCFC 0%,#FCFCFC 55%,var(--cream) 100%); position: relative; overflow: hidden }
.hero-deco { position: absolute; inset: 0; pointer-events: none; overflow: hidden }
.hero-deco svg { position: absolute }
.hero-inner { position: relative; max-width: 920px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center }
.alert-pill { display: inline-flex; align-items: center; gap: 9px; background: rgba(235,107,98,.1); border: 1px solid rgba(235,107,98,.3); border-radius: 100px; padding: 8px 18px; margin-bottom: 26px }
.alert-pill span { font-size: 12.5px; font-weight: 700; color: #EB6B62; text-transform: uppercase; letter-spacing: .09em }
.hero-headline { font-family: 'Baloo 2',sans-serif; font-size: clamp(30px,4.4vw,56px); font-weight: 900; line-height: 1.1; color: var(--text-primary); margin-bottom: 18px; max-width: 880px }
.hero-headline .accent { color: var(--amber-dark); position: relative; display: inline-block }
.hero-headline .accent::after { content: ''; position: absolute; left: 0; bottom: -3px; width: 100%; height: 4px; background: var(--grad-amber); border-radius: 2px; opacity: .75 }
.hero-headline .italic { font-style: italic; color: var(--teal-dark) }
.hero-sub { font-size: 17px; line-height: 1.7; color: var(--text-body); margin-bottom: 34px; max-width: 620px }
.hero-sub strong { color: var(--teal-dark); font-weight: 700 }

/* price flash */
.price-flash { display: flex; align-items: stretch; gap: 0; background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden; margin-bottom: 32px; max-width: 560px; width: 100% }
.pf-cell { flex: 1; padding: 22px 14px; text-align: center; position: relative }
.pf-cell:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 18%; height: 64%; width: 1px; background: rgba(0,0,0,.08) }
.pf-num { font-family: 'Baloo 2',sans-serif; font-size: clamp(26px,3.4vw,38px); font-weight: 900; line-height: 1; color: var(--text-primary) }
.pf-num.gold { color: var(--amber-dark) }
.pf-label { font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-top: 7px; text-transform: uppercase; letter-spacing: .07em }
.hero-cta-wrap { display: flex; flex-direction: column; gap: 14px; align-items: center }
.urgency-line { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--rose); font-style: italic; font-weight: 500 }
.hero-trust-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 26px }
.trust-pill { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid rgba(0,0,0,.09); border-radius: 100px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: var(--slate); box-shadow: var(--shadow-sm) }

/* LETTER */
.letter { padding: 80px 0; background: var(--cream); position: relative }
.letter-card { background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); padding: 48px 52px; position: relative; border-top: 5px solid var(--teal) }
.letter-from { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,.07) }
.letter-avatar { width: 54px; height: 54px; border-radius: 50%; overflow: hidden; flex-shrink: 0; box-shadow: var(--shadow-sm); background: #FCFCFC }
.letter-avatar img { width: 100%; height: 100%; object-fit: cover }
.letter-from-meta b { font-family: 'Baloo 2',sans-serif; font-size: 17px; color: var(--slate); display: block; line-height: 1.2 }
.letter-from-meta span { font-size: 12.5px; color: var(--text-muted) }
.letter p { font-size: 16.5px; line-height: 1.8; color: var(--text-body); margin-bottom: 18px }
.letter p:last-child { margin-bottom: 0 }
.letter p strong { color: var(--teal-dark); font-weight: 700 }
.letter .lede { font-family: 'Baloo 2',sans-serif; font-size: 19px; font-style: italic; color: var(--slate); font-weight: 700 }

/* SECTION GENERICS */
.section-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .13em; margin-bottom: 16px }
.section-title { font-family: 'Baloo 2',sans-serif; font-size: clamp(26px,3.3vw,42px); font-weight: 900; line-height: 1.16; margin-bottom: 18px }
.section-body { font-size: 16px; line-height: 1.72; color: var(--text-body) }
.wave-divider { display: block; width: 100%; line-height: 0; overflow: hidden }
.wave-divider svg { display: block; width: 100% }

/* PROBLEM (dark) */
.problem { background: linear-gradient(160deg,var(--slate) 0%,#1F142B 100%); padding: 88px 0; position: relative; overflow: hidden }
.problem-head { max-width: 680px; margin-bottom: 44px }
.problem-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; margin-bottom: 44px }
.problem-img-wrap { position: relative; border-radius: 24px; overflow: hidden; aspect-ratio: 4/5; box-shadow: 0 20px 60px rgba(0,0,0,.45) }
.problem-img-wrap img { width: 100%; height: 100%; object-fit: cover }
.problem-img-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom,transparent 40%,rgba(31,20,43,.72)) }
.problem-img-badge { position: absolute; bottom: 16px; left: 16px; right: 16px; background: rgba(235,107,98,.88); backdrop-filter: blur(8px); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: #fff; line-height: 1.4 }
.problem-cards { display: grid; grid-template-columns: 1fr; gap: 14px }
.problem-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-left: 3px solid var(--rose-light); border-radius: 16px; padding: 20px 22px; display: flex; gap: 15px; align-items: flex-start; transition: var(--transition) }
.problem-card:hover { background: rgba(255,255,255,.09); transform: translateX(4px) }
.pcard-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(235,107,98,.15) }
.pcard-title { font-size: 14.5px; font-weight: 700; color: #FCFCFC; margin-bottom: 4px }
.pcard-text { font-size: 13px; color: rgba(255,255,255,.78); line-height: 1.55 }
.bridge-card { background: linear-gradient(135deg,rgba(235,107,98,.2),rgba(235,107,98,.08)); border: 1px solid rgba(235,107,98,.4); border-radius: 24px; padding: 28px 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap }
.bridge-icon { width: 56px; height: 56px; background: var(--grad-hero); border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
.bridge-text { flex: 1; min-width: 220px }
.bridge-text h3 { font-family: 'Baloo 2',sans-serif; font-size: 21px; font-weight: 700; color: #FCFCFC; margin-bottom: 6px }
.bridge-text p { font-size: 14px; color: rgba(255,255,255,.78); line-height: 1.6 }

/* SOLUTION / WHAT YOU GET (warm) */
.solution { padding: 88px 0; background: var(--warm2); position: relative; overflow: hidden }
.solution-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center }
.get-card { background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden; border: 1px solid rgba(0,0,0,.05) }
.get-card-top { background: var(--grad-hero); padding: 30px 32px; color: #fff; position: relative; overflow: hidden }
.get-card-top::after { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,.08) }
.get-tag { display: inline-block; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); border-radius: 100px; padding: 4px 13px; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 14px }
.get-price { font-family: 'Baloo 2',sans-serif; font-size: 46px; font-weight: 900; line-height: 1 }
.get-price small { font-family: 'Nunito',sans-serif; font-size: 15px; font-weight: 500; opacity: .85 }
.get-price-sub { font-size: 14px; opacity: .9; margin-top: 6px }
.get-list { padding: 28px 32px; display: flex; flex-direction: column; gap: 16px }
.get-item { display: flex; gap: 13px; align-items: flex-start }
.get-check { width: 26px; height: 26px; border-radius: 8px; background: var(--teal-xlight); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px }
.get-item p { font-size: 14.5px; color: var(--text-body); line-height: 1.55 }
.get-item p strong { color: var(--text-primary); font-weight: 700 }
.highlight-card { background: #fff; border-radius: 20px; border-left: 5px solid var(--amber); padding: 24px 28px; box-shadow: var(--shadow-md); margin-top: 28px }
.highlight-card h4 { font-family: 'Baloo 2',sans-serif; font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px }
.highlight-card p { font-size: 14px; color: var(--text-body); line-height: 1.65 }

/* INSTRUCTOR (neutral) */
.instructor { padding: 88px 0; background: var(--cream); position: relative; overflow: hidden }
.instructor-grid { display: grid; grid-template-columns: 360px 1fr; gap: 64px; align-items: start }
.instructor-img-card { position: sticky; top: 24px }
.instructor-img-outer { position: relative; width: 230px; height: 230px; margin: 0 auto 24px }
.instructor-img-ring { position: absolute; inset: -10px; border-radius: 50%; background: conic-gradient(from 0deg,var(--teal),var(--amber),var(--teal-light),var(--teal)); padding: 3px }
.instructor-img-ring-inner { width: 100%; height: 100%; border-radius: 50%; background: var(--cream); padding: 4px }
.instructor-img-inner { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; position: relative; background: linear-gradient(160deg,#EB6B62,#EB6B62); display: flex; align-items: center; justify-content: center }
.instructor-img-inner img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block }
.instructor-badge-cert { position: absolute; bottom: 6px; right: 6px; background: var(--grad-gold); color: #fff; border: 3px solid var(--cream); border-radius: 100px; padding: 5px 12px; font-size: 11px; font-weight: 800; letter-spacing: .04em; box-shadow: var(--shadow-sm) }
.instructor-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px }
.istat { background: #fff; border-radius: 14px; padding: 14px 8px; text-align: center; box-shadow: var(--shadow-sm); border: 1px solid rgba(0,0,0,.07) }
.istat-num { font-family: 'Baloo 2',sans-serif; font-size: 21px; font-weight: 900; color: var(--teal-dark); line-height: 1 }
.istat-label { font-size: 10.5px; color: var(--text-muted); font-weight: 600; margin-top: 4px; line-height: 1.3; white-space: pre-line }
.bio-text { font-size: 15.5px; line-height: 1.78; color: var(--text-body); margin-bottom: 18px }
.bio-text strong { color: var(--teal-dark); font-weight: 700 }
.achievements { display: flex; flex-direction: column; gap: 12px; margin: 24px 0 }
.achievement-item { display: flex; align-items: flex-start; gap: 13px; background: #fff; border-radius: 14px; padding: 16px; box-shadow: var(--shadow-sm); border: 1px solid rgba(0,0,0,.06); transition: var(--transition) }
.achievement-item:hover { box-shadow: var(--shadow-md); transform: translateX(4px) }
.ach-icon { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
.ach-text h4 { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px }
.ach-text p { font-size: 12.5px; color: var(--text-muted); line-height: 1.5 }

/* THE MATH (dark) */
.math { padding: 88px 0; background: linear-gradient(160deg,var(--slate) 0%,#1F142B 100%); position: relative; overflow: hidden }
.math-head { text-align: center; max-width: 640px; margin: 0 auto 48px }
.math-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; align-items: stretch; margin-bottom: 36px }
.math-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 22px; padding: 30px 26px; text-align: center; position: relative; transition: var(--transition) }
.math-card .mc-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.78); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px }
.math-card .mc-rate { font-family: 'Baloo 2',sans-serif; font-size: 34px; font-weight: 900; color: #FCFCFC; line-height: 1 }
.math-card .mc-rate .per { font-family: 'Nunito',sans-serif; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.78) }
.math-card .mc-total { font-size: 13.5px; color: rgba(255,255,255,.78); margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.1) }
.math-card .mc-total b { color: rgba(255,255,255,.85) }
.strike { position: relative; display: inline-block; color: rgba(255,255,255,.78)!important }
.strike::after { content: ''; position: absolute; left: -4%; top: 50%; width: 108%; height: 2px; background: var(--rose-light); transform: rotate(-8deg) }
.math-card.win { background: linear-gradient(160deg,rgba(254,219,127,.16),rgba(254,219,127,.06)); border: 1.5px solid rgba(254,219,127,.5); box-shadow: 0 16px 48px rgba(254,219,127,.18); animation: price-pop 3s ease-in-out infinite }
.math-card.win .mc-rate { color: #FEDB7F }
.math-card.win .mc-total b { color: #FEDB7F }
.win-flag { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--grad-gold); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 5px 16px; border-radius: 100px; white-space: nowrap; box-shadow: var(--shadow-amber) }
.math-saving { text-align: center; font-size: 15.5px; color: rgba(255,255,255,.85); line-height: 1.7; max-width: 600px; margin: 0 auto }
.math-saving b { color: #FEDB7F; font-weight: 800 }

/* NO EXPIRATION (warm strip) */
.noexp { padding: 64px 0; background: var(--warm2); position: relative; overflow: hidden }
.noexp-card { display: flex; gap: 26px; align-items: center; background: #fff; border-radius: var(--radius-lg); padding: 32px 38px; box-shadow: var(--shadow-md); border: 1px solid rgba(0,0,0,.05); flex-wrap: wrap }
.noexp-icon { width: 64px; height: 64px; border-radius: 18px; background: var(--teal-xlight); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
.noexp-text { flex: 1; min-width: 240px }
.noexp-text h3 { font-family: 'Baloo 2',sans-serif; font-size: 23px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px }
.noexp-text p { font-size: 15px; color: var(--text-body); line-height: 1.7 }

/* FIT — NOT / IS for you */
.fit { padding: 88px 0; background: var(--off-white); position: relative }
.fit-head { text-align: center; max-width: 600px; margin: 0 auto 48px }
.fit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px }
.fit-col { border-radius: var(--radius-lg); padding: 34px 32px; border: 1px solid }
.fit-col.no { background: var(--rose-xlight); border-color: rgba(235,107,98,.18) }
.fit-col.yes { background: var(--teal-xlight); border-color: rgba(235,107,98,.22) }
.fit-col h3 { font-family: 'Baloo 2',sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 10px }
.fit-col.no h3 { color: #EB6B62 }
.fit-col.yes h3 { color: var(--teal-dark) }
.fit-col .fit-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 22px }
.fit-list { display: flex; flex-direction: column; gap: 16px }
.fit-item { display: flex; gap: 12px; align-items: flex-start }
.fit-mark { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px }
.fit-col.no .fit-mark { background: rgba(235,107,98,.14) }
.fit-col.yes .fit-mark { background: rgba(235,107,98,.16) }
.fit-item p { font-size: 14.5px; color: var(--text-body); line-height: 1.55 }
.fit-item p strong { color: var(--text-primary); font-weight: 700 }
.fit-note { margin-top: 22px; font-size: 13.5px; color: var(--text-muted); line-height: 1.6; font-style: italic }

/* GUARANTEE band */
.guarantee { padding: 72px 0; background: linear-gradient(160deg,var(--teal-dark),var(--teal) 70%); position: relative; overflow: hidden }
.guarantee .container { position: relative }
.guar-card { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; justify-content: center; text-align: center }
.guar-seal { width: 92px; height: 92px; border-radius: 50%; background: rgba(255,255,255,.12); border: 2px solid rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
.guar-text { max-width: 560px }
.guar-text h3 { font-family: 'Baloo 2',sans-serif; font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 8px }
.guar-text p { font-size: 15px; color: rgba(255,255,255,.85); line-height: 1.7 }

/* REGISTRATION / FINAL CTA (dark) */
.registration { padding: 90px 0; background: linear-gradient(160deg,var(--slate) 0%,#1F142B 100%); position: relative; overflow: hidden }
.reg-inner { max-width: 720px; margin: 0 auto; text-align: center; position: relative }
.reg-mascot { display: flex; justify-content: center; margin-bottom: 24px }
.reg-recap { font-family: 'Baloo 2',sans-serif; font-style: italic; font-size: clamp(20px,2.6vw,28px); font-weight: 700; color: #FCFCFC; line-height: 1.4; margin-bottom: 30px }
.reg-recap b { color: #FEDB7F; font-style: normal }
.reg-cta-wrap { display: flex; flex-direction: column; gap: 16px; align-items: center }
.reg-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 30px }
.reg-chip { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.13); border-radius: 100px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.85) }
.reg-fine { margin-top: 28px; font-size: 12.5px; color: #6A6354; line-height: 1.6; max-width: 560px; margin-left: auto; margin-right: auto }

/* CLOSING (warm) */
.closing { padding: 84px 0; background: linear-gradient(160deg,var(--warm) 0%,var(--cream) 100%); position: relative; overflow: hidden }
.closing-inner { max-width: 640px; margin: 0 auto; text-align: center }
.closing-divider { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; justify-content: center }
.closing-divider-line { flex: 1; height: 1px; background: linear-gradient(to right,transparent,var(--teal),transparent); max-width: 120px }
.closing-divider-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--grad-hero); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-teal) }
.closing-quote { font-family: 'Baloo 2',sans-serif; font-size: clamp(21px,2.8vw,30px); font-weight: 700; color: var(--text-primary); line-height: 1.4; margin-bottom: 18px; font-style: italic }
.closing-quote span { color: var(--teal) }
.closing-sub { font-size: 15px; color: var(--text-body); margin-bottom: 26px; line-height: 1.7 }
.closing-sig { margin-top: 30px; font-family: 'Baloo 2',sans-serif; font-size: 18px; color: var(--teal-dark); font-style: italic; font-weight: 700; line-height: 1.5 }
.closing-sig small { display: block; font-family: 'Nunito',sans-serif; font-style: normal; font-size: 13px; color: var(--text-muted); font-weight: 500; margin-top: 4px }

/* FOOTER */
.footer { background: var(--slate); padding: 28px 0 }
.footer .container { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px }
.footer-brand { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.78); font-size: 13px }
.footer-copy { font-size: 12.5px; color: #6A6354 }

/* RESPONSIVE */
@media(max-width:1024px) {
  .problem-grid,.solution-grid,.instructor-grid { grid-template-columns: 1fr; gap: 40px }
  .instructor-img-card { position: static }
  .instructor-img-outer { width: 200px; height: 200px }
}

@media(max-width:860px) {
  .math-grid { grid-template-columns: 1fr; gap: 24px }
  .math-card.win { order: -1 }
  .fit-grid { grid-template-columns: 1fr }
  .letter-card { padding: 36px 28px }
}

@media(max-width:560px) {
  .hero { padding: 20px 0 60px }
  .problem,.solution,.instructor,.math,.fit,.registration,.closing { padding: 60px 0 }
  .price-flash { flex-direction: row }
  .pf-cell { padding: 16px 8px }
  .topbar .container { flex-direction: column; gap: 6px }
  .btn-primary { font-size: 14.5px; padding: 15px 24px }
  .letter p { font-size: 15.5px }
  .get-card-top { padding: 24px }
  .get-list { padding: 22px 24px }
  .noexp-card { padding: 26px 24px }
  .guar-card { flex-direction: column }
  #demo1 { display: none }
  .topbar-urgency { font-size: 12px }
  .alert-pill span { font-size: 11px }
  .hero-sub { font-size: 16px }
}

@media(max-width:380px) {
  .pf-num { font-size: 22px }
  .hero-headline { font-size: 27px }
}
`;
