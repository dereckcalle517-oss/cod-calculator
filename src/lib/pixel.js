// TikTok Pixel: no hace nada mientras VITE_TIKTOK_PIXEL_ID esté vacío.
const ID = (import.meta.env && import.meta.env.VITE_TIKTOK_PIXEL_ID) || "";
let ready = false;
export function initPixel() {
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
    if (!ID || !window.ttq) return;
    if (onceKey) { if (once.has(onceKey)) return; once.add(onceKey); }
    window.ttq.track(event, params || {});
  } catch {}
}
