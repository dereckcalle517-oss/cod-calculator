


export function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      @media (min-width: 901px) { .cpa-grid > :first-child { order: 2; } }
      html, body, button, input, select, textarea { font-feature-settings: 'cv02','cv03','cv04','cv11'; }
      body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      h1, h2, h3 { letter-spacing: -0.025em; }
      html, body { width: 100%; overflow-x: clip; background: #0B0B0C; color-scheme: dark; }
      body { margin: 0 !important; display: block !important; place-items: initial !important; min-width: 0 !important; background: #0B0B0C; font-family: 'InterVariable','Inter',system-ui,-apple-system,sans-serif; -webkit-font-smoothing: antialiased; letter-spacing: -0.005em; }
      button, input, select, textarea { font-family: inherit; }
      #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; border: 0 !important; border-inline: 0 !important; display: block !important; min-height: 0 !important; place-content: initial !important; box-shadow: none !important; }
      html { scroll-behavior: smooth; }
      input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
      input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 1px; height: 1px; }
      input[type=range]::-moz-range-thumb { width: 1px; height: 1px; border: none; background: transparent; }
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      .show-mobile-only { display: none; }
      .m-only { display: none; }
      .shell { display: grid; grid-template-columns: 244px minmax(0,1fr); min-height: 100vh; background: #0B0B0C; }
      .shell-side { position: sticky; top: 0; height: 100vh; border-right: 1px solid #2A2A2E; background: #121214; padding: 18px 14px; display: flex; flex-direction: column; gap: 22px; }
      .nav-item { display: flex; align-items: center; gap: 11px; width: 100%; background: transparent; border: none; color: #A3A3A3; font-family: inherit; font-weight: 600; font-size: 13px; padding: 10px 12px; border-radius: 10px; cursor: pointer; text-align: left; }
      .nav-item:hover { background: #222226; color: #fff; }
      .nav-item.on { background: rgba(255,255,255,0.08); color: #fff; }
      .nav-item.on svg { color: #8AA6E6; }
      [style*="background: rgb(26, 26, 29)"] { box-shadow: inset 0 1px 0 rgba(255,255,255,0.045); }
      .nav-sep { height: 1px; background: #2A2A2E; margin: 10px 4px; }
      .shell-top { position: sticky; top: 0; z-index: 100; height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 18px; background: rgba(11,11,12,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid #2A2A2E; }
      .shell-top-l { display: none; }
      .shell-tabs-m { display: none; }
      .acct-select { display: none; }
      .shell-burger, .shell-drawer, .shell-scrim { display: none; }
      .shell.collapsed { grid-template-columns: minmax(0,1fr); }
      .shell.collapsed .shell-side { display: none; }
      .shell-top-d { display: flex; align-items: center; gap: 10px; }
      .shell-collapse { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; margin-left: -6px; background: transparent; border: none; border-radius: 9px; color: #A1A1AA; cursor: pointer; }
      .shell-collapse:hover { background: #222226; color: #fff; }
      .shell-collapse:focus-visible { outline: 2px solid #D4AF37; outline-offset: 1px; }
      @media (max-width: 900px) {
        .hero-grid { grid-template-columns: minmax(0,1fr) !important; gap: 36px !important; }
        .shell { grid-template-columns: minmax(0,1fr); }
        .shell-side { display: none; }
        .shell-collapse { display: none; }
        .shell-top { padding: 0 12px; }
        .shell-top-l { display: block; }
        .shell-top-l { display: flex; align-items: center; gap: 10px; }
        .acct-tabs { display: none !important; }
        .acct-select { display: block; }
        .shell-burger { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; margin-left: -6px; background: transparent; border: none; border-radius: 10px; color: #fff; cursor: pointer; }
        .shell-burger:active { background: #222226; }
        .shell-scrim { display: block; position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.6); opacity: 0; pointer-events: none; transition: opacity .2s; }
        .shell-scrim.open { opacity: 1; pointer-events: auto; }
        .shell-drawer { display: flex; flex-direction: column; gap: 22px; position: fixed; top: 0; left: 0; bottom: 0; width: min(300px, 84vw); z-index: 310; background: #121214; border-right: 1px solid #2A2A2E; padding: 18px 14px; transform: translateX(-100%); transition: transform .22s ease; overflow-y: auto; }
        .shell-drawer.open { transform: translateX(0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      @media (max-width: 900px) {
        .main-layout { grid-template-columns: 1fr !important; gap: 14px !important; padding: 12px 10px 40px !important; }
        [style*="repeat(4"], [style*="repeat(3"] { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important; }
        [style*="1fr 2fr 2fr"], [style*="1fr 1fr 1fr"] { grid-template-columns: minmax(0,1fr) !important; }
        [style*="1fr 1fr"] { grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; }
        .stack-m.stack-m { grid-template-columns: minmax(0,1fr) !important; }
        input, select, textarea { font-size: 16px !important; }
        .m-only { display: inline !important; }
        .m-bar { display: flex !important; }
        .d-only { display: none !important; }
        .main-layout { grid-template-columns: minmax(0,1fr) !important; }
        .main-layout > * { min-width: 0 !important; max-width: 100% !important; }
        .left-panel { position: static !important; }
        button { white-space: nowrap; }
        .charts-grid { grid-template-columns: 1fr !important; }
        .hide-mobile { display: none !important; }
        .show-mobile-only { display: block !important; }
        .pricing-grid { grid-template-columns: 1fr !important; }
        .team-grid { grid-template-columns: 1fr 1fr !important; }
      }
      @media (max-width: 600px) { .team-grid { grid-template-columns: minmax(0,1fr) !important; } }
    `}</style>
  );
}
