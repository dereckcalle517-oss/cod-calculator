


// ─── CUENTA: constantes ───────────────────────────────────────────────────────
export const PREFS_KEY = "cod_prefs";


export const SUPPORT_URL = ""; // Pon aquí tu enlace de soporte, por ejemplo "https://wa.me/573001234567". Si queda vacío, no se muestra.


export function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch { return {}; } }


export function prefInputs() {
  const p = readPrefs(); const o = {};
  ["envio", "pctConfirmados", "pctEntregados"].forEach(k => { if (typeof p[k] === "number" && isFinite(p[k])) o[k] = p[k]; });
  if (typeof p.recupera === "boolean") o.recupera = p.recupera;
  return o;
}


export const ACCOUNT_EVT = "nx:account";


export const openAccount = (tab) => { window.__nxAcctTab = typeof tab === "string" ? tab : "perfil"; window.dispatchEvent(new Event(ACCOUNT_EVT)); };


export const openPlans = () => { window.__nxAcctTab = "suscripcion"; window.__nxShowPlans = true; window.dispatchEvent(new Event(ACCOUNT_EVT)); };


export const navTo = (v) => window.dispatchEvent(new CustomEvent("nx:nav", { detail: v }));


export const SUPPORT_EMAIL = "soporte@cuadre.app";


export const LEGAL_PATHS = { terms: "/terminos", privacy: "/privacidad", refund: "/reembolsos" };


export const legalFromPath = () => { try { const p = window.location.pathname.replace(/\/+$/, ""); return Object.keys(LEGAL_PATHS).find(k => LEGAL_PATHS[k] === p) || null; } catch { return null; } };


export const openLegal = (k) => { try { window.history.pushState({}, "", LEGAL_PATHS[k]); } catch {} window.dispatchEvent(new CustomEvent("nx:legal", { detail: k })); window.scrollTo(0, 0); };
try { const r = new URLSearchParams(window.location.search).get("ref"); if (r && /^[a-z0-9]{4,16}$/i.test(r)) localStorage.setItem("nx_ref", r.toLowerCase()); } catch {}

export const trialLeft = () => 0;
export const trialUsed = () => true;
