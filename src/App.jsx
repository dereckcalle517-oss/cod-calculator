import { useState, useMemo, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, onSnapshot } from "firebase/firestore";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0B0C", surface: "#121214", card: "#1A1A1D", cardHover: "#222226",
  border: "#2A2A2E", borderBright: "#3A3A40",
  accent: "#8AA6E6", accentGlow: "rgba(138,166,230,0.14)", accentDim: "rgba(138,166,230,0.10)",
  green: "#22C55E", greenGlow: "rgba(34,197,94,0.16)",
  red: "#EF4444", redGlow: "rgba(239,68,68,0.16)",
  amber: "#F59E0B", amberGlow: "rgba(245,158,11,0.16)",
  purple: "#A1A1AA", purpleGlow: "rgba(161,161,170,0.16)",
  cyan: "#38BDF8", cyanGlow: "rgba(56,189,248,0.16)",
  gold: "#E8B93C",
  text: "#F5F5F5", textMuted: "#7A7A83", textDim: "#B0B0B8",
};

// ─── CUENTA: constantes ───────────────────────────────────────────────────────
const PREFS_KEY = "cod_prefs";
const SUPPORT_URL = ""; // Pon aquí tu enlace de soporte, por ejemplo "https://wa.me/573001234567". Si queda vacío, no se muestra.
function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch { return {}; } }
function prefInputs() {
  const p = readPrefs(); const o = {};
  ["envio", "pctConfirmados", "pctEntregados"].forEach(k => { if (typeof p[k] === "number" && isFinite(p[k])) o[k] = p[k]; });
  if (typeof p.recupera === "boolean") o.recupera = p.recupera;
  return o;
}
const ACCOUNT_EVT = "nx:account";
const openAccount = (tab) => { window.__nxAcctTab = typeof tab === "string" ? tab : "perfil"; window.dispatchEvent(new Event(ACCOUNT_EVT)); };
const navTo = (v) => window.dispatchEvent(new CustomEvent("nx:nav", { detail: v }));
const SUPPORT_EMAIL = "soporte@nexuscod.com";
const LEGAL_PATHS = { terms: "/terminos", privacy: "/privacidad", refund: "/reembolsos" };
const legalFromPath = () => { try { const p = window.location.pathname.replace(/\/+$/, ""); return Object.keys(LEGAL_PATHS).find(k => LEGAL_PATHS[k] === p) || null; } catch { return null; } };
const openLegal = (k) => { try { window.history.pushState({}, "", LEGAL_PATHS[k]); } catch {} window.dispatchEvent(new CustomEvent("nx:legal", { detail: k })); window.scrollTo(0, 0); };
try { const r = new URLSearchParams(window.location.search).get("ref"); if (r && /^[a-z0-9]{4,16}$/i.test(r)) localStorage.setItem("nx_ref", r.toLowerCase()); } catch {}
async function refApi(user, action, extra) {
  const token = await user.getIdToken();
  const r = await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...(extra || {}) }) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
const refUrlFor = (code) => `${window.location.origin}/${code ? `?ref=${code}` : ""}`;
function useMyRefCode() {
  const { user } = useAuth();
  const [code, setCode] = useState(() => { try { return localStorage.getItem("nx_my_ref") || ""; } catch { return ""; } });
  useEffect(() => {
    if (!user || code) return;
    refApi(user, "status").then(d => { if (d && d.code) { setCode(d.code); try { localStorage.setItem("nx_my_ref", d.code); } catch {} } }).catch(() => {});
  }, [user && user.uid]);
  return code;
}

// ─── COMPARTIR RESULTADO (imagen) ──────────────────────────────────
async function buildShareImage({ R, inputs, fmt, url }) {
  try { await document.fonts.ready; } catch {}
  const W = 1080, H = 1080, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), F = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
  const rr = (X, Y, w, h, r, fill, stroke) => { x.beginPath(); x.roundRect(X, Y, w, h, r); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 2; x.stroke(); } };
  const t = (txt, X, Y, size, color, weight = 700, align = "left") => { x.font = `${weight} ${size}px ${F}`; x.fillStyle = color; x.textAlign = align; x.fillText(txt, X, Y); };
  x.fillStyle = "#0B0B0C"; x.fillRect(0, 0, W, H);
  rr(60, 60, 960, 960, 36, "#121214", "#2A2A2E");
  rr(110, 108, 52, 52, 14, "#F5F5F5"); t("N", 136, 148, 34, "#0B0B0C", 800, "center");
  t("Nexus COD", 180, 148, 34, "#F5F5F5", 800);
  t("Resultado de mi campaña", 970, 146, 26, "#7A7A83", 600, "right");
  const profit = R.gananciaNet >= 0, pc = profit ? "#22C55E" : "#EF4444";
  rr(110, 200, 860, 230, 28, profit ? "#22C55E14" : "#EF444414", profit ? "#22C55E55" : "#EF444455");
  t(profit ? "Ganancia neta" : "Pérdida neta", 150, 262, 28, "#B0B0B8", 600);
  t(`${profit ? "" : "−"}${fmt(Math.abs(R.gananciaNet))}`, 150, 366, 96, pc, 800);
  t(`Margen ${R.margen.toFixed(1)}%  ·  ${inputs.pedidos} pedidos`, 150, 408, 26, "#7A7A83", 600);
  rr(110, 460, 420, 230, 28, "#1A1A1D", "#2A2A2E");
  t("Mi CPA real", 144, 520, 26, "#7A7A83", 600);
  t(fmt(R.cpaReal), 144, 610, 72, R.cpaReal > R.cpaMax ? "#EF4444" : "#F5F5F5", 800);
  t(`Ads Manager decía ${fmt(inputs.cpa)}`, 144, 658, 24, "#B0B0B8", 600);
  rr(550, 460, 420, 230, 28, "#1A1A1D", "#2A2A2E");
  t("CPA máximo", 584, 520, 26, "#7A7A83", 600);
  t(fmt(R.cpaMax), 584, 610, 72, "#F5F5F5", 800);
  t("Para no perder dinero", 584, 658, 24, "#B0B0B8", 600);
  rr(110, 720, 860, 150, 28, "#1A1A1D", "#2A2A2E");
  const cols = [[inputs.pedidos, "Pedidos", "#8AA6E6"], [Math.round(R.confirmados), "Confirmados", "#8AA6E6"], [Math.round(R.entregados), "Entregados", "#22C55E"], [Math.round(R.devoluciones), "Devueltos", "#EF4444"]];
  cols.forEach(([v, l, col], i) => { const cx = 110 + 860 / 8 + i * (860 / 4); t(String(v), cx, 796, 52, col, 800, "center"); t(l, cx, 838, 24, "#7A7A83", 600, "center"); });
  t("Calcula tu CPA real gratis", 540, 930, 30, "#F5F5F5", 700, "center");
  t(url.replace(/^https?:\/\//, ""), 540, 976, 26, "#8AA6E6", 600, "center");
  return await new Promise(res => c.toBlob(res, "image/png"));
}
function ShareButton({ R, inputs, fmt, style }) {
  const code = useMyRefCode();
  const [msg, setMsg] = useState("");
  const go = async () => {
    const url = refUrlFor(code);
    const text = `Mi CPA real es ${fmt(R.cpaReal)} (Ads Manager decía ${fmt(inputs.cpa)}). Calcula el tuyo: ${url}`;
    try {
      const blob = await buildShareImage({ R, inputs, fmt, url });
      const file = new File([blob], "mi-cpa-real.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); setMsg("Compartido"); }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mi-cpa-real.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); setMsg("Imagen descargada"); }
    } catch (e) { if (!(e && e.name === "AbortError")) setMsg("No se pudo compartir"); }
    setTimeout(() => setMsg(""), 2500);
  };
  return (
    <button onClick={go} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "8px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, ...style }}>
      <Ic n="download" size={14} /> {msg || "Compartir resultado"}
    </button>
  );
}

// ─── ICONOS Y MARCA ───────────────────────────────────────────────────────────
const ICON_PATHS = {"user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>","download":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\"/>","message":"<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>","chart": "<path d=\"M3 3v18h18\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>", "trendUp": "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>", "trendDown": "<polyline points=\"22 17 13.5 8.5 8.5 13.5 2 7\"/><polyline points=\"16 17 22 17 22 11\"/>", "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>", "box": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><path d=\"m3.3 7 8.7 5 8.7-5\"/>", "zap": "<path d=\"M13 2 3 14h9l-1 8 10-12h-9z\"/>", "alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>", "megaphone": "<path d=\"m3 11 18-5v12L3 14v-3z\"/><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"/>", "checkCircle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>", "check": "<path d=\"M20 6 9 17l-5-5\"/>", "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>", "dollar": "<line x1=\"12\" x2=\"12\" y1=\"2\" y2=\"22\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/>", "bot": "<path d=\"M12 8V4H8\"/><rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\"/><path d=\"M2 14h2\"/><path d=\"M20 14h2\"/><path d=\"M15 13v2\"/><path d=\"M9 13v2\"/>", "trophy": "<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"/><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16\"/><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"/><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>", "file": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>", "clipboard": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/>", "receipt": "<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\"/><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\"/><path d=\"M12 17.5v-11\"/>", "mail": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>", "scale": "<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"M7 21h10\"/><path d=\"M12 3v18\"/><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"/>", "truck": "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>", "phone": "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"/>", "activity": "<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"/>", "layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\"/><path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\"/><path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\"/>", "trash": "<path d=\"M3 6h18\"/><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"/><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"/>", "rocket": "<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\"/><path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\"/><path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\"/><path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\"/>", "sliders": "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\"/><line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\"/><line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\"/><line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\"/><line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\"/><line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\"/><line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\"/><line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\"/>", "tag": "<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>", "repeat": "<path d=\"m17 2 4 4-4 4\"/><path d=\"M3 11v-1a4 4 0 0 1 4-4h14\"/><path d=\"m7 22-4-4 4-4\"/><path d=\"M21 13v1a4 4 0 0 1-4 4H3\"/>", "gift": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\"/>", "save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"/><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"/><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"/>", "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>", "plus": "<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>", "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "dot": "<circle cx=\"12\" cy=\"12\" r=\"6\" fill=\"currentColor\" stroke=\"none\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>", "undo": "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"/>", "building": "<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M9 22v-4h6v4\"/><path d=\"M8 6h.01\"/><path d=\"M16 6h.01\"/><path d=\"M12 6h.01\"/><path d=\"M12 10h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 10h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 10h.01\"/><path d=\"M8 14h.01\"/>", "bulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>", "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"/>", "folder": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>", "key": "<path d=\"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4\"/><path d=\"m21 2-9.6 9.6\"/><circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\"/>", "logout": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\"/>", "calculator": "<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/><line x1=\"8\" x2=\"16\" y1=\"6\" y2=\"6\"/><line x1=\"16\" x2=\"16\" y1=\"14\" y2=\"18\"/><path d=\"M16 10h.01\"/><path d=\"M12 10h.01\"/><path d=\"M8 10h.01\"/><path d=\"M12 14h.01\"/><path d=\"M8 14h.01\"/><path d=\"M12 18h.01\"/><path d=\"M8 18h.01\"/>", "calendar": "<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>", "cloud": "<path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\"/>", "card": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/><line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"/>", "star": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>", "wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>", "menu": "<line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\"/><line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\"/><line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\"/>", "home": "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>", "arrowLeft": "<path d=\"m12 19-7-7 7-7\"/><path d=\"M19 12H5\"/>"};
const EMOJI_MAP = {"📊": "chart", "📈": "trendUp", "📉": "trendDown", "🎯": "target", "📦": "box", "⚡": "zap", "⚠": "alert", "🚨": "alert", "📣": "megaphone", "✅": "checkCircle", "✓": "check", "✔": "check", "✗": "x", "✖": "x", "💰": "dollar", "💸": "dollar", "🤖": "bot", "🏆": "trophy", "🔍": "search", "📄": "file", "📋": "clipboard", "🧾": "receipt", "📬": "mail", "⚖": "scale", "🚚": "truck", "📞": "phone", "❤": "activity", "🎭": "layers", "🗑": "trash", "🚀": "rocket", "⚙": "sliders", "🏷": "tag", "🔁": "repeat", "🔄": "repeat", "🎁": "gift", "💾": "save", "💼": "briefcase", "➕": "plus", "🔒": "lock", "🔴": "dot", "🟡": "dot", "🟢": "dot", "🌎": "globe", "↩": "undo", "🏢": "building", "💡": "bulb", "✨": "sparkles", "✦": "sparkles", "📁": "folder", "🗂": "folder", "🔑": "key", "🚪": "logout", "🧮": "calculator", "📅": "calendar", "☁": "cloud", "💳": "card", "⭐": "star"};
function Ic({ n, size = "1.1em", style }) {
  const name = ICON_PATHS[n] ? n : EMOJI_MAP[String(n || "").replace(/\uFE0F/g, "")];
  if (!name) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-0.17em", flexShrink: 0, ...style }} dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }} />;
}
const EMOJI_RE = /([\u2600-\u27BF\u2B50\u21A9\u2713\u2714\u2717\u2716\u2726\u{1F300}-\u{1FAFF}]\uFE0F?)/u;
function Rich({ children }) {
  if (typeof children !== "string") return children;
  return children.split(EMOJI_RE).map((p, i) => (i % 2 ? <Ic key={i} n={p} /> : p));
}
function Flag({ c }) {
  return <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: C.textDim, border: `1px solid ${C.borderBright}`, borderRadius: 4, padding: "1px 5px", lineHeight: 1.4 }}>{c}</span>;
}
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="#FFFFFF" />
      <path d="M9 23V9l14 14V9" fill="none" stroke="#0B0B0C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="9" r="2.4" fill="#E8B93C" />
    </svg>
  );
}
function Brand({ onClick, size = 26, pro, sub }) {
  return (
    <button onClick={onClick} title="Ir al inicio" style={{ display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: C.text, padding: 0, textAlign: "left" }}>
      <Logo size={size} />
      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>Nexus COD</span>
      {pro && <span style={{ fontSize: 9, fontWeight: 800, background: C.gold, color: C.bg, borderRadius: 5, padding: "2px 6px", letterSpacing: "0.04em" }}>PRO</span>}
      {sub && <span className="hide-mobile" style={{ color: C.textMuted, fontSize: 12, fontWeight: 500 }}>{sub}</span>}
    </button>
  );
}

// ─── CURRENCIES ───────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "Dólar (USD)", flag: "US", countries: "Ecuador · Panamá" },
  { code: "COP", symbol: "$", name: "Peso Colombiano (COP)", flag: "CO", countries: "Colombia" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano (MXN)", flag: "MX", countries: "México" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano (PEN)", flag: "PE", countries: "Perú" },
  { code: "ARS", symbol: "$", name: "Peso Argentino (ARS)", flag: "AR", countries: "Argentina" },
  { code: "CLP", symbol: "$", name: "Peso Chileno (CLP)", flag: "CL", countries: "Chile" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño (BRL)", flag: "BR", countries: "Brasil" },
  { code: "BOB", symbol: "Bs.", name: "Boliviano (BOB)", flag: "BO", countries: "Bolivia" },
  { code: "PYG", symbol: "₲", name: "Guaraní (PYG)", flag: "PY", countries: "Paraguay" },
  { code: "UYU", symbol: "$U", name: "Peso Uruguayo (UYU)", flag: "UY", countries: "Uruguay" },
  { code: "GTQ", symbol: "Q", name: "Quetzal (GTQ)", flag: "GT", countries: "Guatemala" },
  { code: "DOP", symbol: "RD$", name: "Peso Dominicano (DOP)", flag: "DO", countries: "Rep. Dominicana" },
  { code: "CRC", symbol: "₡", name: "Colón (CRC)", flag: "CR", countries: "Costa Rica" },
  { code: "HNL", symbol: "L", name: "Lempira (HNL)", flag: "HN", countries: "Honduras" },
  { code: "NIO", symbol: "C$", name: "Córdoba (NIO)", flag: "NI", countries: "Nicaragua" },
  { code: "VES", symbol: "Bs.D", name: "Bolívar (VES)", flag: "VE", countries: "Venezuela" },
];

