/**
 * Stylesheet of the thank-you page (see thank-you-markup.ts). Everything is
 * scoped under #ty-page, as it was written for a GoHighLevel page; here the
 * document is our own, so only the body margin needs resetting around it.
 */
export const thankYouStyles = `
html,body { margin: 0; padding: 0; background: #FCFCFC }

#ty-page {
  --ty-teal: #EB6B62;
  --ty-teal-light: #EB6B62;
  --ty-teal-dark: #EB6B62;
  --ty-teal-x: #FCFCFC;
  --ty-amber: #FEDB7F;
  --ty-amber-light: #FEDB7F;
  --ty-amber-dark: #EB6B62;
  --ty-text: #1F142B;
  --ty-body: #5E5E5F;
  --ty-muted: #6A6354;
  --ty-white: #fff;
  --ty-cream: #FCFCFC;
  --ty-grad-hero: linear-gradient(135deg,#EB6B62 0%,#EB6B62 40%,#EB6B62 100%);
  --ty-grad-gold: linear-gradient(135deg,#EB6B62,#FEDB7F 55%,#FEDB7F);
  box-sizing: border-box;
  font-family: 'Nunito',sans-serif;
  color: var(--ty-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  display: flex!important;
  justify-content: center!important;
  align-items: flex-start!important;
  width: 100%!important;
  max-width: none!important;
  margin: 0!important;
  float: none!important;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 20px!important;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(165deg,#FCFCFC 0%,#FCFCFC 50%,#FCFCFC 100%);
}

#ty-page *,#ty-page *::before,#ty-page *::after { box-sizing: border-box; margin: 0; padding: 0 }

#ty-page .ty-bg-deco { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0 }
#ty-page .ty-bg-deco svg { position: absolute }

@keyframes ty-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
@keyframes ty-fade { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes ty-ring { 0% { box-shadow: 0 0 0 0 rgba(235,107,98,.4) } 70% { box-shadow: 0 0 0 22px rgba(235,107,98,0) } 100% { box-shadow: 0 0 0 0 rgba(235,107,98,0) } }
@keyframes ty-shine { 0% { left: -100% } 100% { left: 200% } }

#ty-page .ty-card { position: relative; z-index: 1; width: 100%!important; max-width: 540px!important; margin: 0 auto!important; background: var(--ty-white); border-radius: 28px; box-shadow: 0 20px 60px rgba(0,0,0,.18); padding: 48px 44px; text-align: center; border-top: 5px solid var(--ty-teal); animation: ty-fade .6s ease both }
#ty-page .ty-check { width: 96px; height: 96px; border-radius: 50%; background: var(--ty-grad-hero); display: flex; align-items: center; justify-content: center; margin: 0 auto 26px; animation: ty-pop .6s cubic-bezier(.34,1.56,.64,1) both,ty-ring 2.4s ease-in-out 1s infinite }
#ty-page .ty-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: var(--ty-teal-x); border: 1px solid rgba(235,107,98,.25); border-radius: 100px; padding: 6px 15px; font-size: 11.5px; font-weight: 700; color: var(--ty-teal-dark); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 20px }
#ty-page .ty-h1 { font-family: 'Baloo 2',sans-serif; font-size: clamp(28px,5vw,40px); font-weight: 900; line-height: 1.12; margin-bottom: 16px; color: var(--ty-text) }
#ty-page .ty-h1 .ty-accent { color: var(--ty-amber-dark); font-style: italic }
#ty-page .ty-lede { font-size: 16.5px; color: var(--ty-body); line-height: 1.7; margin-bottom: 30px }
#ty-page .ty-lede strong { color: var(--ty-teal-dark); font-weight: 700 }

#ty-page .ty-email { display: flex; gap: 16px; align-items: flex-start; text-align: left; background: #FCFCFC; border: 1px solid rgba(254,219,127,.25); border-radius: 16px; padding: 20px 22px; margin-bottom: 28px }
#ty-page .ty-email-ico { width: 48px; height: 48px; border-radius: 13px; background: var(--ty-grad-gold); display: flex; align-items: center; justify-content: center; flex: 0 0 auto }
#ty-page .ty-email h3 { font-family: 'Baloo 2',sans-serif; font-size: 18px; font-weight: 700; color: var(--ty-text); margin-bottom: 4px }
#ty-page .ty-email p { font-size: 14px; color: var(--ty-body); line-height: 1.6 }

#ty-page .ty-order { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; padding: 16px 0; border-top: 1px solid rgba(0,0,0,.07); border-bottom: 1px solid rgba(0,0,0,.07); margin-bottom: 28px }
#ty-page .ty-order-item { text-align: center }
#ty-page .ty-order-num { font-family: 'Baloo 2',sans-serif; font-size: 24px; font-weight: 900; color: var(--ty-teal-dark); line-height: 1 }
#ty-page .ty-order-num.ty-gold { color: var(--ty-amber-dark) }
#ty-page .ty-order-label { font-size: 11px; font-weight: 600; color: var(--ty-muted); text-transform: uppercase; letter-spacing: .06em; margin-top: 5px }
#ty-page .ty-order-sep { width: 1px; height: 34px; background: rgba(0,0,0,.1) }

#ty-page .ty-btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; background: var(--ty-grad-hero); color: #fff; font-weight: 700; font-size: 15.5px; padding: 15px 30px; border-radius: 100px; box-shadow: 0 8px 32px rgba(235,107,98,.35); position: relative; overflow: hidden; transition: transform .25s ease; border: none; font-family: 'Nunito',sans-serif; cursor: pointer; text-decoration: none }
#ty-page .ty-btn::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); animation: ty-shine 2.4s infinite }
#ty-page .ty-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 44px rgba(235,107,98,.45) }

#ty-page .ty-signoff { margin-top: 30px; font-family: 'Baloo 2',sans-serif; font-style: italic; font-weight: 700; font-size: 16px; color: var(--ty-teal-dark); line-height: 1.5 }
#ty-page .ty-signoff small { display: block; font-family: 'Nunito',sans-serif; font-style: normal; font-weight: 500; font-size: 12.5px; color: var(--ty-muted); margin-top: 4px }
#ty-page .ty-support { margin-top: 22px; font-size: 12.5px; color: var(--ty-muted) }
#ty-page .ty-support a { color: var(--ty-teal-dark); font-weight: 600; text-decoration: underline }

@media(max-width:480px) {
  #ty-page { padding: 20px 14px!important }
  #ty-page .ty-card { padding: 36px 26px }
  #ty-page .ty-order { gap: 14px }
  #ty-page .ty-order-num { font-size: 21px }
  #ty-page .ty-email { padding: 16px 16px }
}
`;
