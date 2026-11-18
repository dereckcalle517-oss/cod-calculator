// TikTok Pixel: no hace nada mientras VITE_TIKTOK_PIXEL_ID esté vacío.
const ID = (import.meta.env && import.meta.env.VITE_TIKTOK_PIXEL_ID) || "DBUM34BC77U89HHSHBH0";
let ready = false;
// Google Ads: no hace nada mientras VITE_GADS_ID esté vacío (formato AW-XXXXXXXXX).
const GADS = (import.meta.env && import.meta.env.VITE_GADS_ID) || "";
const GADS_LABELS = {
  CompleteRegistration: (import.meta.env && import.meta.env.VITE_GADS_LABEL_SIGNUP) || "",
  InitiateCheckout: (import.meta.env && import.meta.env.VITE_GADS_LABEL_CHECKOUT) || "",
};
let gready = false;
function initGoogle() {
  if (!GADS || gready || typeof window === "undefined") return;
  gready = true;
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://www.googletagmanager.com/gtag/js?id=" + GADS;
  document.head.appendChild(sc);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GADS);
}
function googleTrack(event) {
  try {
    const label = GADS_LABELS[event];
    if (GADS && label && window.gtag) window.gtag("event", "conversion", { send_to: GADS + "/" + label });
  } catch {}
}

export function initPixel() {
  initGoogle();
  if (!ID || ready || typeof window === "undefined") return;
  ready = true;
  (function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (o, m) { o[m] = function () { o.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
    ttq.methods.forEach((m) => ttq.setAndDefer(ttq, m));
    ttq.load = function (id) {
      const s = d.createElement("script");
      s.async = true;
      s.src = "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" + id + "&lib=" + t;
      d.head.appendChild(s);
    };
    ttq.load(ID);
    ttq.page();
  })(window, document, "ttq");
}
const once = new Set();
export function track(event, params, onceKey) {
  try {
    if (onceKey) { if (once.has(onceKey)) return; once.add(onceKey); }
    googleTrack(event);
    if (!ID || !window.ttq) return;
    window.ttq.track(event, params || {});
  } catch {}
}