const BENCH = {
  confirmacion: { min: 60, optimo: 75, max: 90 },
  entrega: { min: 60, optimo: 72, max: 85 },
  margen: { min: 20, optimo: 30, max: 45 },
  roas: { min: 1.5, optimo: 2.5, max: 4 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const makeFmt = (sym) => (n, dec = 2) => {
  if (n === undefined || isNaN(n)) return `${sym}0`;
  return `${sym}${Math.abs(n).toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};
const fmtNum = (n) => Math.round(n ?? 0).toLocaleString("es-ES");
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

// ─── HEALTH SCORE ─────────────────────────────────────────────────────────────
function calcHealth(inputs, R) {
  let score = 100;
  const issues = [];
  const wins = [];
  if (R.margen < 10) { score -= 25; issues.push({ label: "Margen crítico", detail: `${fmtPct(R.margen)} — mínimo recomendado 20%`, severity: "urgente" }); }
  else if (R.margen < 20) { score -= 12; issues.push({ label: "Margen bajo", detail: `${fmtPct(R.margen)} — apunta a 25%+`, severity: "importante" }); }
  else wins.push({ label: "Buen margen", detail: fmtPct(R.margen) });
  if (inputs.pctEntregados < 60) { score -= 20; issues.push({ label: "Entrega crítica", detail: `${inputs.pctEntregados}% — promedio LATAM 70-75%`, severity: "urgente" }); }
  else if (inputs.pctEntregados < 70) { score -= 8; issues.push({ label: "Entrega baja", detail: `${inputs.pctEntregados}%`, severity: "importante" }); }
  else wins.push({ label: "Buena entrega", detail: `${inputs.pctEntregados}%` });
  if (inputs.pctConfirmados < 60) { score -= 15; issues.push({ label: "Confirmación baja", detail: `${inputs.pctConfirmados}%`, severity: "importante" }); }
  else if (inputs.pctConfirmados >= 75) wins.push({ label: "Alta confirmación", detail: `${inputs.pctConfirmados}%` });
  if (R.gananciaNet < 0) { score -= 20; issues.push({ label: "Campaña con pérdidas", detail: "Estás perdiendo dinero", severity: "urgente" }); }
  else if (R.roas >= R.roasBreakEven) wins.push({ label: "ROAS saludable", detail: `${R.roas.toFixed(2)}x` });
  return { score: Math.max(0, score), issues, wins };
}

// ─── RISK LEVEL ───────────────────────────────────────────────────────────────
function calcRisk(inputs, R) {
  let riskPoints = 0;
  if (R.margen < 15) riskPoints += 3;
  else if (R.margen < 25) riskPoints += 1;
  if (inputs.pctEntregados < 60) riskPoints += 3;
  else if (inputs.pctEntregados < 70) riskPoints += 1;
  if (R.roas < R.roasBreakEven) riskPoints += 3;
  if (R.gananciaNet < 0) riskPoints += 3;
  if (inputs.pctConfirmados < 60) riskPoints += 2;
  if (riskPoints >= 6) return { level: "Peligroso", emoji: "🔴", color: C.red, desc: "Alto riesgo de pérdida. No escales." };
  if (riskPoints >= 3) return { level: "Riesgoso", emoji: "🟡", color: C.amber, desc: "Campaña inestable. Optimiza antes de escalar." };
  return { level: "Seguro", emoji: "🟢", color: C.green, desc: "Campaña saludable. Puedes escalar con confianza." };
}

// ─── INVISIBLE LOSSES ─────────────────────────────────────────────────────────
function calcInvisibleLosses(inputs, R) {
  // What if delivery was optimal (75%)?
  const optEntrega = 0.75;
  const confirmados = inputs.pedidos * (inputs.pctConfirmados / 100);
  const optEntregados = confirmados * optEntrega;
  const optDev = confirmados - optEntregados;
  const dropi = inputs.precio * 0.025;
  const ganXP = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
  const optGanancia = optEntregados * ganXP - optDev * inputs.cpa - optDev * inputs.envio * 0.6 - (!inputs.recupera ? optDev * inputs.costo : 0) - (inputs.pedidos - confirmados) * inputs.cpa;
  const lossEntrega = Math.max(0, optGanancia - R.gananciaNet);

  // What if confirmation was optimal (78%)?
  const optConf = 0.78;
  const optConfirmados = inputs.pedidos * optConf;
  const optEntregados2 = optConfirmados * (inputs.pctEntregados / 100);
  const optDev2 = optConfirmados - optEntregados2;
  const noConf2 = inputs.pedidos - optConfirmados;
  const optGan2 = optEntregados2 * ganXP - optDev2 * inputs.cpa - optDev2 * inputs.envio * 0.6 - (!inputs.recupera ? optDev2 * inputs.costo : 0) - noConf2 * inputs.cpa;
  const lossConf = Math.max(0, optGan2 - R.gananciaNet);

  // What if CPA was 20% lower?
  const optCPA = inputs.cpa * 0.8;
  const ganXP2 = inputs.precio - inputs.costo - inputs.envio - optCPA - dropi;
  const optGan3 = R.entregados * ganXP2 - R.devoluciones * optCPA - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * optCPA;
  const lossCPA = Math.max(0, optGan3 - R.gananciaNet);

  return { lossEntrega, lossConf, lossCPA, total: Math.max(lossEntrega, lossConf, lossCPA) };
}

// ─── BREAK PREDICTOR ──────────────────────────────────────────────────────────
function calcBreakPoints(inputs, R) {
  const dropi = inputs.precio * 0.025;
  const ganXP = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
  // Min delivery to stay profitable
  let minEntrega = 0;
  for (let e = 1; e <= 100; e++) {
    const ent = (inputs.pedidos * inputs.pctConfirmados / 100) * (e / 100);
    const dev = (inputs.pedidos * inputs.pctConfirmados / 100) - ent;
    const gan = ent * ganXP - dev * inputs.cpa - dev * inputs.envio * 0.6 - (!inputs.recupera ? dev * inputs.costo : 0) - (inputs.pedidos * (1 - inputs.pctConfirmados / 100)) * inputs.cpa;
    if (gan >= 0) { minEntrega = e; break; }
  }
  // Max CPA to stay profitable
  let maxCPA = 0;
  for (let cpa = 0.1; cpa <= 50; cpa += 0.1) {
    const gxp = inputs.precio - inputs.costo - inputs.envio - cpa - dropi;
    const gan = R.entregados * gxp - R.devoluciones * cpa - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * cpa;
    if (gan < 0) { maxCPA = cpa - 0.1; break; }
  }
  return { minEntrega, maxCPA: Math.max(0, maxCPA) };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Slider({ label, sublabel, value, onChange, color = C.accent }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const setFromX = (clientX) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = Math.round(((clientX - r.left) / r.width) * 100);
    onChange(Math.min(100, Math.max(1, pct)));
  };
  const onDown = (e) => { dragging.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} setFromX(e.clientX); };
  const onMove = (e) => { if (dragging.current) setFromX(e.clientX); };
  const onUp = (e) => { dragging.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} };
  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(100, value + 1)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, value - 1)); }
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{ background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 8, padding: "3px 12px", fontSize: 14, fontWeight: 700, color, whiteSpace: "nowrap", flexShrink: 0 }}>{value}%</div>
      </div>
      <div ref={trackRef} role="slider" tabIndex={0} aria-label={label} aria-valuemin={1} aria-valuemax={100} aria-valuenow={value}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
        style={{ position: "relative", height: 40, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "pan-y", userSelect: "none", WebkitUserSelect: "none", outline: "none" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 99, background: C.border, pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, height: 6, width: `${value}%`, borderRadius: 99, background: color, pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: `${value}%`, transform: "translateX(-50%)", width: 24, height: 24, borderRadius: "50%", background: color, border: `3px solid ${C.bg}`, boxShadow: `0 0 12px ${color}`, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, prefix = "$", icon, sublabel }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span><Ic n={icon} /></span>}{label}
      </div>
      {sublabel && <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 5 }}>{sublabel}</div>}
      <div style={{ display: "flex", alignItems: "center", background: focused ? C.accentDim : C.surface, border: `1px solid ${focused ? C.accent : C.border}`, borderRadius: 10, overflow: "hidden", transition: "all 0.2s", boxShadow: focused ? `0 0 0 3px ${C.accentGlow}` : "none" }}>
        <span style={{ padding: "0 12px", color: focused ? C.accent : C.textMuted, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{prefix}</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} min={0}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontWeight: 600, padding: "11px 12px 11px 0", fontFamily: "inherit", minWidth: 0 }} />
      </div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {[{ label: "✓ Sí recupero", val: true, c: C.green }, { label: "✗ No recupero", val: false, c: C.red }].map(opt => (
        <button key={String(opt.val)} onClick={() => onChange(opt.val)} style={{ flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", background: value === opt.val ? `${opt.c}18` : "transparent", color: value === opt.val ? opt.c : C.textMuted, fontWeight: value === opt.val ? 700 : 500, fontSize: 12, fontFamily: "inherit", borderBottom: value === opt.val ? `2px solid ${opt.c}` : "2px solid transparent", transition: "all 0.2s" }}><Rich>{opt.label}</Rich></button>
      ))}
    </div>
  );
}

function CurrencySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 5 }}><Ic n="🌎" /> Moneda</div>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: C.surface, border: `1px solid ${open ? C.accent : C.border}`, borderRadius: 10, padding: "9px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, transition: "all 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flag c={cur.flag} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{cur.name}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{cur.countries}</div>
          </div>
        </div>
        <span style={{ color: C.textMuted, fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, zIndex: 300, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", maxHeight: 240, overflowY: "auto" }}>
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
                style={{ width: "100%", background: c.code === value ? `${C.accent}12` : "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
                <Flag c={c.flag} />
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.code === value ? C.accent : C.text }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: C.textMuted }}>{c.countries}</div>
                </div>
                {c.code === value && <span style={{ color: C.accent, fontSize: 12 }}><Ic n="✓" /></span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PRO LOCKED CARD ──────────────────────────────────────────────────────────
function ProLocked({ title, desc, icon, onUpgrade }) {
  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px", filter: "blur(2px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}><Ic n={icon} /> {title}</div>
        <div style={{ height: 60, background: C.border, borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,8,16,0.7)", borderRadius: 16, backdropFilter: "blur(2px)" }}>
        <div style={{ background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "14px 20px", textAlign: "center", maxWidth: 260 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}><Ic n="⭐" /></div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>Disponible en PRO</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{desc}</div>
          <button onClick={onUpgrade} style={{ background: C.text, border: "none", borderRadius: 8, padding: "8px 18px", color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Activar PRO — $5.99/mes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRIAL BANNER ─────────────────────────────────────────────────────────────
function TrialBanner({ daysLeft, onUpgrade }) {
  if (daysLeft <= 0) return null;
  const urgent = daysLeft === 1;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: urgent ? `${C.red}15` : `${C.gold}10`, border: `1px solid ${urgent ? C.red : C.gold}40`, borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}><Ic n={urgent ? "⚠" : "⭐"} /></span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: urgent ? C.red : C.gold }}>
            {urgent ? "¡Último día de PRO!" : `Te quedan ${daysLeft} días de PRO gratis`}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Después vuelves al plan gratis automáticamente</div>
        </div>
      </div>
      <button onClick={onUpgrade} style={{ background: C.text, border: "none", borderRadius: 8, padding: "7px 14px", color: C.bg, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        Mantener PRO
      </button>
    </motion.div>
  );
}

// ─── BENCHMARK BAR ────────────────────────────────────────────────────────────
function BenchmarkBar({ label, value, bench, suffix = "%" }) {
  const pct = Math.min(100, (value / bench.max) * 100);
  const status = value >= bench.optimo ? "optimo" : value >= bench.min ? "ok" : "bajo";
  const color = status === "optimo" ? C.green : status === "ok" ? C.amber : C.red;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color }}>{suffix === "x" ? value.toFixed(2) + "x" : fmtPct(value)}</span>
          <span style={{ background: `${color}18`, color, fontSize: 9, fontWeight: 700, borderRadius: 6, padding: "2px 7px" }}><Rich>{status === "optimo" ? "✓ Óptimo" : status === "ok" ? "Aceptable" : "✗ Bajo"}</Rich></span>
        </div>
      </div>
      <div style={{ position: "relative", height: 7, borderRadius: 99, background: C.border }}>
        <div style={{ position: "absolute", left: `${(bench.min / bench.max) * 100}%`, top: -3, width: 2, height: 13, background: C.amber + "60", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: `${(bench.optimo / bench.max) * 100}%`, top: -3, width: 2, height: 13, background: C.green + "60", borderRadius: 1 }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: color }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textMuted, marginTop: 4 }}>
        <span>Mín: {bench.min}{suffix === "x" ? "x" : "%"}</span>
        <span>Óptimo: {bench.optimo}{suffix === "x" ? "x" : "%"}</span>
        <span>Máx: {bench.max}{suffix === "x" ? "x" : "%"}</span>
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: C.text, fontSize: 14, fontWeight: 600, fontFamily: "inherit", textAlign: "left", gap: 10 }}>
        {q}<span style={{ color: C.accent, fontSize: 18, flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, paddingTop: 8 }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileProfitBar({ R, fmt, isProfit }) {
  return (
    <div className="m-bar" style={{ position: "sticky", top: 52, zIndex: 90, background: `${C.surface}F5`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "8px 14px", display: "none", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 11, color: C.textMuted }}>{isProfit ? "Ganancia neta" : "Pérdida neta"}<span style={{ marginLeft: 6, color: isProfit ? C.green : C.red, fontWeight: 700 }}>{fmtPct(R.margen)}</span></div>
      <div style={{ fontSize: 18, fontWeight: 800, color: isProfit ? C.green : C.red }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      html, body { width: 100%; overflow-x: clip; background: #0B0B0C; color-scheme: dark; }
      body { margin: 0 !important; display: block !important; place-items: initial !important; min-width: 0 !important; background: #0B0B0C; font-family: 'Plus Jakarta Sans','Inter',system-ui,sans-serif; -webkit-font-smoothing: antialiased; letter-spacing: -0.005em; }
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
      @media (max-width: 900px) {
        .hero-grid { grid-template-columns: minmax(0,1fr) !important; gap: 36px !important; }
        .shell { grid-template-columns: minmax(0,1fr); }
        .shell-side { display: none; }
        .shell-top { padding: 0 12px; }
        .shell-top-l { display: block; }
        .shell-tabs-m { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #2A2A2E; overflow-x: auto; background: #121214; }
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

// ─── CALC ENGINE ──────────────────────────────────────────────────────────────
function useCalc(inputs) {
  return useMemo(() => {
    const { costo, precio, envio, cpa, pedidos, pctConfirmados, pctEntregados, recupera } = inputs;
    const confirmados = pedidos * (pctConfirmados / 100);
    const entregados = confirmados * (pctEntregados / 100);
    const devoluciones = confirmados - entregados;
    const noConfirmados = pedidos - confirmados;
    const dropi = precio * 0.025;
    const gananciaXPedido = precio - costo - envio - cpa - dropi;
    const ingresosBrutos = entregados * precio;
    const perdidaCPA_dev = devoluciones * cpa;
    const perdidaFlete_dev = devoluciones * envio * 0.60;
    const perdidaProducto_dev = recupera ? 0 : devoluciones * costo;
    const totalPerdidaDev = perdidaCPA_dev + perdidaFlete_dev + perdidaProducto_dev;
    const perdidaCPA_noc = noConfirmados * cpa;
    const totalDropi = entregados * dropi;
    const totalCPA = pedidos * cpa;
    const totalEnvio = entregados * envio + devoluciones * envio * 0.60;
    const totalCosto = recupera ? entregados * costo : (entregados + devoluciones) * costo;
    const gastosTotales = totalCPA + totalEnvio + totalCosto + totalDropi;
    const gananciaNet = ingresosBrutos - gastosTotales;
    const margen = ingresosBrutos > 0 ? (gananciaNet / ingresosBrutos) * 100 : 0;
    const roasBreakEven = precio > (costo + envio + dropi) ? precio / (precio - costo - envio - dropi) : 0;
    const roas = cpa > 0 ? precio / cpa : 0;
    const invAds = cpa * pedidos;
    const fleteRecuperado = devoluciones * envio * 0.40;
    const cpaReal = entregados > 0 ? totalCPA / entregados : 0;
    const cpaMax = pedidos > 0 ? Math.max(0, (ingresosBrutos - totalEnvio - totalCosto - totalDropi) / pedidos) : 0;
    return { cpaReal, cpaMax, confirmados, entregados, devoluciones, noConfirmados, dropi, gananciaXPedido, ingresosBrutos, perdidaCPA_dev, perdidaFlete_dev, perdidaProducto_dev, totalPerdidaDev, perdidaCPA_noc, totalDropi, totalCPA, totalEnvio, totalCosto, gastosTotales, gananciaNet, margen, roasBreakEven, roas, invAds, fleteRecuperado };
  }, [inputs]);
}


// ─── CPA REAL ──────────────────────────────────────────────────────
const CPA_LEVELS = [
  { id: "muy", label: "Muy rentable", f: 0.40, color: "#22C55E", hint: "Escala con tranquilidad" },
  { id: "normal", label: "Normal", f: 0.60, color: "#7BD88F", hint: "Buen margen para crecer" },
  { id: "medio", label: "Medio-alto", f: 0.80, color: "#F5C451", hint: "Ojo, el margen se achica" },
  { id: "limite", label: "Límite", f: 0.95, color: "#F59E0B", hint: "Casi sin ganancia" },
  { id: "cero", label: "0 ganancia", f: 1.00, color: "#EF4444", hint: "Aquí empiezas a perder" },
];
function useCalcPure(inp) {
  const conf = inp.pedidos * (inp.pctConfirmados / 100);
  const ent = conf * (inp.pctEntregados / 100);
  const dev = conf - ent;
  const dropi = inp.precio * 0.025;
  const ing = ent * inp.precio;
  const envio = ent * inp.envio + dev * inp.envio * 0.60;
  const costo = inp.recupera ? ent * inp.costo : (ent + dev) * inp.costo;
  const max = inp.pedidos > 0 ? Math.max(0, (ing - envio - costo - ent * dropi) / inp.pedidos) : 0;
  const real = ent > 0 ? (inp.pedidos * inp.cpa) / ent : 0;
  return { cpaReal: real, cpaMax: max, ent };
}

function CpaCard({ R, inputs, fmt }) {
  const over = R.cpaReal > 0 && inputs.cpa > R.cpaMax;
  const ratio = R.cpaMax > 0 ? Math.min(1.25, inputs.cpa / R.cpaMax) : 1.25;
  const pos = Math.min(100, (ratio / 1.25) * 100);
  const col = over ? C.red : inputs.cpa > R.cpaMax * 0.8 ? C.amber : C.green;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
      style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        <span style={{ color: C.accent, display: "flex" }}><Ic n="target" size={16} /></span> CPA real por pedido entregado
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>Tu CPA real</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: col, lineHeight: 1 }}>{fmt(R.cpaReal)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>Tu Ads Manager dice {fmt(inputs.cpa)}, pero solo se entrega el {fmtPct(inputs.pctConfirmados * inputs.pctEntregados / 100)} de tus pedidos.</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>CPA máximo para no perder</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: C.text, lineHeight: 1 }}>{fmt(R.cpaMax)}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>Lo máximo que puede marcar tu Ads Manager.</div>
        </div>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 99, background: `linear-gradient(90deg,${C.green} 0%,${C.green} 48%,#F5C451 64%,${C.amber} 76%,${C.red} 80%,${C.red} 100%)`, opacity: 0.9 }}>
        <div style={{ position: "absolute", left: `${pos}%`, top: -4, width: 4, height: 16, marginLeft: -2, borderRadius: 2, background: C.text, boxShadow: "0 0 0 2px #0B0B0C" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textMuted, marginTop: 8 }}>
        <span>{fmt(0)}</span><span style={{ color: col, fontWeight: 700 }}>{over ? "Estás por encima del límite" : `Margen de ${fmt(Math.max(0, R.cpaMax - inputs.cpa))} por pedido`}</span><span>{fmt(R.cpaMax * 1.25)}</span>
      </div>
      <div style={{ marginTop: 14 }}><ShareButton R={R} inputs={inputs} fmt={fmt} /></div>
    </motion.div>
  );
}

function CpaTab({ inputs, R, fmt }) {
  const rates = [50, 55, 60, 65, 70, 75, 80, 85, 90];
  const cur = inputs.pctEntregados;
  const rows = [...new Set([...rates, Math.round(cur)])].sort((a, b) => a - b);
  const base = R.cpaReal;
  const th = { fontSize: 11, color: C.textMuted, fontWeight: 600, textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap" };
  const td = { fontSize: 13, textAlign: "right", padding: "9px 10px", whiteSpace: "nowrap" };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: C.textDim }}>Tu CPA real: <b style={{ color: C.text }}>{fmt(R.cpaReal)}</b> · CPA máximo: <b style={{ color: C.text }}>{fmt(R.cpaMax)}</b></div>
        <ShareButton R={R} inputs={inputs} fmt={fmt} />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Desglose de CPA</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>Qué CPA debes ver en tu Ads Manager según la ganancia que quieres. Tu CPA máximo es {fmt(R.cpaMax)}.</div>
        <div style={{ display: "grid", gap: 8 }}>
          {CPA_LEVELS.map(l => {
            const cpa = R.cpaMax * l.f;
            const gan = (R.cpaMax - cpa) * inputs.pedidos;
            const real = cpa * inputs.pedidos / Math.max(R.entregados, 0.0001);
            const active = inputs.cpa <= cpa && (l.f === CPA_LEVELS[0].f || inputs.cpa > R.cpaMax * CPA_LEVELS[CPA_LEVELS.indexOf(l) - 1].f);
            return (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 12, background: active ? `${l.color}14` : C.surface, border: `1px solid ${active ? l.color : C.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: l.color, flexShrink: 0 }} />{l.label}
                    {active && <span style={{ fontSize: 10, color: l.color, fontWeight: 700 }}>Estás aquí</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{l.hint}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.textMuted }}>CPA Ads Manager</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(cpa)}</div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>real {fmt(real)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.textMuted }}>Ganancia</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: gan > 0.005 ? C.green : C.textDim }}>{fmt(gan)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>Ganancia calculada con {inputs.pedidos} pedidos, tus costos y tus tasas actuales. Los niveles son un porcentaje de tu CPA máximo: 40%, 60%, 80%, 95% y 100%.</div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sensibilidad a la tasa de entrega</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>Con tu CPA de {fmt(inputs.cpa)} en Ads Manager, así cambia tu CPA real y tu límite si mejora o empeora la entrega.</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ ...th, textAlign: "left" }}>Entrega</th><th style={th}>CPA real</th><th style={th}>CPA máximo</th><th style={th}>Cambio</th>
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const x = useCalcPure({ ...inputs, pctEntregados: r });
                const isCur = r === Math.round(cur);
                const diff = x.cpaReal - base;
                const bad = x.cpaReal > x.cpaMax;
                return (
                  <tr key={r} style={{ borderBottom: `1px solid ${C.border}`, background: isCur ? `${C.accent}14` : "transparent" }}>
                    <td style={{ ...td, textAlign: "left", fontWeight: isCur ? 800 : 600 }}>{r}%{isCur && <span style={{ fontSize: 10, color: C.accent, marginLeft: 8 }}>actual</span>}</td>
                    <td style={{ ...td, fontWeight: 700, color: bad ? C.red : C.text }}>{fmt(x.cpaReal)}</td>
                    <td style={td}>{fmt(x.cpaMax)}</td>
                    <td style={{ ...td, color: isCur ? C.textMuted : diff < 0 ? C.green : C.red }}>{isCur ? "—" : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>En rojo: tu CPA real supera el máximo con esa tasa de entrega y estarías perdiendo dinero.</div>
      </div>
    </div>
  );
}

// ─── FREE CALCULATOR ──────────────────────────────────────────────────────────
function FreeCalculator({ onUpgrade, onStartTrial, onHome, onOpenPro, embedded }) {
  const [currencyCode, setCurrencyCode] = useState(() => readPrefs().currency || "USD");
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const fmt = makeFmt(currency.symbol);
  const [inputs, setInputs] = useState(() => ({ ...{ costo: 8, precio: 35.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true }, ...prefInputs() }));
  const set = (key) => (val) => setInputs(p => ({ ...p, [key]: val }));
  const R = useCalc(inputs);
  const health = calcHealth(inputs, R);
  const isProfit = R.gananciaNet >= 0;

  const pieData = [
    { name: "Entregados", value: Math.max(0, Math.round(R.entregados)), color: C.green },
    { name: "Devoluciones", value: Math.max(0, Math.round(R.devoluciones)), color: C.red },
    { name: "No confirmados", value: Math.max(0, Math.round(R.noConfirmados)), color: C.textMuted },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: C.text }}>
      {/* Header */}
      {!embedded && (
      <div style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}EE`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <Brand onClick={onHome} size={28} sub="Gratis" />
          <button onClick={onOpenPro} style={{ background: C.gold, border: "none", borderRadius: 9, padding: "7px 16px", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <Ic n="⭐" /> Ir a PRO
          </button>
          <UserMenu />
        </div>
      </div>

      )}

      {/* Pro upsell banner */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.accent}20`, padding: "10px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: C.textDim }}><Ic n="🚀" /> ¿Quieres benchmarks LATAM, IA, escalado y más? </span>
        <button onClick={onStartTrial} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
          Prueba PRO gratis 3 días →
        </button>
      </div>

      <MobileProfitBar R={R} fmt={fmt} isProfit={isProfit} />
      <div className="main-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px 40px", display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: 24, alignItems: "start" }}>

        {/* LEFT */}
        <motion.div className="left-panel" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px", position: "sticky", top: 94 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}><Ic n="⚙" /> Tu campaña</div>
          <CurrencySelector value={currencyCode} onChange={setCurrencyCode} />
          <NumInput label="Costo del producto" value={inputs.costo} onChange={set("costo")} icon="📦" prefix={currency.symbol} />
          <NumInput label="Precio de venta" value={inputs.precio} onChange={set("precio")} icon="🏷️" prefix={currency.symbol} />
          <NumInput label="Costo de envío" value={inputs.envio} onChange={set("envio")} icon="🚚" prefix={currency.symbol} />
          <NumInput label="CPA (Costo por adquisición)" value={inputs.cpa} onChange={set("cpa")} icon="📣" prefix={currency.symbol} sublabel="Gasto en ads por pedido generado" />
          <NumInput label="Total de pedidos" value={inputs.pedidos} onChange={set("pedidos")} prefix="#" icon="📋" />
          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
          <Slider label="Pedidos confirmados" sublabel="Responden y confirman" value={inputs.pctConfirmados} onChange={set("pctConfirmados")} color={C.accent} />
          <Slider label="Pedidos entregados" sublabel="Realmente entregados" value={inputs.pctEntregados} onChange={set("pctEntregados")} color={C.green} />
          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 7 }}><Ic n="🔁" /> Recuperación del producto</div>
          <Toggle value={inputs.recupera} onChange={set("recupera")} />

          {/* Fixed costs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <div style={{ background: `${C.purple}0A`, border: `1px solid ${C.purple}25`, borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Comisión Dropi</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>2.5%</div>
            </div>
            <div style={{ background: `${C.amber}0A`, border: `1px solid ${C.amber}25`, borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Flete devuelto</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>40%</div>
            </div>
          </div>
          <SavedCalcs inputs={inputs} currency={currency} R={R} limit={5} onLoad={(inp, cur) => { setInputs(inp); if (cur) setCurrencyCode(cur); }} />
        </motion.div>

        {/* RIGHT */}
        <div>
          {/* Health score simple */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: C.card, border: `1px solid ${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}40`, borderRadius: 16, padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 70, height: 70, flexShrink: 0 }}>
              <svg width="70" height="70" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="35" cy="35" r="28" fill="none" stroke={C.border} strokeWidth="5" />
                <circle cx="35" cy="35" r="28" fill="none" stroke={health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red} strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - health.score / 100)}`} strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, lineHeight: 1 }}>{health.score}</div>
                <div style={{ fontSize: 8, color: C.textMuted }}>/ 100</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Salud de campaña</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, marginBottom: 5 }}>
                {health.score >= 75 ? "Saludable" : health.score >= 50 ? "En riesgo" : "Crítico"}
              </div>
              {health.issues[0] && (
                <div style={{ fontSize: 11, color: C.amber, background: `${C.amber}10`, borderRadius: 7, padding: "4px 9px", display: "inline-block" }}>
                  <Ic n="⚠" /> {health.issues[0].label}
                </div>
              )}
            </div>
            {/* PRO teaser */}
            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}25`, borderRadius: 10, padding: "10px 12px", textAlign: "center", flexShrink: 0, cursor: "pointer" }} onClick={onUpgrade}>
              <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, marginBottom: 3 }}><Ic n="⭐" /> Solo en PRO</div>
              <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>Análisis detallado<br />+ IA + Benchmarks</div>
            </div>
          </motion.div>

          {/* Main result */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ background: isProfit ? `${C.green}0A` : `${C.red}0A`, border: `1.5px solid ${isProfit ? C.green : C.red}40`, borderRadius: 16, padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6, fontWeight: 600 }}><Rich>{isProfit ? "✦ Ganancia neta total" : "⚠ Pérdida neta total"}</Rich></div>
              <div style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, letterSpacing: "-0.03em", color: isProfit ? C.green : C.red, lineHeight: 1 }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Margen: <span style={{ fontWeight: 700, color: isProfit ? C.green : C.red }}>{fmtPct(R.margen)}</span> · <Flag c={currency.flag} /> {currency.code}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: isProfit ? `${C.green}15` : `${C.red}15`, border: `2px solid ${isProfit ? C.green : C.red}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}><Ic n={isProfit ? "🚀" : "⚠"} /></div>
          </motion.div>

          <CpaCard R={R} inputs={inputs} fmt={fmt} />

          {/* Key metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Ganancia por pedido", value: fmt(R.gananciaXPedido), color: R.gananciaXPedido >= 0 ? C.green : C.red, icon: "💰" },
              { label: "Ingresos totales", value: fmt(R.ingresosBrutos), color: C.green, icon: "📈" },
              { label: "Gastos totales", value: fmt(R.gastosTotales), color: C.red, icon: "📉" },
              { label: "Total invertido ads", value: fmt(R.invAds), color: C.accent, icon: "📣" },
            ].map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px 15px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 6 }}><Ic n={m.icon} /> {m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Pedidos flow */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}><Ic n="📊" /> Flujo de pedidos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                { label: "Totales", val: inputs.pedidos, color: C.accent },
                { label: "Confirmados", val: Math.round(R.confirmados), color: C.accent },
                { label: "Entregados", val: Math.round(R.entregados), color: C.green },
                { label: "Devueltos", val: Math.round(R.devoluciones), color: C.red },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center", background: C.surface, borderRadius: 10, padding: "10px 6px" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{fmtNum(item.val)}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Simple chart */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Flujo de pedidos</div>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: C.textDim, fontSize: 10 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* PRO upsell cards */}
          <div style={{ background: C.card, border: `1px solid ${C.gold}25`, borderRadius: 16, padding: "20px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 6 }}><Ic n="⭐" /> Solo en PRO — esto te estás perdiendo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { icon: "🏆", text: "Benchmarks LATAM reales" },
                { icon: "📈", text: "Simulador de escalado" },
                { icon: "🔍", text: "Pérdida Invisible detectada" },
                { icon: "🎯", text: "Oportunidades de crecimiento" },
                { icon: "🤖", text: "Asesor de IA ilimitado" },
                { icon: "⚡", text: "Predictor de quiebre" },
                { icon: "📊", text: "Comparador de productos" },
                { icon: "📄", text: "PDF profesional" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textDim }}>
                  <span style={{ fontSize: 14, display: "inline-flex" }}><Ic n={item.icon} /></span>{item.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ flex: 1, background: C.text, border: "none", borderRadius: 10, padding: "11px 16px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.accentGlow}` }}>
                <Ic n="🎁" /> Probar PRO gratis 3 días
              </motion.button>
              <button onClick={onUpgrade} style={{ flex: 1, background: "transparent", border: `1px solid ${C.gold}40`, borderRadius: 10, padding: "11px 16px", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Ic n="⭐" /> Activar PRO — $5.99/mes
              </button>
            </div>
          </div>
        </div>
      </div>
      <GlobalStyles />
    </div>
  );
}

// ─── PRO CALCULATOR ───────────────────────────────────────────────────────────
function ProCalculator({ trialDaysLeft, onUpgrade, onBackToFree, onHome, onFinance }) {
  const [currencyCode, setCurrencyCode] = useState(() => readPrefs().currency || "USD");
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const fmt = makeFmt(currency.symbol);
  const [inputs, setInputs] = useState(() => ({ ...{ costo: 8, precio: 35.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true }, ...prefInputs() }));
  const set = (key) => (val) => setInputs(p => ({ ...p, [key]: val }));
  const R = useCalc(inputs);
  const health = calcHealth(inputs, R);
  const risk = calcRisk(inputs, R);
  const invisible = calcInvisibleLosses(inputs, R);
  const breakPts = calcBreakPoints(inputs, R);
  const isProfit = R.gananciaNet >= 0;
  const [tab, setTab] = useState(() => { const t = window.__nxCalcTab; window.__nxCalcTab = null; return t || "resultados"; });
  const [sims, setSims] = useState(() => { try { return JSON.parse(localStorage.getItem("cod_sims_pro") || "[]"); } catch { return []; } });
  const [simName, setSimName] = useState(""); const [showSave, setShowSave] = useState(false);
  const [scenarioMode, setScenarioMode] = useState("realista");
  // Comparador A/B
  const [prodB, setProdB] = useState({ costo: 12, precio: 49.99, envio: 6, cpa: 5 });

  const scenarios = {
    conservador: { cpa: inputs.cpa * 1.3, confirmacion: Math.max(50, inputs.pctConfirmados - 10), entrega: Math.max(50, inputs.pctEntregados - 10), label: "Conservador", desc: "Peor escenario posible", color: C.amber },
    realista: { cpa: inputs.cpa, confirmacion: inputs.pctConfirmados, entrega: inputs.pctEntregados, label: "Realista", desc: "Tus números actuales", color: C.accent },
    agresivo: { cpa: inputs.cpa * 0.8, confirmacion: Math.min(90, inputs.pctConfirmados + 8), entrega: Math.min(85, inputs.pctEntregados + 8), label: "Agresivo", desc: "Optimizado al máximo", color: C.green },
  };

  const scenarioResults = useMemo(() => {
    return Object.entries(scenarios).map(([key, sc]) => {
      const conf = inputs.pedidos * (sc.confirmacion / 100);
      const ent = conf * (sc.entrega / 100);
      const dev = conf - ent;
      const noConf = inputs.pedidos - conf;
      const dropi = inputs.precio * 0.025;
      const gxp = inputs.precio - inputs.costo - inputs.envio - sc.cpa - dropi;
      const gan = ent * gxp - dev * sc.cpa - dev * inputs.envio * 0.6 - (!inputs.recupera ? dev * inputs.costo : 0) - noConf * sc.cpa;
      const margen = (ent * inputs.precio) > 0 ? (gan / (ent * inputs.precio)) * 100 : 0;
      return { key, ...sc, ganancia: gan, margen, entregados: Math.round(ent) };
    });
  }, [inputs, scenarioMode]);

  // Product B calc
  const RB = useMemo(() => {
    const { costo, precio, envio, cpa } = prodB;
    const conf = inputs.pedidos * (inputs.pctConfirmados / 100);
    const ent = conf * (inputs.pctEntregados / 100);
    const dev = conf - ent;
    const noConf = inputs.pedidos - conf;
    const dropi = precio * 0.025;
    const gxp = precio - costo - envio - cpa - dropi;
    const gan = ent * gxp - dev * cpa - dev * envio * 0.6 - (!inputs.recupera ? dev * costo : 0) - noConf * cpa;
    const margen = (ent * precio) > 0 ? (gan / (ent * precio)) * 100 : 0;
    const roas = cpa > 0 ? precio / cpa : 0;
    const roasBE = precio > (costo + envio + dropi) ? precio / (precio - costo - envio - dropi) : 0;
    return { ganancia: gan, margen, roas, roasBreakEven: roasBE };
  }, [prodB, inputs]);

  const scaleData = useMemo(() => [1, 1.5, 2, 3, 5, 10].map(m => {
    const ped = inputs.pedidos * m;
    const conf = ped * (inputs.pctConfirmados / 100);
    const ent = conf * (inputs.pctEntregados / 100);
    const dev = conf - ent;
    const noConf = ped - conf;
    const dropi = inputs.precio * 0.025;
    const gxp = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
    const gan = ent * gxp - dev * inputs.cpa - dev * inputs.envio * 0.6 - (!inputs.recupera ? dev * inputs.costo : 0) - noConf * inputs.cpa;
    return { m: `${m}x`, ganancia: Math.max(0, gan), pedidos: Math.round(ped) };
  }), [inputs]);

  const growthOps = useMemo(() => {
    const dropi = inputs.precio * 0.025;
    const ganXP = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
    const ops = [];
    const newPrecio = inputs.precio * 1.15;
    const newDropi = newPrecio * 0.025;
    const newGXP = newPrecio - inputs.costo - inputs.envio - inputs.cpa - newDropi;
    const newGan = R.entregados * newGXP - R.devoluciones * inputs.cpa - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * inputs.cpa;
    ops.push({ icon: "💰", title: "Aumentar precio 15%", desc: `De ${fmt(inputs.precio)} a ${fmt(newPrecio)}`, gain: newGan - R.gananciaNet, time: "Inmediato", dif: "Fácil", priority: 1 });
    const newEntPct = Math.min(100, inputs.pctEntregados + 10);
    const newEnt = R.confirmados * (newEntPct / 100);
    const newDev = R.confirmados - newEnt;
    const gan2 = newEnt * ganXP - newDev * inputs.cpa - newDev * inputs.envio * 0.6 - (!inputs.recupera ? newDev * inputs.costo : 0) - R.noConfirmados * inputs.cpa;
    ops.push({ icon: "📬", title: `Mejorar entrega al ${newEntPct}%`, desc: `+${fmtNum(Math.round(newEnt - R.entregados))} pedidos entregados`, gain: gan2 - R.gananciaNet, time: "1-2 semanas", dif: "Media", priority: 2 });
    const newConfPct = Math.min(100, inputs.pctConfirmados + 10);
    const newConf = inputs.pedidos * (newConfPct / 100);
    const newEnt2 = newConf * (inputs.pctEntregados / 100);
    const newDev2 = newConf - newEnt2;
    const noConf2 = inputs.pedidos - newConf;
    const gan3 = newEnt2 * ganXP - newDev2 * inputs.cpa - newDev2 * inputs.envio * 0.6 - (!inputs.recupera ? newDev2 * inputs.costo : 0) - noConf2 * inputs.cpa;
    ops.push({ icon: "📞", title: `Mejorar confirmación al ${newConfPct}%`, desc: "Mejor proceso de llamadas y seguimiento", gain: gan3 - R.gananciaNet, time: "1 semana", dif: "Media", priority: 3 });
    const newCPA = inputs.cpa * 0.8;
    const gxp2 = inputs.precio - inputs.costo - inputs.envio - newCPA - dropi;
    const gan4 = R.entregados * gxp2 - R.devoluciones * newCPA - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * newCPA;
    ops.push({ icon: "📣", title: "Reducir CPA un 20%", desc: `De ${fmt(inputs.cpa)} a ${fmt(newCPA)}`, gain: gan4 - R.gananciaNet, time: "2-4 semanas", dif: "Difícil", priority: 4 });
    return ops.sort((a, b) => b.gain - a.gain);
  }, [inputs, R]);

  const saveSim = () => {
    if (!simName.trim()) return;
    const s = { id: Date.now(), name: simName.trim(), date: new Date().toLocaleDateString("es-ES"), currency: currency.code, inputs: { ...inputs }, results: { gananciaNet: R.gananciaNet, margen: R.margen } };
    const updated = [s, ...sims].slice(0, 10);
    setSims(updated); localStorage.setItem("cod_sims_pro", JSON.stringify(updated));
    setSimName(""); setShowSave(false);
  };

  const generatePDF = () => {
    const h = calcHealth(inputs, R);
    const r = calcRisk(inputs, R);
    const date = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte PRO COD</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:36px;color:#1a1a2e}
.header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:28px;border-radius:12px;margin-bottom:24px}
.header h1{font-size:22px;font-weight:900;margin-bottom:4px}.badge{display:inline-block;background:rgba(59,130,246,.3);border:1px solid rgba(59,130,246,.5);border-radius:6px;padding:2px 9px;font-size:10px;color:#93c5fd;font-weight:700;margin-bottom:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px}
.card-label{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:600;margin-bottom:4px}
.card-value{font-size:18px;font-weight:800}
.green{color:#059669}.red{color:#dc2626}.blue{color:#2563eb}.purple{color:#7c3aed}.amber{color:#d97706}
.section-title{font-size:13px;font-weight:800;color:#0f172a;margin:16px 0 10px;padding-bottom:5px;border-bottom:2px solid #e2e8f0}
.big-card{border-radius:12px;padding:20px;margin-bottom:16px}
.profit{background:${isProfit ? "#f0fdf4" : "#fef2f2"};border:2px solid ${isProfit ? "#86efac" : "#fca5a5"}}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:12px}
.footer{margin-top:30px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
</style></head><body>
<div class="header"><div class="badge">Nexus COD PRO · LATAM · ${currency.name}</div><h1>Reporte Profesional de Rentabilidad</h1><p style="font-size:11px;opacity:.7">${date} · Salud: ${h.score}/100 · Riesgo: ${r.level}</p></div>
<div class="section-title">Parámetros</div>
<div class="grid3">
<div class="card"><div class="card-label">Costo producto</div><div class="card-value blue">${fmt(inputs.costo)}</div></div>
<div class="card"><div class="card-label">Precio venta</div><div class="card-value blue">${fmt(inputs.precio)}</div></div>
<div class="card"><div class="card-label">Costo envío</div><div class="card-value blue">${fmt(inputs.envio)}</div></div>
<div class="card"><div class="card-label">CPA</div><div class="card-value blue">${fmt(inputs.cpa)}</div></div>
<div class="card"><div class="card-label">Total pedidos</div><div class="card-value blue">${inputs.pedidos}</div></div>
<div class="card"><div class="card-label">Invertido en ads</div><div class="card-value purple">${fmt(R.invAds)}</div></div>
</div>
<div class="big-card profit">
<div style="font-size:10px;color:${isProfit ? "#065f46" : "#991b1b"};text-transform:uppercase;font-weight:700;margin-bottom:6px">${isProfit ? "GANANCIA NETA" : "PÉRDIDA NETA"}</div>
<div style="font-size:36px;font-weight:900;color:${isProfit ? "#059669" : "#dc2626"}">${isProfit ? "" : "−"}${fmt(R.gananciaNet)}</div>
<div style="font-size:12px;color:#64748b;margin-top:5px">Margen: <strong>${fmtPct(R.margen)}</strong> · ROAS: ${R.roas.toFixed(2)}x · BE: ${R.roasBreakEven.toFixed(2)}x</div>
</div>
<div class="section-title">KPIs Clave</div>
<div class="grid3">
<div class="card"><div class="card-label">Entregados</div><div class="card-value green">${Math.round(R.entregados)}</div></div>
<div class="card"><div class="card-label">Devoluciones</div><div class="card-value red">${Math.round(R.devoluciones)}</div></div>
<div class="card"><div class="card-label">Pérdidas dev.</div><div class="card-value red">${fmt(R.totalPerdidaDev)}</div></div>
<div class="card"><div class="card-label">Comisión Dropi</div><div class="card-value purple">${fmt(R.totalDropi)}</div></div>
<div class="card"><div class="card-label">Punto quiebre entrega</div><div class="card-value amber">${breakPts.minEntrega}%</div></div>
<div class="card"><div class="card-label">CPA máximo seguro</div><div class="card-value amber">${fmt(breakPts.maxCPA)}</div></div>
</div>
<div class="section-title">Desglose por pedido</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:16px">
<div class="row"><span>+ Precio venta</span><span class="green">${fmt(inputs.precio)}</span></div>
<div class="row"><span>− Producto</span><span class="red">−${fmt(inputs.costo)}</span></div>
<div class="row"><span>− Envío</span><span class="red">−${fmt(inputs.envio)}</span></div>
<div class="row"><span>− CPA</span><span class="red">−${fmt(inputs.cpa)}</span></div>
<div class="row"><span>− Dropi 2.5%</span><span class="red">−${fmt(inputs.precio * 0.025)}</span></div>
<div class="row"><span>= Ganancia neta</span><span class="${R.gananciaXPedido >= 0 ? "green" : "red"}">${fmt(R.gananciaXPedido)}</span></div>
</div>
<div class="footer">Nexus COD PRO · Simulación Financiera Real · Dropshipping Contraentrega LATAM</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 300);
  };

  const TABS = [
    { id: "resultados", label: "📊 Resultados" },
    { id: "cpa", label: "🎯 CPA real" },
    { id: "salud", label: "❤️ Salud & Riesgo" },
    { id: "benchmarks", label: "🏆 Benchmarks" },
    { id: "invisible", label: "🔍 Pérdida Invisible" },
    { id: "escenarios", label: "🎭 Escenarios" },
    { id: "escalado", label: "📈 Escalado" },
    { id: "oportunidades", label: "🎯 Optimización" },
    { id: "comparador", label: "⚖️ Comparador" },
    { id: "ia", label: "🤖 IA" },
  ];

  return (
    <AppShell active="calc" onHome={onHome} onCalc={() => {}} onFinance={onFinance} onBackToFree={onBackToFree}
      right={<>
            <div className="hide-mobile" style={{ background: `${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}15`, border: `1px solid ${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}35`, borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red }}><Ic n="❤" /> {health.score}/100</div>
            <div className="hide-mobile" style={{ background: `${risk.color}15`, border: `1px solid ${risk.color}35`, borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700, color: risk.color }}><Ic n={risk.emoji} /> {risk.level}</div>
            <button className="hide-mobile" onClick={generatePDF} style={{ background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 7, padding: "4px 10px", color: C.green, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}><Ic n="📄" /> PDF</button>
      </>}>
      {trialDaysLeft > 0 && <div style={{ padding: "12px 12px 0" }}><TrialBanner daysLeft={trialDaysLeft} onUpgrade={onUpgrade} /></div>}

      <MobileProfitBar R={R} fmt={fmt} isProfit={isProfit} />
      <div className="main-layout" style={{ maxWidth: 1300, margin: "0 auto", padding: "16px 12px 40px", display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: 24, alignItems: "start" }}>

        {/* LEFT */}
        <motion.div className="left-panel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          style={{ background: C.card, border: `1px solid ${C.gold}20`, borderRadius: 18, padding: "18px", position: "sticky", top: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}><Ic n="⚙" /></span>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Campaña</div>
            <span style={{ background: `${C.gold}18`, color: C.gold, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px", marginLeft: "auto" }}>PRO</span>
          </div>
          <CurrencySelector value={currencyCode} onChange={setCurrencyCode} />
          <NumInput label="Costo del producto" value={inputs.costo} onChange={set("costo")} icon="📦" prefix={currency.symbol} />
          <NumInput label="Precio de venta" value={inputs.precio} onChange={set("precio")} icon="🏷️" prefix={currency.symbol} />
          <NumInput label="Costo de envío" value={inputs.envio} onChange={set("envio")} icon="🚚" prefix={currency.symbol} />
          <NumInput label="CPA" value={inputs.cpa} onChange={set("cpa")} icon="📣" prefix={currency.symbol} sublabel="Costo por pedido generado" />
          <NumInput label="Total de pedidos" value={inputs.pedidos} onChange={set("pedidos")} prefix="#" icon="📋" />
          <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
          <Slider label="Confirmados" value={inputs.pctConfirmados} onChange={set("pctConfirmados")} color={C.accent} />
          <Slider label="Entregados" value={inputs.pctEntregados} onChange={set("pctEntregados")} color={C.green} />
          <div style={{ height: 1, background: C.border, margin: "14px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 7 }}><Ic n="🔁" /> Recuperación del producto</div>
          <Toggle value={inputs.recupera} onChange={set("recupera")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
            <div style={{ background: `${C.purple}0A`, border: `1px solid ${C.purple}25`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Dropi</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.purple }}>2.5%</div>
            </div>
            <div style={{ background: `${C.amber}0A`, border: `1px solid ${C.amber}25`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Flete</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.amber }}>40%</div>
            </div>
          </div>
          <div style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 7 }}>Ganancia por pedido</div>
            {[
              { label: "+ Precio", val: inputs.precio, pos: true },
              { label: "− Producto", val: inputs.costo },
              { label: "− Envío", val: inputs.envio },
              { label: "− CPA", val: inputs.cpa },
              { label: "− Dropi", val: inputs.precio * 0.025 },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3, color: row.pos ? C.green : C.textDim }}>
                <span>{row.label}</span><span style={{ fontWeight: 700 }}>{fmt(row.val)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: C.border, margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: R.gananciaXPedido >= 0 ? C.green : C.red }}>
              <span>= Ganancia</span><span>{fmt(R.gananciaXPedido)}</span>
            </div>
          </div>
          <SavedCalcs inputs={inputs} currency={currency} R={R} limit={50} onLoad={(inp, cur) => { setInputs(inp); if (cur) setCurrencyCode(cur); }} />
          <button onClick={generatePDF} style={{ width: "100%", marginTop: 10, background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "9px", color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}><Ic n="📄" /> Generar PDF profesional</button>
        </motion.div>

        {/* RIGHT */}
        <div>
          {/* Big result */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: isProfit ? `${C.green}12` : `${C.red}12`, border: `1px solid ${isProfit ? C.green : C.red}50`, boxShadow: `0 18px 50px ${isProfit ? C.green : C.red}14`, borderRadius: 16, padding: "22px 24px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6, fontWeight: 600 }}><Rich>{isProfit ? "✦ Ganancia neta total" : "⚠ Pérdida neta total"}</Rich></div>
              <div style={{ fontSize: "clamp(30px,4.6vw,54px)", fontWeight: 700, letterSpacing: "-0.03em", color: isProfit ? C.green : C.red, lineHeight: 1 }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Margen: <span style={{ fontWeight: 700, color: isProfit ? C.green : C.red }}>{fmtPct(R.margen)}</span> · <Flag c={currency.flag} /> {currency.code}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Total ads invertido</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{fmt(R.invAds)}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>ROAS {R.roas.toFixed(2)}x · BE {R.roasBreakEven.toFixed(2)}x</div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: "7px 12px", background: tab === t.id ? `${C.accent}1F` : C.card, border: `1px solid ${tab === t.id ? C.accent : C.border}`, borderRadius: 9, color: tab === t.id ? C.text : C.textDim, fontSize: 11, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
                <Rich>{t.label}</Rich>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

              {/* ── RESULTADOS ── */}
              {tab === "resultados" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "4px 0 10px" }}>Pedidos</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
                    {[
                      { label: "Totales", val: fmtNum(inputs.pedidos), color: C.accent, icon: "📋" },
                      { label: "Confirmados", val: fmtNum(R.confirmados), color: C.accent, icon: "✅" },
                      { label: "Entregados", val: fmtNum(R.entregados), color: C.green, icon: "📬" },
                      { label: "Devoluciones", val: fmtNum(R.devoluciones), color: C.red, icon: "↩️" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 7 }}><Ic n={m.icon} /> {m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "4px 0 10px" }}>Ingresos y gastos</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
                    {[
                      { label: "Ingresos totales", val: fmt(R.ingresosBrutos), color: C.green, icon: "📈" },
                      { label: "Gastos totales", val: fmt(R.gastosTotales), color: C.red, icon: "📉" },
                      { label: "Ganancia/pedido", val: fmt(R.gananciaXPedido), color: R.gananciaXPedido >= 0 ? C.green : C.red, icon: "💰" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 7 }}><Ic n={m.icon} /> {m.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "4px 0 10px" }}>Publicidad y comisión</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
                    {[
                      { label: "ROAS actual", val: `${R.roas.toFixed(2)}x`, color: C.accent, icon: "🎯" },
                      { label: "ROAS Break Even", val: `${R.roasBreakEven.toFixed(2)}x`, color: C.amber, icon: "⚖️" },
                      { label: "Comisión Dropi", val: fmt(R.totalDropi), color: C.purple, icon: "🏢" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 7 }}><Ic n={m.icon} /> {m.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "4px 0 10px" }}>Dónde pierdes dinero</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
                    {[
                      { label: "Pérdidas dev.", val: fmt(R.totalPerdidaDev), color: C.red, icon: "💸" },
                      { label: "Perdido en ads", val: fmt(R.perdidaCPA_dev + R.perdidaCPA_noc), color: C.red, icon: "📣" },
                      { label: "Perdido logística", val: fmt(R.perdidaFlete_dev), color: C.amber, icon: "🚚" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 7 }}><Ic n={m.icon} /> {m.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Charts */}
                  <div className="charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 10 }}>Flujo de pedidos</div>
                      <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                          <Pie data={[{ name: "Entregados", value: Math.max(0, Math.round(R.entregados)), color: C.green }, { name: "Devoluciones", value: Math.max(0, Math.round(R.devoluciones)), color: C.red }, { name: "No confirmados", value: Math.max(0, Math.round(R.noConfirmados)), color: C.textMuted }]} cx="50%" cy="45%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                            {[C.green, C.red, C.textMuted].map((color, i) => <Cell key={i} fill={color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }} />
                          <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ color: C.textDim, fontSize: 9 }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 10 }}>Ingresos vs Gastos</div>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={[{ name: "Ingresos", value: R.ingresosBrutos, fill: C.green }, { name: "Gastos", value: R.gastosTotales, fill: C.red }, { name: "Ganancia", value: Math.max(0, R.gananciaNet), fill: C.accent }]} barSize={44} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }} formatter={v => [`${currency.symbol}${v.toFixed(2)}`]} />
                          <Bar dataKey="value" radius={[5, 5, 0, 0]}>{[C.green, C.red, C.accent].map((c, i) => <Cell key={i} fill={c} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {tab === "cpa" && <CpaTab inputs={inputs} R={R} fmt={fmt} />}

              {/* ── SALUD & RIESGO ── */}
              {tab === "salud" && (
                <div>
                  {/* Health score */}
                  <div style={{ background: C.card, border: `1px solid ${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}40`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                      <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                        <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="45" cy="45" r="36" fill="none" stroke={C.border} strokeWidth="6" />
                          <circle cx="45" cy="45" r="36" fill="none" stroke={health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red} strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - health.score / 100)}`} strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 6px ${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red})` }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, lineHeight: 1 }}>{health.score}</div>
                          <div style={{ fontSize: 9, color: C.textMuted }}>/ 100</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Puntuación de salud</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, marginBottom: 4 }}>
                          {health.score >= 75 ? "Saludable" : health.score >= 50 ? "En riesgo" : "Crítico"}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{health.issues.length} problema(s) · {health.wins.length} punto(s) positivo(s)</div>
                      </div>
                    </div>
                    {health.issues.map((issue, i) => (
                      <div key={i} style={{ background: `${issue.severity === "urgente" ? C.red : C.amber}08`, border: `1px solid ${issue.severity === "urgente" ? C.red : C.amber}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 12 }}><Ic n={issue.severity === "urgente" ? "🚨" : "⚠"} /></span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: issue.severity === "urgente" ? C.red : C.amber }}>{issue.label}</span>
                          <span style={{ background: `${issue.severity === "urgente" ? C.red : C.amber}20`, color: issue.severity === "urgente" ? C.red : C.amber, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px" }}>{issue.severity}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{issue.detail}</div>
                      </div>
                    ))}
                    {health.wins.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {health.wins.map((w, i) => <div key={i} style={{ background: `${C.green}0A`, border: `1px solid ${C.green}25`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: C.green }}><Ic n="✓" /> {w.label}: {w.detail}</div>)}
                    </div>}
                  </div>

                  {/* Risk level */}
                  <div style={{ background: `${risk.color}08`, border: `1.5px solid ${risk.color}40`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}><Ic n="⚡" /> Nivel de riesgo</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <div style={{ fontSize: 36, color: risk.color }}><Ic n={risk.emoji} /></div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: risk.color }}>{risk.level}</div>
                        <div style={{ fontSize: 13, color: C.textDim }}>{risk.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Margen", val: fmtPct(R.margen), ok: R.margen >= 20 },
                        { label: "Entrega", val: `${inputs.pctEntregados}%`, ok: inputs.pctEntregados >= 70 },
                        { label: "ROAS vs BE", val: `${R.roas.toFixed(1)}x vs ${R.roasBreakEven.toFixed(1)}x`, ok: R.roas >= R.roasBreakEven },
                      ].map((item, i) => (
                        <div key={i} style={{ background: item.ok ? `${C.green}08` : `${C.red}08`, border: `1px solid ${item.ok ? C.green : C.red}25`, borderRadius: 9, padding: "9px 10px" }}>
                          <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 3 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: item.ok ? C.green : C.red }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Break predictor */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}><Ic n="⚡" /> Predictor de Quiebre</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Los límites críticos de tu campaña. Si cruzas estas líneas, pierdes dinero.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}25`, borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}><Ic n="🚨" /> Entrega mínima rentable</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: C.red }}>{breakPts.minEntrega}%</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          {inputs.pctEntregados > breakPts.minEntrega
                            ? `Correcto: Estás ${inputs.pctEntregados - breakPts.minEntrega}pp por encima del límite`
                            : `Atención: Estás ${breakPts.minEntrega - inputs.pctEntregados}pp por debajo del límite`}
                        </div>
                      </div>
                      <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}25`, borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}><Ic n="⚠" /> CPA máximo seguro</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: C.amber }}>{fmt(breakPts.maxCPA)}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          {inputs.cpa <= breakPts.maxCPA
                            ? `Correcto: Tu CPA está ${fmt(breakPts.maxCPA - inputs.cpa)} por debajo del límite`
                            : `Atención: Tu CPA supera el límite en ${fmt(inputs.cpa - breakPts.maxCPA)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BENCHMARKS ── */}
              {tab === "benchmarks" && (
                <div>
                  <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}><Ic n="🏆" /> Benchmarks COD LATAM</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>Datos reales del mercado de dropshipping contraentrega en Ecuador y Colombia.</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px", marginBottom: 12 }}>
                    <BenchmarkBar label="Tasa de Confirmación" value={inputs.pctConfirmados} bench={BENCH.confirmacion} />
                    <BenchmarkBar label="Tasa de Entrega" value={inputs.pctEntregados} bench={BENCH.entrega} />
                    <BenchmarkBar label="Margen de Ganancia" value={R.margen} bench={BENCH.margen} />
                    <BenchmarkBar label="ROAS Break Even" value={R.roasBreakEven} bench={BENCH.roas} suffix="x" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { icon: "📞", title: "Confirmación promedio LATAM", val: "70-80%", tip: "Llamar en las primeras 2 horas mejora hasta 20% la confirmación.", color: C.accent },
                      { icon: "📬", title: "Entrega promedio LATAM", val: "68-75%", tip: "Urbano: 75%. Rural: baja a 55%. Elige bien tu zona de cobertura.", color: C.green },
                      { icon: "💰", title: "Margen saludable COD", val: "25-35%", tip: "Bajo el 20%, cualquier variación en devoluciones te pone en pérdida.", color: C.amber },
                      { icon: "📣", title: "CPA óptimo LATAM", val: "8-15% del precio", tip: "Si el CPA supera el 15% del precio de venta, revisa la segmentación.", color: C.purple },
                    ].map((item, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px" }}>
                        <div style={{ fontSize: 20, marginBottom: 8 }}><Ic n={item.icon} /></div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 3 }}>{item.title}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: item.color, marginBottom: 5 }}>{item.val}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{item.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PÉRDIDA INVISIBLE ── */}
              {tab === "invisible" && (
                <div>
                  <div style={{ background: C.card, border: `1px solid ${C.red}25`, borderRadius: 16, padding: "20px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 8 }}><Ic n="🔍" /> Pérdida Invisible</div>
                    <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Este es el dinero que <strong style={{ color: C.text }}>podrías estar ganando</strong> si optimizas los puntos clave de tu campaña. No es lo que pierdes — es lo que dejas de ganar.</div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: C.red, letterSpacing: "-0.02em", marginBottom: 6 }}>−{fmt(invisible.total)}</div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>dinero que estás dejando sobre la mesa</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: "📬", label: "Por baja tasa de entrega", amount: invisible.lossEntrega, desc: `Si llevaras la entrega al 75% (óptimo LATAM), ganarías ${fmt(invisible.lossEntrega)} más`, action: "Mejorar seguimiento post-confirmación y aliarte con mejor transportadora" },
                      { icon: "📞", label: "Por baja confirmación", amount: invisible.lossConf, desc: `Si llevaras la confirmación al 78%, ganarías ${fmt(invisible.lossConf)} más`, action: "Llamar en los primeros 30 minutos después del pedido" },
                      { icon: "📣", label: "Por CPA alto", amount: invisible.lossCPA, desc: `Si bajaras el CPA un 20% (a ${fmt(inputs.cpa * 0.8)}), ganarías ${fmt(invisible.lossCPA)} más`, action: "Optimizar audiencias y creativos para mejorar CPM y CTR" },
                    ].map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", display: "flex", gap: 14 }}>
                        <div style={{ fontSize: 26, flexShrink: 0 }}><Ic n={item.icon} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>−{fmt(item.amount)}</div>
                          </div>
                          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8, lineHeight: 1.5 }}>{item.desc}</div>
                          <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 8, padding: "7px 10px", fontSize: 11, color: C.green }}>
                            <Ic n="💡" /> {item.action}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ESCENARIOS ── */}
              {tab === "escenarios" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}><Ic n="🎭" /> Modo Escenario</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Tres proyecciones automáticas basadas en tus datos. Sin cambiar nada manualmente.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                    {scenarioResults.map((sc, i) => (
                      <motion.div key={sc.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        onClick={() => setScenarioMode(sc.key)}
                        style={{ background: scenarioMode === sc.key ? `${sc.color}12` : C.card, border: `1.5px solid ${scenarioMode === sc.key ? sc.color : C.border}`, borderRadius: 14, padding: "16px", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: sc.color, marginBottom: 3 }}>{sc.label}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>{sc.desc}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: sc.ganancia >= 0 ? C.green : C.red }}>{sc.ganancia >= 0 ? "" : "−"}{fmt(sc.ganancia)}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Margen: {fmtPct(sc.margen)} · {sc.entregados} entregados</div>
                        <div style={{ height: 1, background: C.border, margin: "10px 0" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: C.textMuted }}>
                          <div>CPA: {fmt(sc.cpa)}</div>
                          <div>Confirmación: {sc.confirmacion.toFixed(0)}%</div>
                          <div>Entrega: {sc.entrega.toFixed(0)}%</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 12 }}>Comparación visual de escenarios</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={scenarioResults.map(sc => ({ name: sc.label, ganancia: Math.max(0, sc.ganancia), fill: sc.color }))} barSize={50} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={v => [`${currency.symbol}${v.toFixed(2)}`]} />
                        <Bar dataKey="ganancia" radius={[6, 6, 0, 0]}>{scenarioResults.map((sc, i) => <Cell key={i} fill={sc.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── ESCALADO ── */}
              {tab === "escalado" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}><Ic n="📈" /> Simulador de Escalado</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>¿Qué pasa con tu ganancia si escalas el presupuesto manteniendo las mismas tasas?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 14 }}>
                    {scaleData.filter(s => ["2x","5x","10x"].includes(s.m)).map((s, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 5 }}>Escalar {s.m}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.ganancia > 0 ? C.green : C.red }}>{fmt(s.ganancia)}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{fmtNum(s.pedidos)} pedidos</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 12 }}>Ganancia proyectada por multiplicador</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={scaleData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="scaleGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                        <XAxis dataKey="m" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={v => [`${currency.symbol}${v.toFixed(2)}`, "Ganancia"]} />
                        <Area type="monotone" dataKey="ganancia" stroke={C.accent} fill="url(#scaleGrad)" strokeWidth={2} dot={{ fill: C.accent, r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── OPTIMIZACIÓN ── */}
              {tab === "oportunidades" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}><Ic n="🎯" /> Centro de Optimización</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Acciones ordenadas por impacto económico real. Las más rentables primero.</div>
                  {growthOps.map((op, i) => {
                    const difColor = { "Fácil": C.green, "Media": C.amber, "Difícil": C.red };
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}><Ic n={op.icon} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{op.title}</span>
                            <span style={{ background: `${difColor[op.dif]}18`, color: difColor[op.dif], fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px" }}>{op.dif}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{op.desc}</div>
                          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: C.textMuted }}>
                            <span>⏱ {op.time}</span>
                            <span><Ic n="🎯" /> Prioridad #{op.priority}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: op.gain >= 0 ? C.green : C.red }}>{op.gain >= 0 ? "+" : "−"}{fmt(op.gain)}</div>
                          <div style={{ fontSize: 9, color: C.textMuted }}>ganancia adicional</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── COMPARADOR ── */}
              {tab === "comparador" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}><Ic n="⚖" /> Comparador de Productos</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>¿Cuál producto conviene más escalar? Compara rentabilidad lado a lado.</div>
                  <div className="stack-m" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    {/* Producto A */}
                    <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}25`, borderRadius: 14, padding: "16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginBottom: 12 }}><Ic n="📦" /> Producto A (actual)</div>
                      {[
                        { label: "Costo", val: fmt(inputs.costo) },
                        { label: "Precio", val: fmt(inputs.precio) },
                        { label: "Envío", val: fmt(inputs.envio) },
                        { label: "CPA", val: fmt(inputs.cpa) },
                      ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, color: C.textDim }}>
                          <span>{row.label}</span><span style={{ fontWeight: 700, color: C.text }}>{row.val}</span>
                        </div>
                      ))}
                    </div>
                    {/* Producto B */}
                    <div style={{ background: `${C.purple}08`, border: `1px solid ${C.purple}25`, borderRadius: 14, padding: "16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.purple, marginBottom: 10 }}><Ic n="📦" /> Producto B (comparar)</div>
                      <NumInput label="Costo" value={prodB.costo} onChange={v => setProdB(p => ({ ...p, costo: v }))} prefix={currency.symbol} />
                      <NumInput label="Precio" value={prodB.precio} onChange={v => setProdB(p => ({ ...p, precio: v }))} prefix={currency.symbol} />
                      <NumInput label="Envío" value={prodB.envio} onChange={v => setProdB(p => ({ ...p, envio: v }))} prefix={currency.symbol} />
                      <NumInput label="CPA" value={prodB.cpa} onChange={v => setProdB(p => ({ ...p, cpa: v }))} prefix={currency.symbol} />
                    </div>
                  </div>
                  {/* Comparison results */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 12 }}>Comparación de resultados</div>
                    {[
                      { label: "Ganancia neta", a: fmt(R.gananciaNet), b: fmt(RB.ganancia), aBetter: R.gananciaNet >= RB.ganancia },
                      { label: "Margen", a: fmtPct(R.margen), b: fmtPct(RB.margen), aBetter: R.margen >= RB.margen },
                      { label: "ROAS actual", a: `${R.roas.toFixed(2)}x`, b: `${RB.roas.toFixed(2)}x`, aBetter: R.roas >= RB.roas },
                      { label: "ROAS Break Even", a: `${R.roasBreakEven.toFixed(2)}x`, b: `${RB.roasBreakEven.toFixed(2)}x`, aBetter: R.roasBreakEven <= RB.roasBreakEven },
                    ].map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{row.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: row.aBetter ? C.green : C.textDim, background: row.aBetter ? `${C.green}08` : "transparent", borderRadius: 7, padding: "4px 8px", textAlign: "center" }}>A: {row.a} {row.aBetter ? <Ic n="✓" /> : ""}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: !row.aBetter ? C.green : C.textDim, background: !row.aBetter ? `${C.green}08` : "transparent", borderRadius: 7, padding: "4px 8px", textAlign: "center" }}>B: {row.b} {!row.aBetter ? <Ic n="✓" /> : ""}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, background: R.gananciaNet >= RB.ganancia ? `${C.green}08` : `${C.purple}08`, border: `1px solid ${R.gananciaNet >= RB.ganancia ? C.green : C.purple}25`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: R.gananciaNet >= RB.ganancia ? C.green : C.purple }}>
                        <Ic n="📦" /> {R.gananciaNet >= RB.ganancia ? "Producto A" : "Producto B"} es más rentable para escalar
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                        Diferencia de ganancia: {fmt(Math.abs(R.gananciaNet - RB.ganancia))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── IA ── */}
              {tab === "ia" && <AITab inputs={inputs} R={R} currency={currency} fmt={fmt} health={health} risk={risk} />}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: C.textMuted }}>Nexus COD PRO · Sistema operativo de dropshipping COD LATAM</div>
      </div>
      <GlobalStyles />
    </AppShell>
  );
}

// ─── AI TAB ───────────────────────────────────────────────────────────────────
function AITab({ inputs, R, currency, fmt, health, risk }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);

  const getAdvice = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = `Eres el mejor consultor de dropshipping COD de Latinoamérica. Analiza esta campaña con precisión quirúrgica y sin rodeos.

MONEDA: ${currency.name} (${currency.symbol})
SALUD: ${health.score}/100 · RIESGO: ${risk.level}

DATOS COMPLETOS:
- Producto: costo ${fmt(inputs.costo)} → precio ${fmt(inputs.precio)} (margen bruto ${(((inputs.precio-inputs.costo)/inputs.precio)*100).toFixed(1)}%)
- Envío: ${fmt(inputs.envio)} · CPA: ${fmt(inputs.cpa)} · Pedidos: ${inputs.pedidos}
- Confirmación: ${inputs.pctConfirmados}% · Entrega: ${inputs.pctEntregados}%
- Recupera producto: ${inputs.recupera ? "Sí" : "No"}

RESULTADOS:
- Entregados: ${Math.round(R.entregados)} · Devoluciones: ${Math.round(R.devoluciones)}
- Ganancia neta: ${fmt(R.gananciaNet)} · Margen: ${R.margen.toFixed(1)}%
- ROAS: ${R.roas.toFixed(2)}x · ROAS BE: ${R.roasBreakEven.toFixed(2)}x
- Pérdidas devoluciones: ${fmt(R.totalPerdidaDev)} · Ads invertidos: ${fmt(R.invAds)}

BENCHMARKS LATAM: Confirmación óptima 75%+, Entrega óptima 70-75%, Margen mínimo 20%

Responde con este formato EXACTO:

🎯 VEREDICTO EJECUTIVO
[2 oraciones máximo. ¿Escala o pausa YA?]

✅ FORTALEZAS REALES
[2-3 puntos con números concretos]

🚨 PROBLEMAS QUE TE CUESTAN DINERO
[Los 2-3 problemas más caros con impacto en ${currency.symbol}]

⚡ 3 ACCIONES PARA ESTA SEMANA
[Acciones ejecutables con impacto estimado en ${currency.symbol}]

📈 PROYECCIÓN 30 DÍAS
[Si aplica las mejoras, ganancia esperada con números reales en ${currency.symbol}]

Sé brutal y honesto. Usa números. Máximo 400 palabras.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      setAdvice(data.content?.map(b => b.text || "").join("") || "Error al analizar.");
    } catch { setAdvice("Error de conexión. Intenta de nuevo."); }
    setLoading(false);
  }, [inputs, R, currency, health, risk]);

  const sections = useMemo(() => {
    if (!advice) return [];
    return advice.split(/(?=🎯|✅|🚨|⚡|📈)/).filter(s => s.trim()).map(s => {
      const lines = s.trim().split("\n");
      const emoji = lines[0].match(/^(🎯|✅|🚨|⚡|📈)/)?.[1] || "";
      const colorMap = { "🎯": C.accent, "✅": C.green, "🚨": C.red, "⚡": C.purple, "📈": C.cyan };
      return { title: lines[0], content: lines.slice(1).join("\n").trim(), color: colorMap[emoji] || C.accent };
    });
  }, [advice]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}><Ic n="🤖" /> Consultor de IA PRO</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Análisis personalizado · Contexto COD LATAM · Sin respuestas genéricas</div>
        </div>
        <motion.button onClick={getAdvice} disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ background: loading ? C.border : C.text, border: "none", borderRadius: 11, padding: "10px 18px", color: loading ? C.textMuted : "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
          {loading ? <><span style={{ display: "inline-block", width: 13, height: 13, border: `2px solid ${C.textMuted}`, borderTopColor: C.text, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Analizando...</> : <><Ic n="✨" /> Analizar mi campaña</>}
        </motion.button>
      </div>
      {!advice && !loading && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><Ic n="🤖" /></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Consultor de IA listo</div>
          <div style={{ fontSize: 12, color: C.textMuted, maxWidth: 320, margin: "0 auto" }}>Analiza todos tus números en tiempo real y te da recomendaciones específicas para tu campaña COD en LATAM.</div>
        </div>
      )}
      <AnimatePresence>
        {(advice || loading) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: `${C.accent}06`, border: `1px solid ${C.accent}18`, borderRadius: 14, padding: "18px", overflow: "hidden" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <div style={{ fontSize: 13, color: C.textMuted }}>Analizando tu campaña con IA...</div>
              </div>
            ) : (
              <div>
                {sections.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ marginBottom: i < sections.length - 1 ? 14 : 0, paddingBottom: i < sections.length - 1 ? 14 : 0, borderBottom: i < sections.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: s.color, marginBottom: 5 }}><Rich>{s.title}</Rich></div>
                    <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, whiteSpace: "pre-wrap" }}><Rich>{s.content}</Rich></div>
                  </motion.div>
                ))}
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={getAdvice} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 11px", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}><Ic n="🔄" /> Nuevo análisis</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function HeroPreview() {
  const rows = [
    { l: "Ingresos por ventas", v: "$1.754,51", w: 100, c: C.green },
    { l: "Publicidad (CPA)", v: "−$400,00", w: 23, c: C.amber },
    { l: "Envío perdido en devoluciones", v: "−$78,75", w: 6, c: C.red },
    { l: "Comisión de Dropi", v: "−$43,86", w: 4, c: C.purple },
    { l: "Ganancia neta", v: "$598,15", w: 34, c: C.accent },
  ];
  return (
    <div style={{ position: "relative" }}>
            <div aria-hidden="true" style={{ position: "relative", background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: 22, boxShadow: "0 40px 90px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim }}>Campaña de ejemplo</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.green, background: `${C.green}14`, border: `1px solid ${C.green}30`, borderRadius: 99, padding: "3px 10px" }}>Seguro · 92/100</div>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Ganancia neta</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: C.green }}>$598,15</div>
          <div style={{ fontSize: 13, color: C.textDim }}>margen 34,1%</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          {[["Confirmados", "75"], ["Entregados", "49"], ["Devueltos", "26"]].map(([l, v]) => (
            <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        {rows.map(r => (
          <div key={r.l} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: C.textDim }}>{r.l}</span><span style={{ color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{r.v}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: C.border }}><div style={{ width: `${r.w}%`, height: "100%", borderRadius: 99, background: r.c }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing({ onOpenFree, onOpenPro, onStartTrial, onUpgrade }) {
  const { user } = useAuth();
  const cpaEx = (() => { const inp = { costo: 8, precio: 35.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true }; return { cpa: inp.cpa, r: useCalcPure(inp), f: makeFmt("$") }; })();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: C.text }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}EE`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Brand onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} size={30} />
          <div className="hide-mobile" style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <a href="#nosotros" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Quiénes somos</a>
            <a href="#precios" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Precios</a>
            <a href="#faq" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>FAQ</a>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!user && <button className="hide-mobile" onClick={onOpenPro} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 16px", color: C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ver PRO</button>}
            <motion.button onClick={user ? () => navTo("panel") : onOpenFree} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: C.text, border: "none", borderRadius: 9, padding: "8px 16px", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{user ? "Ir a mi panel" : "Abrir calculadora"}</motion.button>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "76px 20px 56px" }}>
        <div className="hero-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.02fr) minmax(0,1fr)", gap: 56, alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", fontWeight: 700, letterSpacing: "-0.035em", margin: "0 0 20px", lineHeight: 1.06 }}>
              Deja de perder dinero en campañas que parecen rentables y no lo son
            </h1>
            <p style={{ fontSize: 16, color: C.textDim, maxWidth: 500, margin: "0 0 32px", lineHeight: 1.7 }}>
              Calcula tu ganancia real con todo incluido: costo de envío, CPA de publicidad, devoluciones y comisión de Dropi. Recibe un puntaje de salud, benchmarks de LATAM y un simulador para escalar sin perder.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {user ? (
                <button onClick={() => navTo("panel")} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px 24px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ir a mi panel</button>
              ) : (<>
              <button onClick={onStartTrial} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px 24px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Probar PRO gratis 3 días
              </button>
              <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "13px 24px", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Usar la versión gratis
              </button>
              </>)}
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: C.textMuted }}>
              <span><Ic n="✓" /> Sin tarjeta</span><span><Ic n="✓" /> Sin registro</span><span><Ic n="✓" /> 16 monedas de LATAM</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <HeroPreview />
          </motion.div>
        </div>
        <div style={{ maxWidth: 1100, margin: "44px auto 0", fontSize: 12, color: C.textMuted, lineHeight: 1.9 }}>
          Disponible en {CURRENCIES.map(c => c.code).join(", ")}.
        </div>
      </section>

      {/* CPA real */}
      <section style={{ padding: "8px 20px 72px" }}>
        <div className="hero-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 56, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.12 }}>Tu Ads Manager dice $4. Tu CPA real es $8,21.</h2>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.75, margin: "0 0 14px", maxWidth: 480 }}>En contraentrega no cuenta cada pedido que genera tu anuncio, sino los que se entregan. Si de 100 pedidos solo llegan 49, lo que gastaste en los 100 lo pagan esos 49.</p>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.75, margin: "0 0 24px", maxWidth: 480 }}>Nexus COD te dice tu CPA real y el CPA máximo que puedes pagar sin perder dinero, para que sepas cuándo escalar y cuándo apagar.</p>
            <button onClick={onOpenFree} style={{ background: C.text, border: "none", borderRadius: 10, padding: "12px 22px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Calcular mi CPA real</button>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, marginBottom: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 6 }}>Lo que ves en Ads Manager</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>{cpaEx.f(cpaEx.cpa)}</div>
              </div>
              <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>Tu CPA real</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: C.red }}>{cpaEx.f(cpaEx.r.cpaReal)}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 14, textAlign: "center" }}>
              {[[100, "Pedidos", C.accent], [75, "Confirmados", C.accent], [Math.round(cpaEx.r.ent), "Entregados", C.green], [Math.round(100 - cpaEx.r.ent), "Sin entregar", C.red]].map(([v, l, col]) => (
                <div key={l} style={{ background: C.surface, borderRadius: 10, padding: "10px 4px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>{cpaEx.f(400)} de publicidad entre {String(cpaEx.r.ent.toFixed(2)).replace(".", ",")} pedidos entregados.</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12, fontSize: 13 }}>
              <span style={{ color: C.textDim }}>CPA máximo para no perder</span><b>{cpaEx.f(cpaEx.r.cpaMax)}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Testear productos */}
      <section style={{ padding: "8px 20px 72px" }}>
        <div className="hero-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 56, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.12 }}>¿Quieres testear un producto y saber si es rentable?</h2>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.7, margin: "0 0 26px", maxWidth: 480 }}>
              Antes de gastar en publicidad, ponle números a tu idea. Ingresa lo que crees que va a costar y descubre si el producto deja ganancia o te va a dejar en pérdida.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {[
                ["Ingresa tus costos", "Costo del producto, precio de venta, costo de envío y el CPA que esperas pagar por pedido."],
                ["Ajusta tu realidad", "Cambia el porcentaje de confirmados y entregados según lo que te pasa en tus pedidos."],
                ["Mira tus números", "Ganancia por pedido, ROAS de equilibrio y cuánto pierdes en devoluciones, publicidad y envío."],
              ].map(([t, d], i) => (
                <div key={t} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: C.accentDim, color: C.accent, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{t}</div><div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{d}</div></div>
                </div>
              ))}
            </div>
            <button onClick={onOpenFree} style={{ background: C.text, border: "none", borderRadius: 10, padding: "13px 24px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Calcular mi producto</button>
          </div>
          <div aria-hidden="true" style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: 22, boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 16 }}>Test de producto</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 18 }}>
              {[["Costo del producto", "$8,00"], ["Precio de venta", "$35,99"], ["Costo de envío", "$5,00"], ["CPA por pedido", "$4,00"]].map(([l, v]) => (
                <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              {[["Ganancia por pedido", "$18,09", C.green], ["ROAS de equilibrio", "1,63x", C.amber], ["Pérdida por devoluciones", "−$183,75", C.red]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: C.textDim }}>{l}</span><span style={{ fontWeight: 700, fontSize: 16, color: c }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, background: `${C.green}14`, border: `1px solid ${C.green}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.green, fontWeight: 600 }}>Producto rentable con estos números</div>
            </div>
          </div>
        </div>
      </section>

      {/* Costos incluidos */}
      <section style={{ padding: "16px 20px 72px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
            <h2 style={{ fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1.15 }}>Cada costo que se come tu ganancia, ya incluido</h2>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.7, margin: 0 }}>Casi todos calculan solo precio menos costo del producto. Nexus COD descuenta todo lo que de verdad sale de tu bolsillo.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {[
              { i: "truck", t: "Costo de envío", d: "El flete de cada pedido entregado y el que pierdes cada vez que hay una devolución." },
              { i: "megaphone", t: "CPA de publicidad", d: "Lo que gastas por pedido generado, incluido lo invertido en pedidos que nunca se confirman o se devuelven." },
              { i: "undo", t: "Confirmaciones y devoluciones", d: "Cuántos pedidos se confirman, cuántos llegan de verdad y cuánto te cuesta cada devolución." },
              { i: "building", t: "Comisión de Dropi", d: "La comisión por cada pedido entregado, descontada de tu ganancia real." },
            ].map(x => (
              <div key={x.t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 18 }}><Ic n={x.i} size={19} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{x.t}</div>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.65 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Pro comparison */}
      <section id="precios" style={{ padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Elige tu nivel</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>Gratis para calcular. PRO para escalar y ganar más.</div>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Free */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "26px 22px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>Gratis</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>$0</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Para siempre</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Calcula si tu campaña es rentable. Rápido y simple.</div>
              {["Calculadora completa", "16 monedas LATAM", "Score de salud básico", "1 gráfico de pedidos", "Resultados principales"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textDim, marginBottom: 7 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}><Ic n="✓" /></span>{f}
                </div>
              ))}
              <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
              {["Benchmarks LATAM", "Simulador de escalado", "Pérdida Invisible", "Asesor IA", "Escenarios", "Comparador A/B", "PDF profesional", "Simulaciones guardadas"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textMuted, marginBottom: 6, opacity: 0.5 }}>
                  <span style={{ color: C.textMuted }}><Ic n="✗" /></span>{f}
                </div>
              ))}
              <button onClick={onOpenFree} style={{ width: "100%", marginTop: 16, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", color: C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            </div>

            {/* Pro */}
            <div style={{ background: C.card, border: `1px solid ${C.gold}60`, borderRadius: 14, padding: "26px 22px", position: "relative" }}>
              <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.gold, borderRadius: 99, padding: "3px 14px", fontSize: 10, color: C.bg, fontWeight: 800, whiteSpace: "nowrap" }}>Recomendado</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>PRO</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>$5.99</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>por mes · cancela cuando quieras</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Sistema operativo de dropshipping COD. Escala, optimiza y toma decisiones profesionales.</div>
              {[
                "Todo lo del plan gratis",
                "Salud y riesgo detallado",
                "Benchmarks LATAM reales",
                "Pérdida Invisible calculada",
                "Simulador de 3 escenarios",
                "Escalado proyectado",
                "Centro de optimización",
                "Comparador A/B de productos",
                "Consultor IA ilimitado",
                "Predictor de quiebre",
                "PDF profesional",
                "Simulaciones ilimitadas",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: i === 0 ? C.textDim : C.text, marginBottom: 7 }}>
                  <span style={{ color: C.gold, fontWeight: 700 }}><Ic n="✓" /></span>{f}
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                <button onClick={onStartTrial} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "12px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  <Ic n="🎁" /> Probar PRO gratis 3 días
                </button>
                <button onClick={onUpgrade} style={{ background: "transparent", border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "10px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Activar PRO — $5.99/mes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiénes somos */}
      <section id="nosotros" style={{ padding: "10px 20px 60px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Nació de perder dinero real.<br />
              <span style={{ color: C.gold }}>Se construyó para que tú no lo pierdas.</span>
            </div>
          </div>
          <div className="stack-m" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center", marginBottom: 44 }}>
            <div>
              <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, borderRadius: 14, padding: "20px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 7, letterSpacing: "0.06em" }}><Ic n="⚠" /> El momento que lo cambió todo</div>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: 0 }}>Era un martes por la noche. Tenía los números en la cabeza: 200 pedidos, precio $35, CPA $4. La matemática parecía perfecta. <strong style={{ color: C.text }}>Pero cuando llegó el dinero real, había perdido más de $600.</strong></p>
              </div>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, marginBottom: 12 }}>Lo que no había calculado: que solo el 72% iba a confirmar. Que el 63% iba a recibir el paquete. Que cada devolución costaba el CPA más el 60% del flete.</p>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>Esa noche construí la herramienta que ojalá hubiera tenido desde el primer día.</p>
            </div>
            <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 14 }}><Ic n="📊" /> Lo que aprendimos a las malas</div>
              {[
                { stat: "40%", desc: "de dropshippers en LATAM pierden dinero en su primera campaña sin saberlo" },
                { stat: "2–3x", desc: "es la diferencia entre el margen estimado y el real al incluir devoluciones" },
                { stat: "$800+", desc: "es el promedio que un dropshipper pierde antes de entender el COD real" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: i < 2 ? 14 : 0, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, flexShrink: 0, lineHeight: 1, minWidth: 56 }}>{item.stat}</div>
                  <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, minWidth: 0 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { initials: "DC", name: "Dereck C.", role: "Fundador · Dropshipper COD", desc: "5 años en e-commerce LATAM. Construyó esta herramienta después de perder dinero en campañas que parecían rentables.", color: C.accent },
              { initials: "EQ", name: "Equipo Ops", role: "Ecuador & Colombia", desc: "Gestión de más de 3.000 pedidos mensuales en contraentrega. Conocen cada detalle del modelo COD real.", color: C.green },
              { initials: "DS", name: "Data & Strategy", role: "Análisis de campañas", desc: "Benchmarks de tasas de entrega, CPA óptimo y márgenes reales del mercado LATAM.", color: C.purple },
            ].map((m, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: `${m.color}20`, border: `2px solid ${m.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: m.color, margin: "0 auto 10px" }}>{m.initials}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 3 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: m.color, fontWeight: 600, marginBottom: 7 }}>{m.role}</div>
                <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "10px 20px 60px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, color: C.text }}>Preguntas frecuentes</div>
          </div>
          {[
            { q: "¿Qué diferencia hay entre Gratis y PRO?", a: "Gratis te ayuda a calcular si una campaña es rentable. PRO te ayuda a escalar, optimizar y tomar decisiones profesionales con benchmarks LATAM, IA, escenarios, pérdida invisible, comparador de productos y más." },
            { q: "¿Cómo funciona el trial de 3 días?", a: "Tienes acceso completo a todas las funciones PRO durante 3 días sin pagar nada. Al terminar, vuelves automáticamente al plan gratis. No pedimos tarjeta de crédito." },
            { q: "¿Para qué países funciona?", a: "Para cualquier país de LATAM. Soporta 16 monedas: USD, COP, MXN, PEN, ARS, CLP, BRL, BOB, PYG, UYU, GTQ, DOP, CRC, HNL, NIO, VES." },
            { q: "¿Qué son los benchmarks LATAM?", a: "Rangos reales del mercado de dropshipping COD en Ecuador y Colombia: confirmación óptima, tasa de entrega, margen saludable y ROAS. Te dicen si tus métricas están por debajo o por encima del mercado real." },
            { q: "¿Qué es la 'Pérdida Invisible'?", a: "Es el dinero que podrías ganar si optimizas puntos clave. No es lo que pierdes — es lo que dejas de ganar por tener entrega baja, confirmación baja o CPA alto. Muy pocos dropshippers lo calculan." },
          ].map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "10px 20px 80px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", background: C.card, border: `1px solid ${C.gold}25`, borderRadius: 22, padding: "40px 24px" }}>
          <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: 10 }}>¿Tu campaña es rentable de verdad?</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 22, lineHeight: 1.7 }}>Descúbrelo en 30 segundos. Sin registro. Sin tarjeta.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 22px", color: C.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: C.gold, border: "none", borderRadius: 12, padding: "12px 22px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              <Ic n="⭐" /> Probar PRO gratis 3 días
            </motion.button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={24} />
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Nexus COD <span style={{ color: C.gold }}>Pro</span></div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
            <a href="#nosotros" style={{ color: C.textMuted, textDecoration: "none" }}>Quiénes somos</a>
            <a href="/terminos" onClick={e => { e.preventDefault(); openLegal("terms"); }} style={{ color: C.textMuted, textDecoration: "none" }}>Términos</a>
            <a href="/privacidad" onClick={e => { e.preventDefault(); openLegal("privacy"); }} style={{ color: C.textMuted, textDecoration: "none" }}>Privacidad</a>
            <a href="/reembolsos" onClick={e => { e.preventDefault(); openLegal("refund"); }} style={{ color: C.textMuted, textDecoration: "none" }}>Reembolsos</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.textMuted, textDecoration: "none" }}>Contacto</a>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>© 2026 Nexus COD Pro · LATAM</div>
        </div>
      </footer>
      <GlobalStyles />
    </div>
  );
}

// ─── FIREBASE & AUTH ─────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Firestore helpers
async function saveSimulationFS(userId, simulation) {
  const ref = collection(db, "users", userId, "simulations");
  await addDoc(ref, { ...simulation, createdAt: serverTimestamp() });
}
async function getSimulationsFS(userId) {
  const ref = collection(db, "users", userId, "simulations");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function deleteSimulationFS(userId, simId) {
  await deleteDoc(doc(db, "users", userId, "simulations", simId));
}

// Auth context
const AuthCtx = createContext(null);
// Paddle (pago dentro de la página). Estos valores se configuran en Vercel (variables VITE_PADDLE_*).
const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || "sandbox";
const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_TOKEN || "";
const PADDLE_PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID || "";
let paddleReady = null;
function loadPaddle(onEvent) {
  if (typeof window === "undefined" || !PADDLE_TOKEN) return Promise.resolve(null);
  window.__paddleOnEvent = onEvent;
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve) => {
    const init = () => {
      try {
        if (PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token: PADDLE_TOKEN, eventCallback: (e) => { if (window.__paddleOnEvent) window.__paddleOnEvent(e); } });
        resolve(window.Paddle);
      } catch { resolve(null); }
    };
    if (window.Paddle) return init();
    const sc = document.createElement("script");
    sc.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    sc.async = true;
    sc.onload = init;
    sc.onerror = () => { paddleReady = null; resolve(null); };
    document.head.appendChild(sc);
  });
  return paddleReady;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let unsubDoc = null;
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (fu) {
        // Mostrar la sesión de inmediato, sin esperar a Firestore
        setUser(fu);
        setLoadingAuth(false);
        try {
          const rc = localStorage.getItem("nx_ref");
          if (rc) refApi(fu, "claim", { code: rc }).catch(() => {}).finally(() => { try { localStorage.removeItem("nx_ref"); } catch {} });
        } catch {}
        const userRef = doc(db, "users", fu.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: fu.uid, email: fu.email,
              name: fu.displayName, photo: fu.photoURL,
              plan: "free", createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Firestore error (revisa las reglas):", err);
        }
        // Escucha el plan en tiempo real: cambia a PRO solo cuando el webhook de pago lo confirma
        unsubDoc = onSnapshot(userRef,
          (s) => {
            const d = s.data() || {};
            setIsPro(d.plan === "pro" && (d.lsStatus !== "bonus" || (!!d.proUntil && new Date(d.proUntil) > new Date()))); setPortalUrl(d.customerPortalUrl || ""); setProfile(d);
            if (d.prefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(d.prefs)); } catch {} }
          },
          (err) => { console.error(err); setIsPro(false); });
      } else {
        setUser(null); setIsPro(false); setPortalUrl(""); setProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => { unsub(); if (unsubDoc) unsubDoc(); };
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <AuthCtx.Provider value={{ user, loadingAuth, isPro, portalUrl, profile, loginWithGoogle, logout, saveSimulationFS, getSimulationsFS, deleteSimulationFS }}>
      {children}
    </AuthCtx.Provider>
  );
}
function useAuth() {
  return useContext(AuthCtx);
}

// ─── USER MENU ────────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, isPro, portalUrl, loginWithGoogle, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try { await loginWithGoogle(); } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (!user) return (
    <button onClick={handleLogin} disabled={loading}
      style={{ background: C.text, border: "none", borderRadius: 9, padding: "7px 16px", color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
      {loading ? "..." : <><span className="d-only"><Ic n="🔑" /> Iniciar sesión</span><span className="m-only">Entrar</span></>}
    </button>
  );

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 99, padding: "4px 12px 4px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
        <img src={user.photoURL} alt="" width={26} height={26} style={{ borderRadius: "50%", display: "block" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName?.split(" ")[0]}</span>
        {isPro && <span style={{ background: `${C.gold}20`, color: C.gold, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "1px 6px" }}>PRO</span>}
        <span style={{ color: C.textMuted, fontSize: 10 }}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px", minWidth: 180, zIndex: 200, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "8px 10px 10px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user.displayName}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{user.email}</div>
              <div style={{ marginTop: 4, fontSize: 10, color: isPro ? C.gold : C.textMuted, fontWeight: 600 }}>{isPro ? "Plan PRO" : "Plan Gratuito"}</div>
            </div>
            <button onClick={() => { setOpen(false); navTo("panel"); }}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              <Ic n="home" /> Ir al panel
            </button>
            <button onClick={() => { setOpen(false); openAccount(); }}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Ic n="user" /> Mi cuenta
            </button>
            <button onClick={() => { logout(); setOpen(false); }}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Ic n="🚪" /> Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SAVED CALCS (cálculos guardados por usuario) ─────────────────────────────
function SavedCalcs({ inputs, currency, R, limit, onLoad }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const LS = "cod_saved_calcs";
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };

  const refresh = async () => {
    if (user) {
      try { setList(await getSimulationsFS(user.uid)); }
      catch (e) { console.error(e); setList([]); setMsg("No se pudieron leer tus cálculos de la nube."); }
      return;
    }
    setList(readLocal());
  };
  useEffect(() => { refresh(); }, [user?.uid]);

  const save = async () => {
    if (list.length >= limit) { setMsg(`Llegaste al límite de ${limit} cálculos. Borra alguno para guardar más.`); return; }
    const sim = {
      name: name.trim() || `Cálculo ${new Date().toLocaleDateString("es-ES")}`,
      date: new Date().toLocaleDateString("es-ES"),
      currency: currency.code,
      inputs: { ...inputs },
      results: { gananciaNet: R.gananciaNet || 0, margen: R.margen || 0 },
    };
    setBusy(true); setMsg("");
    try {
      if (user) await saveSimulationFS(user.uid, sim);
      else localStorage.setItem(LS, JSON.stringify([{ id: String(Date.now()), ...sim }, ...readLocal()]));
      setName(""); setMsg("Cálculo guardado");
      await refresh();
    } catch (e) { console.error(e); setMsg("Error al guardar: " + (e.code || e.message)); }
    setBusy(false);
  };

  const remove = async (id) => {
    try {
      if (user) await deleteSimulationFS(user.uid, id);
      else localStorage.setItem(LS, JSON.stringify(readLocal().filter(s => s.id !== id)));
      await refresh();
    } catch (e) { console.error(e); setMsg("Error al borrar: " + (e.code || e.message)); }
  };

  return (
    <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}><Ic n="💾" /> Mis cálculos</div>
        <div style={{ fontSize: 10, color: C.textMuted }}>{list.length}/{limit}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} placeholder="Nombre (ej: Perfume X)"
          style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
        <button onClick={save} disabled={busy}
          style={{ background: C.green, border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: busy ? 0.6 : 1 }}>Guardar</button>
      </div>
      {!user && <div style={{ fontSize: 10, color: C.amber, marginTop: 6 }}>Inicia sesión para guardarlos en tu cuenta y verlos desde cualquier dispositivo. Ahora se guardan solo en este navegador.</div>}
      {msg && <div style={{ fontSize: 11, color: msg === "Cálculo guardado" ? C.green : C.amber, marginTop: 6 }}>{msg}</div>}
      <div style={{ maxHeight: 230, overflowY: "auto", marginTop: 8 }}>
        {list.length === 0 && <div style={{ fontSize: 11, color: C.textMuted, padding: "6px 2px" }}>Aún no tienes cálculos guardados.</div>}
        {list.map(s => (
          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontSize: 9, color: (s.results?.gananciaNet ?? 0) >= 0 ? C.green : C.red }}>
                {(s.results?.gananciaNet ?? 0) >= 0 ? "+" : "−"}{s.currency || "USD"} {Math.abs(Math.round(s.results?.gananciaNet ?? 0)).toLocaleString("es-ES")} · {fmtPct(s.results?.margen)} · {s.date}
              </div>
            </div>
            <button onClick={() => onLoad(s.inputs, s.currency)} title="Cargar" style={{ background: `${C.accent}15`, border: "none", borderRadius: 6, padding: "4px 8px", color: C.accent, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Abrir</button>
            <button onClick={() => remove(s.id)} title="Borrar" style={{ background: `${C.red}15`, border: "none", borderRadius: 6, padding: "4px 7px", color: C.red, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}><Ic n="🗑" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MARCO DE LA APP PRO (menú lateral + barra superior) ──────────────────────
function AppShell({ active, onHome, right, children }) {
  const { user, isPro } = useAuth();
  const items = [
    ...(user ? [{ id: "panel", label: "Panel", icon: "home", fn: () => navTo("panel") }] : []),
    { id: "calc", label: "Calculadora", icon: "calculator", fn: () => navTo("calc") },
    { id: "fin", label: "Control financiero", icon: "wallet", fn: () => navTo("finance") },
    { id: "ref", label: "Referidos", icon: "gift", fn: () => openAccount("referidos") },
    { id: "acct", label: "Mi cuenta", icon: "user", fn: () => openAccount("perfil") },
  ];
  const help = () => { window.location.href = `mailto:${SUPPORT_EMAIL}`; };
  const titles = { panel: "Panel", calc: "Calculadora", fin: "Control financiero", ref: "Referidos", acct: "Mi cuenta" };
  const brandGo = user ? () => navTo("panel") : onHome;
  const legalLink = { background: "none", border: "none", padding: 0, color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" };
  return (
    <div className="shell" style={{ fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: C.text }}>
      <aside className="shell-side">
        <Brand onClick={brandGo} size={30} pro={isPro} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(i => (
            <button key={i.id} className={"nav-item" + (active === i.id ? " on" : "")} onClick={i.fn}><Ic n={i.icon} size={17} /> {i.label}</button>
          ))}
          <button className="nav-item" onClick={help}><Ic n="message" size={17} /> Ayuda</button>
          {!isPro && <button className="nav-item" onClick={() => navTo("upgrade")} style={{ color: C.gold }}><Ic n="star" size={17} /> Activar PRO</button>}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
          <button className="nav-item" onClick={onHome} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Ver sitio</button>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={legalLink} onClick={() => openLegal("terms")}>Términos</button>
            <button style={legalLink} onClick={() => openLegal("privacy")}>Privacidad</button>
            <button style={legalLink} onClick={() => openLegal("refund")}>Reembolsos</button>
          </div>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="shell-top">
          <div className="shell-top-l"><Brand onClick={brandGo} size={26} pro={isPro} /></div>
          <div className="hide-mobile" style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>{titles[active] || "Calculadora"}</div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>{right}<UserMenu /></div>
        </div>
        <div className="shell-tabs-m">
          {[...items, { id: "help", label: "Ayuda", icon: "message", fn: help }].map(i => (
            <button key={i.id} onClick={i.fn} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: active === i.id ? C.cardHover : "transparent", border: `1px solid ${active === i.id ? C.borderBright : C.border}`, borderRadius: 99, color: active === i.id ? C.text : C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}><Ic n={i.icon} size={14} /> {i.label}</button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── PANEL DE INICIO ──────────────────────────────────────────────────────────
function Dashboard({ trialDaysLeft, onUpgrade }) {
  const { user, isPro, profile } = useAuth();
  const canPro = isPro || trialDaysLeft > 0;
  const name = ((user && user.displayName) || "").split(" ")[0];
  const st = profile && profile.lsStatus;
  const planNote = isPro ? (st === "bonus" ? "Tienes PRO por tus referidos." : "Tu plan PRO está activo.") : trialDaysLeft > 0 ? `Prueba gratis: te quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}.` : "Estás en el plan gratis. PRO cuesta $5.99 al mes.";
  const cards = [
    { i: "calculator", t: "Calculadora", d: canPro ? "Calcula tu ganancia real con envío, CPA, devoluciones y Dropi incluidos." : "Calcula tu ganancia real con todos los costos. Incluye tu CPA real y tu CPA máximo.", b: "Abrir calculadora", fn: () => navTo("calc") },
    { i: "target", t: "CPA real y desglose", d: canPro ? "Tu CPA real, los niveles de rentabilidad y qué pasa si cambia la entrega." : "Tu CPA real está en la calculadora. El desglose por niveles es PRO.", b: canPro ? "Ver desglose" : "Abrir calculadora", fn: () => { window.__nxCalcTab = "cpa"; navTo("calc"); } },
    { i: "wallet", t: "Control financiero", d: "Registra gastos y fondos de ads y mira tu capital mes a mes.", b: canPro ? "Abrir" : "Solo PRO", fn: () => navTo("finance"), lock: !canPro },
    { i: "gift", t: "Referidos", d: "Gana 15 días de PRO por cada amigo que se suscriba.", b: "Ver mi enlace", fn: () => openAccount("referidos") },
    { i: "card", t: "Suscripción", d: planNote, b: "Administrar", fn: () => openAccount("suscripcion") },
    { i: "message", t: "Ayuda", d: "¿Dudas o quieres pedir un reembolso? Escríbenos.", b: "Escribir", fn: () => { window.location.href = `mailto:${SUPPORT_EMAIL}`; } },
  ];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 16px 60px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>{name ? `Hola, ${name}` : "Hola"}</h1>
      <div style={{ fontSize: 14, color: C.textDim, marginBottom: 24 }}>¿Qué quieres hacer hoy?</div>
      {!isPro && (
        <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 14, padding: "16px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 2 }}>Pasa a PRO</div>
            <div style={{ fontSize: 13, color: C.textDim }}>Desglose de CPA, benchmarks, escenarios, asesor de IA y control financiero.</div>
          </div>
          <button onClick={onUpgrade} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "10px 18px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Activar PRO por $5.99</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {cards.map(c => (
          <div key={c.t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Ic n={c.i} size={19} /></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.t}</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 18, flex: 1 }}>{c.d}</div>
            <button onClick={c.lock ? onUpgrade : c.fn} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 16px", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{c.lock && <Ic n="lock" size={13} />}{c.b}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONTROL FINANCIERO (valor agregado PRO) ──────────────────────────────────
const FIN_CATS = ["Fondos Ads", "Suscripciones de negocio", "Cloaking / Herramientas", "Productos físicos", "Gastos operativos", "Retiros personales", "Otros"];
const FIN_COLORS = [C.accent, C.purple, C.cyan, C.amber, C.green, C.red, C.textMuted, "#EC4899", "#14B8A6"];
const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const monthKey = (d) => (d || "").slice(0, 7);
const monthLabel = (k) => { const [y, m] = (k || "").split("-"); return m ? `${MONTHS_ES[+m - 1]} ${y}` : k; };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const uid8 = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const sumBy = (arr) => arr.reduce((a, x) => a + (Number(x.amount) || 0), 0);
const FIN_LS = "cod_finance";

function useFinance() {
  const { user } = useAuth();
  const [data, setData] = useState({ expenses: [], funds: [], capital: {} });
  const [status, setStatus] = useState("loading");
  const loaded = useRef(false);
  const dirty = useRef(false);
  const latest = useRef(data); latest.current = data;
  const userRef = useRef(user); userRef.current = user;

  useEffect(() => {
    loaded.current = false; dirty.current = false; setStatus("loading");
    (async () => {
      let d = null, failed = false;
      try {
        if (user) { const s = await getDoc(doc(db, "users", user.uid, "finance", "data")); if (s.exists()) d = s.data(); }
        else d = JSON.parse(localStorage.getItem(FIN_LS) || "null");
      } catch (e) { console.error(e); failed = true; }
      setData({ expenses: [], funds: [], capital: {}, ...(d || {}) });
      loaded.current = true; setStatus(failed ? "error" : "saved");
    })();
  }, [user?.uid]);

  const persist = async () => {
    const u = userRef.current;
    try {
      if (u) { const { updatedAt, ...clean } = latest.current; await setDoc(doc(db, "users", u.uid, "finance", "data"), { ...clean, updatedAt: serverTimestamp() }); }
      else localStorage.setItem(FIN_LS, JSON.stringify(latest.current));
      dirty.current = false; setStatus("saved");
    } catch (e) { console.error(e); setStatus("error"); }
  };

  useEffect(() => {
    if (!loaded.current || !dirty.current) return;
    setStatus("saving");
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [data]);
  useEffect(() => () => { if (dirty.current) persist(); }, []);

  const update = (fn) => { dirty.current = true; setData(fn); };
  return { data, update, status, user };
}

function FinanceCenter({ onBackToCalc, onHome, onBackToFree }) {
  const { data, update, status, user } = useFinance();
  const { expenses, funds, capital } = data;
  const fmt = makeFmt("$");
  const curMonth = todayISO().slice(0, 7);
  const [section, setSection] = useState("resumen");
  const [month, setMonth] = useState(curMonth);
  const [catFilter, setCatFilter] = useState("all");

  const months = useMemo(() => {
    const s = new Set([...expenses.map(e => monthKey(e.date)), ...funds.map(f => monthKey(f.date)), ...Object.keys(capital), curMonth]);
    return [...s].filter(Boolean).sort();
  }, [expenses, funds, capital]);

  const stat = (k) => {
    const g = sumBy(expenses.filter(e => monthKey(e.date) === k));
    const f = sumBy(funds.filter(x => monthKey(x.date) === k));
    const c = Number(capital[k]) || 0;
    const total = c + f;
    return { g, f, c, total, saldo: total - g, pct: total > 0 ? (g / total) * 100 : 0 };
  };
  const cur = stat(month);
  const saldoRatio = cur.total > 0 ? cur.saldo / cur.total : 1;
  const saldoColor = cur.total <= 0 ? C.textDim : saldoRatio < 0.2 ? C.red : saldoRatio < 0.5 ? C.amber : C.green;

  const allCats = useMemo(() => [...new Set([...FIN_CATS, ...expenses.map(e => e.category).filter(Boolean)])], [expenses]);

  // forms
  const [ef, setEf] = useState({ concept: "", date: todayISO(), amount: "", category: FIN_CATS[0] });
  const [ff, setFf] = useState({ concept: "", date: todayISO(), amount: "", notes: "" });
  const addExpense = () => {
    const amount = parseFloat(ef.amount);
    if (!ef.concept.trim() || !ef.date || !(amount > 0)) return;
    update(d => ({ ...d, expenses: [{ id: uid8(), concept: ef.concept.trim(), date: ef.date, amount, category: ef.category.trim() || "Otros" }, ...d.expenses] }));
    setMonth(monthKey(ef.date));
    setEf({ ...ef, concept: "", amount: "" });
  };
  const addFund = () => {
    const amount = parseFloat(ff.amount);
    if (!ff.date || !(amount > 0)) return;
    update(d => ({ ...d, funds: [{ id: uid8(), concept: ff.concept.trim() || "Retiro Dropi", date: ff.date, amount, notes: ff.notes.trim() }, ...d.funds] }));
    setFf({ ...ff, concept: "", amount: "", notes: "" });
  };
  const delExpense = (id) => update(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  const delFund = (id) => update(d => ({ ...d, funds: d.funds.filter(f => f.id !== id) }));
  const setCapital = (k, v) => update(d => ({ ...d, capital: { ...d.capital, [k]: v === "" ? 0 : Number(v) } }));

  const needsSetup = status !== "loading" && !data.setupDone && Object.keys(capital).length === 0 && expenses.length === 0;
  const [setupAmt, setSetupAmt] = useState("");
  const [setupDate, setSetupDate] = useState(todayISO());
  const finishSetup = () => {
    const v = parseFloat(setupAmt);
    if (!(v >= 0) || setupAmt === "" || !setupDate) return;
    const k = monthKey(setupDate);
    update(d => ({ ...d, setupDone: true, capital: { ...d.capital, [k]: v } }));
    setMonth(k);
  };

  // styles
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", minWidth: 0, colorScheme: "dark" };
  const th = { textAlign: "left", fontSize: 10, color: C.textMuted, padding: "8px 8px", borderBottom: `2px solid ${C.accent}`, whiteSpace: "nowrap" };
  const td = { fontSize: 12, color: C.text, padding: "8px 8px", borderBottom: `1px solid ${C.border}` };
  const btn = (color) => ({ background: color, border: "none", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const kpi = (label, value, color, sub) => (
    <div style={{ ...card, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
  const MonthSelect = ({ all }) => (
    <select value={all ? catFilter : month} onChange={e => all ? setCatFilter(e.target.value) : setMonth(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
      {all && <option value="all">Todos los meses</option>}
      {[...months].reverse().map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
    </select>
  );
  const tooltipStyle = { contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }, labelStyle: { color: C.text }, itemStyle: { color: C.text } };

  const SECTIONS = [
    { id: "resumen", label: "📊 Resumen" },
    { id: "gastos", label: "🧾 Gastos" },
    { id: "categorias", label: "🗂 Por categoría" },
    { id: "historial", label: "📅 Historial" },
    { id: "fondos", label: "💸 Fondos Dropi" },
  ];

  // category aggregation
  const catList = catFilter === "all" ? expenses : expenses.filter(e => monthKey(e.date) === catFilter);
  const catData = Object.entries(catList.reduce((a, e) => { const c = e.category || "Otros"; a[c] = (a[c] || 0) + (Number(e.amount) || 0); return a; }, {}))
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const catTotal = catData.reduce((a, x) => a + x.value, 0);

  const monthExpenses = expenses.filter(e => monthKey(e.date) === month).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const monthFunds = funds.filter(f => monthKey(f.date) === month);
  const histData = months.map(k => ({ k, label: monthLabel(k), ...stat(k) }));

  const statusText = { loading: "Cargando…", saving: "Guardando…", saved: user ? "Guardado en tu cuenta" : "Guardado en este navegador", error: "Error al guardar" }[status];

  return (
    <AppShell active="fin" onHome={onHome} onCalc={onBackToCalc} onFinance={() => {}} onBackToFree={onBackToFree}
      right={<span className="hide-mobile" style={{ fontSize: 11, color: status === "error" ? C.red : C.textMuted }}>{statusText}</span>}>
      <GlobalStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 14px 50px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}><Ic n="💼" /> Control financiero</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Capital, gastos, fondos de Dropi y saldo de tu negocio, mes a mes.</div>
          {!user && <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>Inicia sesión para guardar tus finanzas en tu cuenta. Ahora se guardan solo en este navegador.</div>}
          <div className="show-mobile-only" style={{ fontSize: 10, color: status === "error" ? C.red : C.textMuted, marginTop: 6 }}>{statusText}</div>
        </div>

        {needsSetup && (
          <div style={{ ...card, maxWidth: 480, margin: "30px auto", textAlign: "center", border: `1px solid ${C.gold}40` }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}><Ic n="💰" /></div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Empecemos por tu capital</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 16 }}>¿Con cuánto dinero cuenta tu negocio hoy? Es tu punto de partida: a partir de ahí se calculan tus gastos, fondos de Dropi y saldo.</div>
            <div style={{ textAlign: "left", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Capital actual ($)</div>
            <input type="number" min={0} step="0.01" placeholder="Ej: 1500" value={setupAmt} onChange={e => setSetupAmt(e.target.value)} onKeyDown={e => e.key === "Enter" && finishSetup()} style={{ ...inp, width: "100%", fontSize: 18, fontWeight: 700, marginBottom: 12 }} />
            <div style={{ textAlign: "left", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Fecha desde la que empiezas a llevar el control</div>
            <input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 16 }} />
            <button onClick={finishSetup} style={{ ...btn(C.gold), width: "100%", color: C.bg, fontWeight: 800, fontSize: 13 }}>Guardar y empezar</button>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10 }}>Podrás cambiarlo cuando quieras en la pestaña “Gastos”.</div>
          </div>
        )}
        <div style={{ display: needsSetup ? "none" : "block" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ padding: "7px 12px", background: section === s.id ? `${C.accent}1F` : C.card, border: `1px solid ${section === s.id ? C.accent : C.border}`, borderRadius: 9, color: section === s.id ? C.text : C.textDim, fontSize: 11, fontWeight: section === s.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}><Rich>{s.label}</Rich></button>
          ))}
        </div>

        {/* RESUMEN */}
        {section === "resumen" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Mes:</div><MonthSelect />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {kpi("Capital total del mes", fmt(cur.total), C.gold, `Capital inicial ${fmt(cur.c)} + Fondos Dropi ${fmt(cur.f)} · edítalo en “Gastos”`)}
              {kpi("Total gastos", fmt(cur.g), C.red, monthLabel(month))}
              {kpi("Saldo restante", `${cur.saldo < 0 ? "−" : ""}${fmt(cur.saldo)}`, saldoColor, cur.total > 0 ? `${((cur.saldo / cur.total) * 100).toFixed(0)}% del capital disponible` : "Define tu capital inicial en Gastos")}
            </div>
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: C.textDim }}>Capital utilizado este mes</span>
                <span style={{ fontWeight: 800, color: saldoColor }}>{cur.pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, cur.pct)}%`, height: "100%", background: saldoColor, borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}><Ic n="⚠" /> Saldo en ROJO = menos del 20% del capital · AMARILLO = entre 20% y 50%</div>
            </div>
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="⚡" /> Gastos recientes — {monthLabel(month)}</div>
              {monthExpenses.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Aún no hay gastos este mes. Ve a la pestaña “Gastos” para agregar el primero.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                    <thead><tr><th style={th}>Descripción</th><th style={th}>Categoría</th><th style={th}>Fecha</th><th style={{ ...th, textAlign: "right" }}>Monto</th></tr></thead>
                    <tbody>{monthExpenses.slice(0, 6).map(e => (
                      <tr key={e.id}><td style={td}>{e.concept}</td><td style={{ ...td, color: C.textDim }}>{e.category}</td><td style={{ ...td, color: C.textDim }}>{e.date}</td><td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(e.amount)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GASTOS */}
        {section === "gastos" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Mes:</div><MonthSelect />
              <div style={{ fontSize: 12, color: C.textDim, marginLeft: "auto" }}>Capital inicial del mes:</div>
              <input type="number" min={0} step="0.01" value={capital[month] ?? ""} onChange={e => setCapital(month, e.target.value)} placeholder="0.00" style={{ ...inp, width: 110 }} />
            </div>
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="➕" /> Registrar gasto</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <input placeholder="Concepto (ej: Fondos TikTok Ads)" value={ef.concept} onChange={e => setEf({ ...ef, concept: e.target.value })} style={{ ...inp, gridColumn: "span 2" }} />
                <input type="date" value={ef.date} onChange={e => setEf({ ...ef, date: e.target.value })} style={inp} />
                <input type="number" min={0} step="0.01" placeholder="Monto" value={ef.amount} onChange={e => setEf({ ...ef, amount: e.target.value })} onKeyDown={e => e.key === "Enter" && addExpense()} style={inp} />
                <input list="fin-cats" placeholder="Categoría" value={ef.category} onChange={e => setEf({ ...ef, category: e.target.value })} style={inp} />
                <datalist id="fin-cats">{allCats.map(c => <option key={c} value={c} />)}</datalist>
                <button onClick={addExpense} style={btn(C.accent)}>Agregar</button>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Gastos de {monthLabel(month)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{fmt(cur.g)}</div>
              </div>
              {monthExpenses.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>No hay gastos registrados en este mes.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                    <thead><tr><th style={th}>#</th><th style={th}>Concepto</th><th style={th}>Fecha</th><th style={{ ...th, textAlign: "right" }}>Monto</th><th style={th}>Categoría</th><th style={th}></th></tr></thead>
                    <tbody>{monthExpenses.map((e, i) => (
                      <tr key={e.id}>
                        <td style={{ ...td, color: C.textMuted }}>{monthExpenses.length - i}</td><td style={td}>{e.concept}</td><td style={{ ...td, color: C.textDim }}>{e.date}</td>
                        <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(e.amount)}</td><td style={{ ...td, color: C.textDim }}>{e.category}</td>
                        <td style={td}><button onClick={() => delExpense(e.id)} title="Borrar" style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}><Ic n="🗑" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIAS */}
        {section === "categorias" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Ver:</div><MonthSelect all />
            </div>
            {catData.length === 0 ? <div style={{ ...card, fontSize: 12, color: C.textMuted }}>Aún no hay gastos para analizar.</div> : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...card, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                    <thead><tr><th style={th}>Categoría</th><th style={{ ...th, textAlign: "right" }}>Total gastado</th><th style={{ ...th, textAlign: "right" }}>% del total</th></tr></thead>
                    <tbody>
                      {catData.map((c, i) => (
                        <tr key={c.name}>
                          <td style={{ ...td, borderLeft: `3px solid ${FIN_COLORS[i % FIN_COLORS.length]}`, fontWeight: 600 }}>{c.name}</td>
                          <td style={{ ...td, textAlign: "right", color: FIN_COLORS[i % FIN_COLORS.length], fontWeight: 700 }}>{fmt(c.value)}</td>
                          <td style={{ ...td, textAlign: "right", color: C.textDim }}>{catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                      <tr><td style={{ ...td, fontWeight: 800 }}>TOTAL GENERAL</td><td style={{ ...td, textAlign: "right", fontWeight: 800, color: C.accent }}>{fmt(catTotal)}</td><td style={{ ...td, textAlign: "right" }}>100%</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Distribución de gastos por categoría</div>
                  <ResponsiveContainer width="100%" height={Math.max(220, catData.length * 42)}>
                    <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                      <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fill: C.textDim, fontSize: 10 }} />
                      <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>{catData.map((c, i) => <Cell key={c.name} fill={FIN_COLORS[i % FIN_COLORS.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {section === "historial" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr><th style={th}>Mes</th><th style={{ ...th, textAlign: "right" }}>Total gastado</th><th style={{ ...th, textAlign: "right" }}>Fondos Dropi</th><th style={{ ...th, textAlign: "right" }}>Capital</th><th style={{ ...th, textAlign: "right" }}>Saldo</th></tr></thead>
                <tbody>{histData.map(h => (
                  <tr key={h.k}>
                    <td style={{ ...td, fontWeight: 600 }}>{h.label}</td>
                    <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(h.g)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>{fmt(h.f)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.amber, fontWeight: 700 }}>{fmt(h.c)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.accent, fontWeight: 700 }}>{h.saldo < 0 ? "−" : ""}{fmt(h.saldo)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Gastos por mes</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={histData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.textDim, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="g" name="Total gastado" fill={C.red} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="f" name="Fondos Dropi" fill={C.green} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FONDOS DROPI */}
        {section === "fondos" && (
          <div>
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="➕" /> Registrar retiro de Dropi</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <input placeholder="Concepto (opcional)" value={ff.concept} onChange={e => setFf({ ...ff, concept: e.target.value })} style={inp} />
                <input type="date" value={ff.date} onChange={e => setFf({ ...ff, date: e.target.value })} style={inp} />
                <input type="number" min={0} step="0.01" placeholder="Monto retirado" value={ff.amount} onChange={e => setFf({ ...ff, amount: e.target.value })} style={inp} />
                <input placeholder="Notas" value={ff.notes} onChange={e => setFf({ ...ff, notes: e.target.value })} onKeyDown={e => e.key === "Enter" && addFund()} style={inp} />
                <button onClick={addFund} style={btn(C.green)}>Agregar</button>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Historial de fondos recuperados</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{fmt(sumBy(funds))}</div>
              </div>
              {funds.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Aún no registras retiros de Dropi.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                    <thead><tr><th style={{ ...th, borderBottomColor: C.green }}>Concepto</th><th style={{ ...th, borderBottomColor: C.green }}>Fecha</th><th style={{ ...th, borderBottomColor: C.green, textAlign: "right" }}>Monto retirado</th><th style={{ ...th, borderBottomColor: C.green }}>Notas</th><th style={{ ...th, borderBottomColor: C.green }}></th></tr></thead>
                    <tbody>{[...funds].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(f => (
                      <tr key={f.id}>
                        <td style={td}>{f.concept}</td><td style={{ ...td, color: C.textDim }}>{f.date}</td>
                        <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>{fmt(f.amount)}</td><td style={{ ...td, color: C.textDim }}>{f.notes}</td>
                        <td style={td}><button onClick={() => delFund(f.id)} title="Borrar" style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}><Ic n="🗑" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
// ─── MI CUENTA ────────────────────────────────────────────────────────────────
function fmtLongDate(d) {
  try { return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; }
}

// ─── REFERIDOS ─────────────────────────────────────────────────────
function ReferralPanel({ panel, btnMain, btnGhost, inp }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const load = () => refApi(user, "status").then(x => { setD(x); setErr(""); if (x.code) { try { localStorage.setItem("nx_my_ref", x.code); } catch {} } }).catch(() => setErr("No pudimos cargar tus referidos. Intenta de nuevo."));
  useEffect(() => { if (user) load(); }, [user && user.uid]);
  const link = d && d.code ? refUrlFor(d.code) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const redeem = async () => {
    setBusy(true); setErr(""); setOkMsg("");
    try { const r = await refApi(user, "redeem"); setOkMsg(`Listo, activamos ${r.days} días de PRO.`); await load(); }
    catch { setErr("No se pudieron activar los días. Intenta de nuevo."); }
    setBusy(false);
  };
  const tile = (v, l) => (<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div></div>);
  return (<>
    <div style={panel}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Gana 15 días de PRO por cada amigo que se suscriba</div>
      <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.65, marginBottom: 18 }}>Comparte tu enlace. Cuando tu amigo se suscribe y pasan sus 3 días de garantía, se guardan 15 días de PRO en tu cuenta. Puedes guardar hasta 30 días y activarlos cuando quieras.</div>
      {!d && !err && <div style={{ fontSize: 13, color: C.textMuted }}>Cargando…</div>}
      {err && <div style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{err}</div>}
      {d && (<>
        <label style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6, display: "block" }} htmlFor="reflink">Tu enlace personal</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input id="reflink" readOnly value={link} onFocus={e => e.target.select()} style={{ ...inp, flex: "1 1 240px", width: "auto" }} />
          <button onClick={copy} style={btnMain}>{copied ? "Copiado" : "Copiar enlace"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Calcula tu CPA real en contraentrega con Nexus COD: ${link}`)}`} target="_blank" rel="noreferrer" style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Compartir por WhatsApp</a>
        </div>
      </>)}
    </div>
    {d && (
      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
          {tile(d.registered, "Se registraron")}{tile(d.paid, "Se suscribieron")}{tile(`${d.bank} de ${d.cap}`, "Días guardados")}
        </div>
        {d.pending > 0 && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>{d.pending} {d.pending === 1 ? "referido está" : "referidos están"} en su periodo de garantía de 3 días. Te acreditamos al terminar.</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={redeem} disabled={!d.canRedeem || busy} style={{ ...btnMain, background: C.gold, opacity: d.canRedeem && !busy ? 1 : 0.4, cursor: d.canRedeem && !busy ? "pointer" : "not-allowed" }}>{busy ? "Activando…" : `Activar ${d.bank} días de PRO`}</button>
          {d.bank > 0 && d.blocked && <span style={{ fontSize: 12, color: C.amber }}>Disponible cuando termine tu suscripción actual.</span>}
          {okMsg && <span style={{ fontSize: 12, color: C.green }}>{okMsg}</span>}
        </div>
      </div>
    )}
  </>);
}

// ─── PÁGINAS LEGALES ───────────────────────────────────────────────
const LEGAL_UPDATED = "15 de noviembre de 2026";
const LEGAL = {
  terms: { title: "Términos y condiciones", sections: [
    ["1. Quiénes somos", ["Nexus COD es una herramienta en línea para calcular la rentabilidad de negocios de contraentrega (COD). Es operada desde Ecuador. Puedes escribirnos a " + SUPPORT_EMAIL + "."]],
    ["2. Aceptación", ["Al usar Nexus COD o crear una cuenta aceptas estos términos. Si no estás de acuerdo, no uses el servicio. Debes ser mayor de 18 años."]],
    ["3. El servicio", ["Nexus COD ofrece una calculadora gratuita y un plan de pago llamado PRO con funciones adicionales (análisis, benchmarks, escenarios, asesor de IA, control financiero y otras).", "Los resultados son estimaciones basadas en los datos que tú ingresas y en supuestos generales, como la comisión de Dropi y el costo de envío de devoluciones. No son asesoría financiera, contable ni legal. Las decisiones que tomes con ellos son tu responsabilidad."]],
    ["4. Tu cuenta", ["Para guardar cálculos y activar PRO inicias sesión con Google. Eres responsable de la actividad de tu cuenta. Puedes eliminarla cuando quieras desde Mi cuenta."]],
    ["5. Suscripción PRO y pagos", ["PRO cuesta $5.99 USD al mes y se renueva automáticamente hasta que lo canceles. Incluye una prueba gratis de 3 días.", "Los pagos los procesa Paddle, que actúa como vendedor autorizado (merchant of record) y se encarga del cobro, los impuestos aplicables y las facturas. En tu estado de cuenta verás el cargo a nombre de Paddle.", "Puedes cancelar en cualquier momento desde Mi cuenta. Conservas PRO hasta el final del periodo ya pagado y no se te cobra de nuevo.", "Podemos cambiar el precio con aviso previo. El cambio aplica a partir de tu siguiente renovación."]],
    ["6. Reembolsos", ["Ofrecemos garantía de reembolso de 3 días en tu primer pago. Los detalles están en la política de reembolsos."]],
    ["7. Programa de referidos", ["Si invitas a alguien con tu enlace y se suscribe, recibes 15 días de PRO una vez pasados los 3 días de garantía de su primer pago. Puedes guardar hasta 30 días y activarlos cuando no tengas una suscripción activa. Los días no tienen valor en dinero, no se transfieren y se anulan si el pago del referido se reembolsa. Podemos cancelar premios por abuso, como referirte a ti mismo o crear cuentas falsas."]],
    ["8. Uso aceptable", ["No puedes usar el servicio para fines ilegales, intentar acceder a cuentas ajenas, extraer datos de forma masiva, vulnerar la seguridad ni revender el servicio sin autorización."]],
    ["9. Propiedad intelectual", ["Nexus COD, su diseño y su código son nuestros. Tus datos siguen siendo tuyos: nos das permiso solo para almacenarlos y mostrarlos dentro del servicio."]],
    ["10. Disponibilidad y límite de responsabilidad", ["Nos esforzamos por mantener el servicio disponible, pero no garantizamos que funcione sin interrupciones ni errores. En la medida permitida por la ley, no somos responsables por pérdidas indirectas ni por decisiones de negocio tomadas con base en los resultados, y nuestra responsabilidad total se limita a lo que hayas pagado en los últimos 3 meses."]],
    ["11. Cambios", ["Podemos actualizar estos términos. Si el cambio es importante te avisaremos en la aplicación. Seguir usando el servicio significa que aceptas la versión nueva."]],
    ["12. Ley aplicable", ["Estos términos se rigen por las leyes de Ecuador. Para cualquier reclamo, escríbenos primero a " + SUPPORT_EMAIL + " y buscaremos resolverlo."]],
  ]},
  privacy: { title: "Política de privacidad", sections: [
    ["1. Qué datos recogemos", ["Cuenta: nombre, correo y foto de tu cuenta de Google cuando inicias sesión.", "Contenido que guardas: tus cálculos, tu control financiero, tus preferencias y el nombre de tu negocio.", "Suscripción: estado de tu plan y fechas de cobro. No vemos ni guardamos el número de tu tarjeta; el pago lo maneja Paddle.", "Referidos: tu código y el código de quien te invitó, si entraste por un enlace.", "En tu navegador guardamos preferencias y cálculos de la versión gratis (almacenamiento local)."]],
    ["2. Para qué los usamos", ["Para darte el servicio, guardar tu trabajo, activar tu plan PRO, gestionar referidos y atenderte cuando nos escribes. No vendemos tus datos ni los usamos para publicidad de terceros."]],
    ["3. Con quién los compartimos", ["Google (Firebase) para inicio de sesión y almacenamiento. Paddle para pagos y facturación. Vercel para alojar la aplicación. Google Fonts para cargar la tipografía. Cada uno trata los datos según su propia política. Los datos de pago se rigen por la política de privacidad de Paddle (paddle.com)."]],
    ["4. Cuánto tiempo los guardamos", ["Mientras tengas la cuenta. Si la eliminas, borramos tu perfil, tus cálculos y tu control financiero. Paddle puede conservar registros de facturación el tiempo que la ley le exija."]],
    ["5. Tus derechos", ["Puedes acceder a tus datos, corregirlos, descargarlos y eliminarlos. Todo esto lo haces tú mismo en Mi cuenta (pestañas Perfil y Datos y privacidad). Si necesitas algo más, escríbenos a " + SUPPORT_EMAIL + ". Respetamos los derechos que reconoce la Ley Orgánica de Protección de Datos Personales de Ecuador."]],
    ["6. Seguridad", ["Usamos conexiones cifradas y reglas de acceso para que cada persona solo vea sus propios datos. Ningún sistema es 100% seguro, pero trabajamos para proteger tu información."]],
    ["7. Menores", ["El servicio es para mayores de 18 años. No recogemos datos de menores a sabiendas."]],
    ["8. Cambios y contacto", ["Si cambiamos esta política, actualizaremos la fecha de esta página. Dudas: " + SUPPORT_EMAIL + "."]],
  ]},
  refund: { title: "Política de reembolsos", sections: [
    ["1. Garantía de 3 días", ["Si PRO no es para ti, puedes pedir el reembolso completo de tu primer pago dentro de los 3 días siguientes al cobro."]],
    ["2. Qué cubre", ["Solo el primer pago de la suscripción. Las renovaciones mensuales no se reembolsan, pero puedes cancelar cuando quieras para que no se cobren más. Si usas la prueba gratis de 3 días y cancelas antes de que termine, no se te cobra nada."]],
    ["3. Cómo pedirlo", ["Escribe a " + SUPPORT_EMAIL + " desde el correo de tu cuenta, o usa el enlace Solicitar reembolso en Mi cuenta > Suscripción. Revisamos la solicitud en un máximo de 2 días hábiles."]],
    ["4. Cómo se paga", ["El reembolso lo procesa Paddle al mismo método de pago que usaste. Según tu banco, puede tardar entre 5 y 10 días hábiles en verse reflejado."]],
    ["5. Qué pasa con tu cuenta", ["Al reembolsarse, tu suscripción se cancela y tu cuenta vuelve al plan gratuito. Conservas tus cálculos guardados, hasta el límite del plan gratis."]],
    ["6. Referidos", ["Si el pago de un referido se reembolsa dentro de los 3 días, los días de PRO que habrían correspondido al referente no se acreditan."]],
  ]},
};
function LegalView({ kind, onHome }) {
  const doc = LEGAL[kind] || LEGAL.terms;
  const tabs = [["terms", "Términos"], ["privacy", "Privacidad"], ["refund", "Reembolsos"]];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif" }}>
      <GlobalStyles />
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand onClick={onHome} size={28} />
          <button onClick={onHome} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 9, padding: "7px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al inicio</button>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          {tabs.map(([k, l]) => (
            <a key={k} href={LEGAL_PATHS[k]} onClick={e => { e.preventDefault(); openLegal(k); }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none", color: kind === k ? C.bg : C.textDim, background: kind === k ? C.text : C.card, border: `1px solid ${kind === k ? C.text : C.border}` }}>{l}</a>
          ))}
        </div>
        <h1 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 6px" }}>{doc.title}</h1>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 28 }}>Última actualización: {LEGAL_UPDATED}</div>
        {doc.sections.map(([h, ps]) => (
          <div key={h} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{h}</h2>
            {ps.map((t, i) => <p key={i} style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, margin: "0 0 10px" }}>{t}</p>)}
          </div>
        ))}
        <div style={{ marginTop: 36, paddingTop: 18, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>Nexus COD · Ecuador · <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.textDim }}>{SUPPORT_EMAIL}</a></div>
      </div>
    </div>
  );
}

function AccountView({ trialDaysLeft, onUpgrade, onHome, onCalc, onFinance, onBackToFree }) {
  const { user, isPro, profile, portalUrl, loginWithGoogle, logout } = useAuth();
  const [tab, setTab] = useState(() => window.__nxAcctTab || "perfil");
  useEffect(() => { const h = () => { if (window.__nxAcctTab) setTab(window.__nxAcctTab); }; window.addEventListener(ACCOUNT_EVT, h); return () => window.removeEventListener(ACCOUNT_EVT, h); }, []);
  const [business, setBusiness] = useState("");
  const [bizMsg, setBizMsg] = useState("");
  const [prefs, setPrefs] = useState(() => ({ currency: "USD", envio: 5, pctConfirmados: 75, pctEntregados: 65, recupera: true, ...readPrefs() }));
  const [prefMsg, setPrefMsg] = useState("");
  const [usage, setUsage] = useState({ calcs: null, expenses: null });
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const limit = isPro ? 50 : 5;

  useEffect(() => { if (profile && profile.businessName != null) setBusiness(profile.businessName); }, [profile && profile.businessName]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      let calcs = null, expenses = null;
      try { calcs = (await getSimulationsFS(user.uid)).length; } catch {}
      try { const f = await getDoc(doc(db, "users", user.uid, "finance", "data")); expenses = f.exists() ? (f.data().expenses || []).length : 0; } catch {}
      setUsage({ calcs, expenses });
    })();
  }, [user && user.uid]);

  const st = (profile && profile.lsStatus) || "";
  const toDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
  const until = toDate(profile && profile.proUntil);
  const nextBill = toDate(profile && profile.nextBillAt) || until;
  const cancelAt = toDate(profile && profile.cancelAt);
  const willCancel = isPro && (st === "canceled" || !!cancelAt);
  const endDate = cancelAt || until;
  let plan = { name: "Plan gratuito", chip: "Gratis", tone: C.textDim, note: "Estás usando la versión gratis de Nexus COD." };
  if (isPro) {
    plan = st === "bonus" ? { name: "Plan PRO", chip: "Bonus de referidos", tone: C.gold, note: until ? `Tienes PRO gratis hasta el ${fmtLongDate(until)}.` : "Tienes PRO gratis por tus referidos." }
      : willCancel ? { name: "Plan PRO", chip: "Cancelada", tone: C.amber, note: endDate ? `Conservas PRO hasta el ${fmtLongDate(endDate)}. Después no se te cobrará más.` : "Tu suscripción está cancelada." }
      : st === "past_due" ? { name: "Plan PRO", chip: "Pago pendiente", tone: C.red, note: "No pudimos cobrar tu último pago. Actualiza tu método de pago para no perder PRO." }
      : st === "trialing" ? { name: "Plan PRO", chip: "En prueba", tone: C.green, note: nextBill ? `Tu primer cobro de $5.99 será el ${fmtLongDate(nextBill)}.` : "Estás en tu prueba gratis." }
      : { name: "Plan PRO", chip: "Activa", tone: C.green, note: nextBill ? `Próximo cobro de $5.99 el ${fmtLongDate(nextBill)}.` : "Tu suscripción está activa." };
  } else if (trialDaysLeft > 0) {
    plan = { name: "Prueba gratis de PRO", chip: "En prueba", tone: C.gold, note: `Te quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"} de PRO sin costo.` };
  }

  const saveBusiness = async () => {
    try { await setDoc(doc(db, "users", user.uid), { businessName: business.trim() }, { merge: true }); setBizMsg("Guardado"); }
    catch { setBizMsg("No se pudo guardar"); }
    setTimeout(() => setBizMsg(""), 2500);
  };
  const clampN = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
  const savePrefs = async () => {
    const p = { currency: prefs.currency, envio: Math.max(0, Number(prefs.envio) || 0), pctConfirmados: clampN(prefs.pctConfirmados, 0, 100), pctEntregados: clampN(prefs.pctEntregados, 0, 100), recupera: !!prefs.recupera };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
    if (user) { try { await setDoc(doc(db, "users", user.uid), { prefs: p }, { merge: true }); } catch (e) { console.error(e); } }
    setPrefs(p); setPrefMsg("Preferencias guardadas. Se aplican la próxima vez que abras la calculadora.");
    setTimeout(() => setPrefMsg(""), 4000);
  };
  const exportData = async () => {
    setBusy("export"); setErr("");
    try {
      const sims = await getSimulationsFS(user.uid).catch(() => []);
      const fin = await getDoc(doc(db, "users", user.uid, "finance", "data")).then(x => x.exists() ? x.data() : null).catch(() => null);
      const clean = (o) => JSON.parse(JSON.stringify(o || {}, (k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
      const out = { exportado: new Date().toISOString(), cuenta: { correo: user.email, nombre: user.displayName, negocio: profile && profile.businessName || "", preferencias: readPrefs() }, calculos_guardados: clean(sims), control_financiero: clean(fin) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "nexus-cod-mis-datos.json"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); setErr("No se pudieron exportar tus datos. Intenta de nuevo."); }
    setBusy("");
  };
  const deleteAccount = async () => {
    setBusy("delete"); setErr("");
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 409) { setErr("Primero cancela tu suscripción PRO. Después podrás eliminar la cuenta."); setBusy(""); return; }
      if (!r.ok) throw new Error("fail");
      ["cod_prefs", "cod_saved_calcs", "cod_finance", "cod_trial_start"].forEach(k => { try { localStorage.removeItem(k); } catch {} });
      try { await logout(); } catch {}
      window.location.href = "/";
    } catch (e) { console.error(e); setErr("No se pudo eliminar la cuenta. Intenta de nuevo o escríbenos."); setBusy(""); }
  };

  const panel = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 16 };
  const inp = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6, display: "block" };
  const btnMain = { background: C.text, border: "none", borderRadius: 10, padding: "10px 18px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "10px 18px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-block" };
  const tabs = [{ id: "perfil", l: "Perfil", i: "user" }, { id: "suscripcion", l: "Suscripción", i: "card" }, { id: "referidos", l: "Referidos", i: "gift" }, { id: "preferencias", l: "Preferencias", i: "sliders" }, { id: "datos", l: "Datos y privacidad", i: "lock" }];
  const created = (profile && profile.createdAt && profile.createdAt.toDate && profile.createdAt.toDate()) || (user && user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : null);
  const canDelete = !(isPro && !willCancel && st !== "bonus");

  return (
    <AppShell active={tab === "referidos" ? "ref" : "acct"} onHome={onHome}>
      <GlobalStyles />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Mi cuenta</h1>
        {!user ? (
          <div style={{ ...panel, textAlign: "center", padding: 36 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Inicia sesión para ver tu cuenta</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>Aquí verás tu perfil, tu suscripción y tus preferencias.</div>
            <button onClick={() => loginWithGoogle().catch(() => {})} style={btnMain}>Iniciar sesión con Google</button>
          </div>
        ) : (<>
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 22, overflowX: "auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? C.text : "transparent"}`, padding: "10px 14px", color: tab === t.id ? C.text : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", marginBottom: -1 }}><Ic n={t.i} size={15} /> {t.l}</button>
            ))}
          </div>

          {tab === "perfil" && (<>
            <div style={panel}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
                {user.photoURL ? <img src={user.photoURL} alt="" width={64} height={64} style={{ borderRadius: "50%", display: "block" }} /> : <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cardHover }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{user.displayName}</div>
                  <div style={{ fontSize: 13, color: C.textDim, overflowWrap: "anywhere" }}>{user.email}</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: isPro ? C.bg : C.textDim, background: isPro ? C.gold : "transparent", border: isPro ? "none" : `1px solid ${C.borderBright}`, borderRadius: 99, padding: "4px 12px" }}>{isPro ? "PRO" : "Gratis"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
                <div><span style={lbl}>Correo</span><div style={{ ...inp, color: C.textDim, overflowWrap: "anywhere" }}>{user.email}</div></div>
                <div><span style={lbl}>Miembro desde</span><div style={{ ...inp, color: C.textDim }}>{created ? fmtLongDate(created) : "—"}</div></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={lbl} htmlFor="biz">Nombre de tu negocio o tienda (opcional)</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input id="biz" value={business} onChange={e => setBusiness(e.target.value)} placeholder="Ej: Decán Parfums" style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
                  <button onClick={saveBusiness} style={btnMain}>Guardar</button>
                </div>
                {bizMsg && <div style={{ fontSize: 12, color: bizMsg === "Guardado" ? C.green : C.red, marginTop: 8 }}>{bizMsg}</div>}
              </div>
            </div>
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Tu uso</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Cálculos guardados</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{usage.calcs == null ? "—" : usage.calcs} <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>de {limit}</span></div>
                </div>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Gastos registrados</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{usage.expenses == null ? "—" : usage.expenses}</div>
                </div>
              </div>
            </div>
            <button onClick={() => logout().then(onHome)} style={{ ...btnGhost, color: C.red }}><Ic n="logout" /> Cerrar sesión</button>
          </>)}

          {tab === "suscripcion" && (<>
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: plan.tone, background: `${plan.tone}1A`, border: `1px solid ${plan.tone}40`, borderRadius: 99, padding: "4px 12px" }}>{plan.chip}</span>
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 20 }}>{plan.note}</div>
              {isPro && st !== "bonus" ? (<>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 22 }}>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>Precio</div><div style={{ fontWeight: 700 }}>$5.99 al mes</div></div>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>{willCancel ? "Acceso hasta" : "Próximo cobro"}</div><div style={{ fontWeight: 700 }}>{(willCancel ? endDate : nextBill) ? fmtLongDate(willCancel ? endDate : nextBill) : "—"}</div></div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {profile && profile.updatePaymentUrl && <a href={profile.updatePaymentUrl} target="_blank" rel="noreferrer" style={btnGhost}>Actualizar método de pago</a>}
                  {!willCancel && portalUrl && <a href={portalUrl} target="_blank" rel="noreferrer" style={{ ...btnGhost, color: C.red }}>Cancelar suscripción</a>}
                  {willCancel && <button onClick={onUpgrade} style={{ ...btnMain, background: C.gold }}>Reactivar PRO</button>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 18, lineHeight: 1.6 }}>Los pagos los procesa Paddle, nuestro vendedor oficial. En tu estado de cuenta verás el cobro a nombre de Paddle.</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>Tienes 3 días de garantía desde tu primer pago. <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Solicitud de reembolso - Nexus COD")}&body=${encodeURIComponent(`Hola, quiero solicitar el reembolso de mi primer pago.\n\nCorreo de mi cuenta: ${user.email}`)}`} style={{ color: C.text, fontWeight: 600 }}>Solicitar reembolso</a> · <a href="/reembolsos" onClick={e => { e.preventDefault(); openLegal("refund"); }} style={{ color: C.textDim }}>Ver política</a></div>
              </>) : (<>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                  {["Salud de campaña y riesgo", "Benchmarks de LATAM y pérdida invisible", "Escenarios y comparador A/B", "Asesor IA y reporte en PDF", "Control financiero completo"].map(f => (
                    <div key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: C.textDim }}><span style={{ color: C.green }}><Ic n="✓" /></span>{f}</div>
                  ))}
                </div>
                <button onClick={onUpgrade} style={{ ...btnMain, background: C.gold }}>Activar PRO por $5.99 al mes</button>
              </>)}
            </div>
          </>)}

          {tab === "referidos" && <ReferralPanel panel={panel} btnMain={btnMain} btnGhost={btnGhost} inp={inp} />}

          {tab === "preferencias" && (
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Valores por defecto de la calculadora</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20, lineHeight: 1.6 }}>Guarda lo que usas siempre para no escribirlo cada vez.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
                <div><label style={lbl} htmlFor="pcur">Moneda</label>
                  <select id="pcur" value={prefs.currency} onChange={e => setPrefs({ ...prefs, currency: e.target.value })} style={inp}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
                <div><label style={lbl} htmlFor="penv">Costo de envío habitual</label>
                  <input id="penv" type="number" min="0" step="0.01" value={prefs.envio} onChange={e => setPrefs({ ...prefs, envio: e.target.value })} style={inp} /></div>
                <div><label style={lbl} htmlFor="pcon">Confirmados habituales (%)</label>
                  <input id="pcon" type="number" min="0" max="100" value={prefs.pctConfirmados} onChange={e => setPrefs({ ...prefs, pctConfirmados: e.target.value })} style={inp} /></div>
                <div><label style={lbl} htmlFor="pent">Entregados habituales (%)</label>
                  <input id="pent" type="number" min="0" max="100" value={prefs.pctEntregados} onChange={e => setPrefs({ ...prefs, pctEntregados: e.target.value })} style={inp} /></div>
              </div>
              <div style={{ marginTop: 18 }}>
                <span style={lbl}>¿Recuperas el producto en las devoluciones?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[[true, "Sí recupero"], [false, "No recupero"]].map(([v, l]) => (
                    <button key={l} onClick={() => setPrefs({ ...prefs, recupera: v })} style={{ ...btnGhost, padding: "9px 16px", background: prefs.recupera === v ? C.cardHover : "transparent", borderColor: prefs.recupera === v ? C.accent : C.borderBright }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button onClick={savePrefs} style={btnMain}>Guardar preferencias</button>
                {prefMsg && <span style={{ fontSize: 12, color: C.green }}>{prefMsg}</span>}
              </div>
            </div>
          )}

          {tab === "datos" && (<>
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Exportar mis datos</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Descarga un archivo con tu perfil, tus cálculos guardados y tu control financiero.</div>
              <button onClick={exportData} disabled={busy === "export"} style={{ ...btnGhost, opacity: busy === "export" ? 0.6 : 1 }}><Ic n="download" /> {busy === "export" ? "Preparando..." : "Descargar mis datos"}</button>
            </div>
            <div style={{ ...panel, borderColor: `${C.red}40` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: C.red }}>Eliminar mi cuenta</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Se borran tu perfil, tus cálculos guardados y tu control financiero. Esta acción no se puede deshacer.</div>
              {!canDelete ? (
                <div style={{ fontSize: 13, color: C.amber, lineHeight: 1.6 }}>Tienes una suscripción PRO activa. Cancélala primero en la pestaña Suscripción y después podrás eliminar tu cuenta.</div>
              ) : (<>
                <label style={lbl} htmlFor="delc">Escribe ELIMINAR para confirmar</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input id="delc" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ ...inp, flex: "1 1 200px", width: "auto" }} />
                  <button onClick={deleteAccount} disabled={confirm !== "ELIMINAR" || busy === "delete"} style={{ ...btnMain, background: C.red, color: "#fff", opacity: confirm === "ELIMINAR" && busy !== "delete" ? 1 : 0.4, cursor: confirm === "ELIMINAR" ? "pointer" : "not-allowed" }}>{busy === "delete" ? "Eliminando..." : "Eliminar cuenta"}</button>
                </div>
              </>)}
              {err && <div style={{ fontSize: 12, color: C.red, marginTop: 12 }}>{err}</div>}
            </div>
          </>)}

          <div style={{ marginTop: 8, fontSize: 13, color: C.textDim }}>¿Necesitas ayuda? <a href={SUPPORT_URL || `mailto:${SUPPORT_EMAIL}`} target="_blank" rel="noreferrer" style={{ color: C.text, fontWeight: 600 }}>Escríbenos</a></div>
        </>)}
      </div>
    </AppShell>
  );
}

function Paywall({ onUpgrade, onStartTrial, onHome, trialAvailable, message, justPaid }) {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalStyles />
      <div style={{ maxWidth: 440, width: "100%", background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{justPaid ? "Activando tu plan PRO" : "PRO es para suscriptores"}</div>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 18 }}>
          {justPaid
            ? "Recibimos tu pago. Tu cuenta se activa en unos segundos; esta pantalla cambia sola."
            : "Salud y riesgo, benchmarks, pérdida invisible, escenarios, comparador A/B, asesor IA, PDF y Control financiero."}
        </div>
        {!justPaid && <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 4 }}>$5.99<span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}> / mes</span></div>}
        {!justPaid && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 18 }}>Cancelas cuando quieras. {user ? `Cuenta: ${user.email}` : "Te pediremos iniciar sesión con Google."}</div>}
        {message && <div style={{ fontSize: 12, color: C.amber, marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}
        {!justPaid && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={onUpgrade} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px", color: C.bg, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Activar PRO — $5.99/mes</button>
            {trialAvailable && <button onClick={onStartTrial} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Probar 3 días gratis</button>}
          </div>
        )}
        <button onClick={onHome} style={{ marginTop: 14, background: "transparent", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Volver al inicio</button>
      </div>
    </div>
  );
}

function CheckoutView({ onBack, onDone }) {
  const { user, isPro } = useAuth();
  const [state, setState] = useState("loading");
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    let alive = true;
    loadPaddle((e) => { if (e && e.name === "checkout.completed" && alive) setPaid(true); }).then((P) => {
      if (!alive) return;
      if (!P || !PADDLE_PRICE_ID) { setState("error"); return; }
      try {
        P.Checkout.open({
          settings: { displayMode: "inline", frameTarget: "paddle-checkout", frameInitialHeight: 450, frameStyle: "width:100%; min-width:280px; background-color:transparent; border:none;", theme: "dark", locale: "es", variant: "one-page", showAddDiscounts: false, showAddTaxId: false },
          items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
          customer: user && user.email ? { email: user.email } : undefined,
          customData: { user_id: user ? user.uid : "" },
        });
        setState("ready");
      } catch { setState("error"); }
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (isPro) onDone(); }, [isPro]);

  const feats = ["Salud y riesgo de cada producto", "Benchmarks y pérdida invisible", "Escenarios y comparador A/B", "Asesor IA y reporte en PDF", "Control financiero completo"];
  const steps = [
    { t: "Hoy", d: "Empiezas 3 días gratis. No se cobra nada.", c: C.green },
    { t: "Día 4", d: "Se cobra $5.99 al mes.", c: C.gold },
    { t: "Siempre", d: "Cancelas cuando quieras, en un clic.", c: C.accent },
  ];
  const wrap = { minHeight: "100vh", background: C.bg, fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: C.text };
  return (
    <div style={wrap}>
      <GlobalStyles />
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>← Volver</button>
          <div style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Ic n="🔒" /> Pago seguro</div>
        </div>
      </div>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 56px" }}>
        {paid ? (
          <div style={{ maxWidth: 440, margin: "60px auto", background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Activando tu plan PRO</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Recibimos tu pago. Esta pantalla cambia sola en unos segundos.</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Activa tu plan PRO</h1>
            <p style={{ fontSize: 14, color: C.textDim, margin: "0 0 26px" }}>Prueba gratis 3 días. Sin compromiso.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Nexus COD PRO</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>$5.99<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>/mes</span></div>
                  </div>
                  {user && user.email && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, overflowWrap: "anywhere" }}>{user.email}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                    {feats.map(f => (
                      <div key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: C.textDim, lineHeight: 1.4 }}>
                        <span style={{ color: C.green, fontWeight: 800 }}><Ic n="✓" /></span><span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Cómo funciona</div>
                  {steps.map((st, i) => (
                    <div key={st.t} style={{ display: "flex", gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.c, marginTop: 6, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>{st.t}</div><div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{st.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: "8px 18px 18px", minHeight: 240 }}>
                  {state === "loading" && <div style={{ fontSize: 13, color: C.textMuted, padding: 16 }}>Cargando pago seguro…</div>}
                  {state === "error" && <div style={{ fontSize: 13, color: C.amber, padding: 16, lineHeight: 1.6 }}>No pudimos cargar el pago. Revisa tu conexión e intenta de nuevo.</div>}
                  <div className="paddle-checkout" />
                </div>
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 18px", marginTop: 14, fontSize: 11, color: C.textMuted }}>
                  <span><Ic n="🔒" /> Cifrado SSL</span><span><Ic n="💳" /> Visa · Mastercard · PayPal</span><span><Ic n="↩" /> Cancela cuando quieras</span>
                </div>
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
                  Al suscribirte aceptas los <a href="/terminos" onClick={e => { e.preventDefault(); openLegal("terms"); }} style={{ color: C.textDim }}>Términos</a>, la <a href="/privacidad" onClick={e => { e.preventDefault(); openLegal("privacy"); }} style={{ color: C.textDim }}>Privacidad</a> y la <a href="/reembolsos" onClick={e => { e.preventDefault(); openLegal("refund"); }} style={{ color: C.textDim }}>política de reembolsos</a> (3 días en tu primer pago).
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TRIAL_KEY = "cod_trial_start";
const trialLeft = () => {
  try {
    const t = Number(localStorage.getItem(TRIAL_KEY));
    if (!t) return 0;
    return Math.max(0, Math.ceil((t + 3 * 86400000 - Date.now()) / 86400000));
  } catch { return 0; }
};
const trialUsed = () => { try { return !!localStorage.getItem(TRIAL_KEY); } catch { return false; } };

function AppInner() {
  const { user, isPro, loadingAuth, loginWithGoogle } = useAuth();
  const [view, setView] = useState(() => (legalFromPath() ? "legal" : "landing"));
  const [legalKind, setLegalKind] = useState(legalFromPath);
  const [routed, setRouted] = useState(false);
  const actions = useRef({});
  const [trialDaysLeft, setTrialDaysLeft] = useState(trialLeft);
  const [payMsg, setPayMsg] = useState("");
  const justPaidUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pago") === "ok";
  const justPaid = justPaidUrl;

  const canPro = isPro || trialDaysLeft > 0;
  useEffect(() => {
    const h = (e) => { setLegalKind(e.detail); setView("legal"); };
    const pop = () => { const k = legalFromPath(); if (k) { setLegalKind(k); setView("legal"); } else setView(v => (v === "legal" ? "landing" : v)); };
    window.addEventListener("nx:legal", h); window.addEventListener("popstate", pop);
    return () => { window.removeEventListener("nx:legal", h); window.removeEventListener("popstate", pop); };
  }, []);
  useEffect(() => { const h = () => setView("account"); window.addEventListener(ACCOUNT_EVT, h); return () => window.removeEventListener(ACCOUNT_EVT, h); }, []);

  // Quien ya inició sesión entra directo al panel
  useEffect(() => {
    if (loadingAuth || routed) return;
    setRouted(true);
    if (user && view === "landing" && window.location.pathname === "/" && !justPaidUrl) setView("panel");
  }, [loadingAuth, user]);
  useEffect(() => {
    const h = (e) => {
      const v = e.detail, a = actions.current;
      if (v === "panel") setView(a.user ? "panel" : "landing");
      else if (v === "calc") (a.canPro ? setView("pro") : setView("free"));
      else if (v === "finance" && a.openFinance) a.openFinance();
      else if (v === "upgrade" && a.upgrade) a.upgrade();
    };
    window.addEventListener("nx:nav", h); return () => window.removeEventListener("nx:nav", h);
  }, []);
  // Si el pago llega mientras se espera, entra a PRO solo
  useEffect(() => { if (isPro && view === "paywall") setView("pro"); }, [isPro, view]);
  // Al volver del pago, mostrar la pantalla de espera
  useEffect(() => { if (justPaidUrl && !isPro) setView("paywall"); }, []);

  if (loadingAuth || !routed) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 13, color: C.textMuted }}>Cargando...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const startTrial = () => {
    try { if (!localStorage.getItem(TRIAL_KEY)) localStorage.setItem(TRIAL_KEY, String(Date.now())); } catch {}
    const left = trialLeft();
    setTrialDaysLeft(left);
    if (left > 0 || isPro) setView("pro");
    else { setPayMsg("Tu prueba gratis ya terminó. Activa PRO para seguir."); setView("paywall"); }
  };
  const openPro = () => { if (canPro) setView("pro"); else { setPayMsg(""); setView("paywall"); } };
  const openFree = () => setView("free");
  const openFinance = () => { if (canPro) setView("finance"); else { setPayMsg(""); setView("paywall"); } };
  const goHome = () => { try { if (window.location.pathname !== "/") window.history.pushState({}, "", "/"); } catch {} setView("landing"); window.scrollTo(0, 0); };

  // Ir a pagar: pide sesión (para saber a qué cuenta activar PRO) y abre el pago dentro de la página
  const upgrade = async () => {
    setPayMsg("");
    let u = user;
    if (!u) {
      try { u = (await loginWithGoogle()).user; }
      catch { setPayMsg("Necesitas iniciar sesión con Google para activar PRO."); setView("paywall"); return; }
    }
    setView("checkout");
  };

  actions.current = { user, canPro, openFinance, upgrade };
  const proTrial = isPro ? 0 : trialDaysLeft;
  if ((view === "pro" || view === "finance") && !canPro) return <Paywall onUpgrade={upgrade} onStartTrial={startTrial} onHome={goHome} trialAvailable={!trialUsed()} message={payMsg} justPaid={false} />;
  if (view === "legal") return <LegalView kind={legalKind || "terms"} onHome={goHome} />;
  if (view === "checkout") return <CheckoutView onBack={goHome} onDone={() => setView("pro")} />;
  if (view === "paywall") return <Paywall onUpgrade={upgrade} onStartTrial={startTrial} onHome={goHome} trialAvailable={!trialUsed()} message={payMsg} justPaid={justPaid && !isPro} />;
  if (view === "account") return <AccountView trialDaysLeft={proTrial} onUpgrade={upgrade} onHome={goHome} onCalc={openPro} onFinance={openFinance} onBackToFree={openFree} />;
  if (view === "panel") return user
    ? <AppShell active="panel" onHome={goHome}><Dashboard trialDaysLeft={proTrial} onUpgrade={upgrade} /></AppShell>
    : <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} onUpgrade={upgrade} />;
  if (view === "free") return user
    ? <AppShell active="calc" onHome={goHome}><FreeCalculator embedded onUpgrade={upgrade} onOpenPro={openPro} onStartTrial={startTrial} onHome={goHome} /></AppShell>
    : <FreeCalculator onUpgrade={upgrade} onOpenPro={openPro} onStartTrial={startTrial} onHome={goHome} />;
  if (view === "pro") return <ProCalculator trialDaysLeft={proTrial} onUpgrade={upgrade} onBackToFree={openFree} onHome={goHome} onFinance={() => setView("finance")} />;
  if (view === "finance") return <FinanceCenter onBackToCalc={openPro} onHome={goHome} onBackToFree={openFree} />;
  return <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} onUpgrade={upgrade} />;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalStyles />
      <AppInner />
    </AuthProvider>
  );
}
