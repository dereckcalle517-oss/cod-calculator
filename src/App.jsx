import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#050810", surface: "#090E18", card: "#0D1520", cardHover: "#111D2C",
  border: "#162030", borderBright: "#1E2E45",
  accent: "#3B82F6", accentGlow: "rgba(59,130,246,0.2)", accentDim: "rgba(59,130,246,0.08)",
  green: "#10B981", greenGlow: "rgba(16,185,129,0.18)",
  red: "#EF4444", redGlow: "rgba(239,68,68,0.18)",
  amber: "#F59E0B", amberGlow: "rgba(245,158,11,0.18)",
  purple: "#A78BFA", purpleGlow: "rgba(167,139,250,0.18)",
  cyan: "#06B6D4", cyanGlow: "rgba(6,182,212,0.18)",
  gold: "#F59E0B",
  text: "#EFF6FF", textMuted: "#4A6580", textDim: "#7A9CC0",
};

// ─── CURRENCIES ───────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "Dólar (USD)", flag: "🇺🇸", countries: "Ecuador · Panamá" },
  { code: "COP", symbol: "$", name: "Peso Colombiano (COP)", flag: "🇨🇴", countries: "Colombia" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano (MXN)", flag: "🇲🇽", countries: "México" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano (PEN)", flag: "🇵🇪", countries: "Perú" },
  { code: "ARS", symbol: "$", name: "Peso Argentino (ARS)", flag: "🇦🇷", countries: "Argentina" },
  { code: "CLP", symbol: "$", name: "Peso Chileno (CLP)", flag: "🇨🇱", countries: "Chile" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño (BRL)", flag: "🇧🇷", countries: "Brasil" },
  { code: "BOB", symbol: "Bs.", name: "Boliviano (BOB)", flag: "🇧🇴", countries: "Bolivia" },
  { code: "PYG", symbol: "₲", name: "Guaraní (PYG)", flag: "🇵🇾", countries: "Paraguay" },
  { code: "UYU", symbol: "$U", name: "Peso Uruguayo (UYU)", flag: "🇺🇾", countries: "Uruguay" },
  { code: "GTQ", symbol: "Q", name: "Quetzal (GTQ)", flag: "🇬🇹", countries: "Guatemala" },
  { code: "DOP", symbol: "RD$", name: "Peso Dominicano (DOP)", flag: "🇩🇴", countries: "Rep. Dominicana" },
  { code: "CRC", symbol: "₡", name: "Colón (CRC)", flag: "🇨🇷", countries: "Costa Rica" },
  { code: "HNL", symbol: "L", name: "Lempira (HNL)", flag: "🇭🇳", countries: "Honduras" },
  { code: "NIO", symbol: "C$", name: "Córdoba (NIO)", flag: "🇳🇮", countries: "Nicaragua" },
  { code: "VES", symbol: "Bs.D", name: "Bolívar (VES)", flag: "🇻🇪", countries: "Venezuela" },
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
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{ background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 8, padding: "3px 12px", fontSize: 14, fontWeight: 700, color, whiteSpace: "nowrap", flexShrink: 0 }}>{value}%</div>
      </div>
      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 99, background: C.border }} />
        <div style={{ position: "absolute", left: 0, height: 6, width: `${value}%`, borderRadius: 99, background: `linear-gradient(90deg,${color}70,${color})`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: `${value}%`, transform: "translateX(-50%)", width: 20, height: 20, borderRadius: "50%", background: color, border: `3px solid ${C.bg}`, boxShadow: `0 0 12px ${color}`, pointerEvents: "none", zIndex: 1 }} />
        <input type="range" min={1} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0, zIndex: 2, WebkitAppearance: "none" }} />
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, prefix = "$", icon, sublabel }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span>{icon}</span>}{label}
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
        <button key={String(opt.val)} onClick={() => onChange(opt.val)} style={{ flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", background: value === opt.val ? `${opt.c}18` : "transparent", color: value === opt.val ? opt.c : C.textMuted, fontWeight: value === opt.val ? 700 : 500, fontSize: 12, fontFamily: "inherit", borderBottom: value === opt.val ? `2px solid ${opt.c}` : "2px solid transparent", transition: "all 0.2s" }}>{opt.label}</button>
      ))}
    </div>
  );
}

function CurrencySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = CURRENCIES.find(c => c.code === value) || CURRENCIES[0];
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 5 }}>🌎 Moneda</div>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", background: C.surface, border: `1px solid ${open ? C.accent : C.border}`, borderRadius: 10, padding: "9px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, transition: "all 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{cur.flag}</span>
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
                <span style={{ fontSize: 14 }}>{c.flag}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.code === value ? C.accent : C.text }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: C.textMuted }}>{c.countries}</div>
                </div>
                {c.code === value && <span style={{ color: C.accent, fontSize: 12 }}>✓</span>}
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
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{icon} {title}</div>
        <div style={{ height: 60, background: C.border, borderRadius: 8 }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,8,16,0.7)", borderRadius: 16, backdropFilter: "blur(2px)" }}>
        <div style={{ background: `linear-gradient(135deg,${C.gold}20,${C.purple}15)`, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "14px 20px", textAlign: "center", maxWidth: 260 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>⭐</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 4 }}>Disponible en PRO</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{desc}</div>
          <button onClick={onUpgrade} style={{ background: `linear-gradient(135deg,${C.accent},#6366F1)`, border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Activar PRO — $4.99/mes
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
        <span style={{ fontSize: 18 }}>{urgent ? "⚠️" : "⭐"}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: urgent ? C.red : C.gold }}>
            {urgent ? "¡Último día de PRO!" : `Te quedan ${daysLeft} días de PRO gratis`}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Después vuelves al plan gratis automáticamente</div>
        </div>
      </div>
      <button onClick={onUpgrade} style={{ background: `linear-gradient(135deg,${C.accent},#6366F1)`, border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
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
          <span style={{ background: `${color}18`, color, fontSize: 9, fontWeight: 700, borderRadius: 6, padding: "2px 7px" }}>{status === "optimo" ? "✓ Óptimo" : status === "ok" ? "Aceptable" : "✗ Bajo"}</span>
        </div>
      </div>
      <div style={{ position: "relative", height: 7, borderRadius: 99, background: C.border }}>
        <div style={{ position: "absolute", left: `${(bench.min / bench.max) * 100}%`, top: -3, width: 2, height: 13, background: C.amber + "60", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: `${(bench.optimo / bench.max) * 100}%`, top: -3, width: 2, height: 13, background: C.green + "60", borderRadius: 1 }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${color}70,${color})` }} />
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

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: #050810; }
      html { scroll-behavior: smooth; }
      input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
      input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 1px; height: 1px; }
      input[type=range]::-moz-range-thumb { width: 1px; height: 1px; border: none; background: transparent; }
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      @media (max-width: 900px) {
        .main-layout { grid-template-columns: 1fr !important; gap: 14px !important; padding: 12px 10px 40px !important; }
        .left-panel { position: static !important; }
        .charts-grid { grid-template-columns: 1fr !important; }
        .hide-mobile { display: none !important; }
        .pricing-grid { grid-template-columns: 1fr !important; }
        .team-grid { grid-template-columns: 1fr 1fr !important; }
      }
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
    return { confirmados, entregados, devoluciones, noConfirmados, dropi, gananciaXPedido, ingresosBrutos, perdidaCPA_dev, perdidaFlete_dev, perdidaProducto_dev, totalPerdidaDev, perdidaCPA_noc, totalDropi, totalCPA, totalEnvio, totalCosto, gastosTotales, gananciaNet, margen, roasBreakEven, roas, invAds, fleteRecuperado };
  }, [inputs]);
}

// ─── FREE CALCULATOR ──────────────────────────────────────────────────────────
function FreeCalculator({ onUpgrade, onStartTrial }) {
  const [currencyCode, setCurrencyCode] = useState("USD");
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const fmt = makeFmt(currency.symbol);
  const [inputs, setInputs] = useState({ costo: 8, precio: 34.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true });
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Inter',system-ui,sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}EE`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${C.accent},#6366F1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>COD Calculator <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 500 }}>— Gratis</span></div>
          </div>
          <button onClick={onUpgrade} style={{ background: `linear-gradient(135deg,${C.gold},${C.amber})`, border: "none", borderRadius: 9, padding: "7px 16px", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            ⭐ Ir a PRO
          </button>
        </div>
      </div>

      {/* Pro upsell banner */}
      <div style={{ background: `linear-gradient(90deg,${C.accent}12,${C.purple}08)`, borderBottom: `1px solid ${C.accent}20`, padding: "10px 20px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: C.textDim }}>🚀 ¿Quieres benchmarks LATAM, IA, escalado y más? </span>
        <button onClick={onStartTrial} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
          Prueba PRO gratis 3 días →
        </button>
      </div>

      <div className="main-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px 40px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }}>

        {/* LEFT */}
        <motion.div className="left-panel" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px", position: "sticky", top: 94 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}>⚙️ Tu campaña</div>
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
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 7 }}>🔁 Recuperación del producto</div>
          <Toggle value={inputs.recupera} onChange={set("recupera")} />

          {/* Fixed costs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <div style={{ background: `${C.purple}0A`, border: `1px solid ${C.purple}25`, borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Comisión Dropi</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>2.5%</div>
            </div>
            <div style={{ background: `${C.amber}0A`, border: `1px solid ${C.amber}25`, borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Flete devuelto</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>40%</div>
            </div>
          </div>
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
                <div style={{ fontSize: 17, fontWeight: 900, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, lineHeight: 1 }}>{health.score}</div>
                <div style={{ fontSize: 8, color: C.textMuted }}>/ 100</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Salud de campaña</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, marginBottom: 5 }}>
                {health.score >= 75 ? "Saludable" : health.score >= 50 ? "En riesgo" : "Crítico"}
              </div>
              {health.issues[0] && (
                <div style={{ fontSize: 11, color: C.amber, background: `${C.amber}10`, borderRadius: 7, padding: "4px 9px", display: "inline-block" }}>
                  ⚠️ {health.issues[0].label}
                </div>
              )}
            </div>
            {/* PRO teaser */}
            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}25`, borderRadius: 10, padding: "10px 12px", textAlign: "center", flexShrink: 0, cursor: "pointer" }} onClick={onUpgrade}>
              <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>⭐ Solo en PRO</div>
              <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>Análisis detallado<br />+ IA + Benchmarks</div>
            </div>
          </motion.div>

          {/* Main result */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ background: isProfit ? `${C.green}0A` : `${C.red}0A`, border: `1.5px solid ${isProfit ? C.green : C.red}40`, borderRadius: 16, padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{isProfit ? "✦ Ganancia neta total" : "⚠ Pérdida neta total"}</div>
              <div style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, letterSpacing: "-0.03em", color: isProfit ? C.green : C.red, lineHeight: 1 }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Margen: <span style={{ fontWeight: 700, color: isProfit ? C.green : C.red }}>{fmtPct(R.margen)}</span> · {currency.flag} {currency.code}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: isProfit ? `${C.green}15` : `${C.red}15`, border: `2px solid ${isProfit ? C.green : C.red}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{isProfit ? "🚀" : "⚠️"}</div>
          </motion.div>

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
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{m.icon} {m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Pedidos flow */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>📊 Flujo de pedidos</div>
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
            <ResponsiveContainer width="100%" height={180}>
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
          <div style={{ background: `linear-gradient(135deg,${C.gold}10,${C.purple}08)`, border: `1px solid ${C.gold}25`, borderRadius: 16, padding: "20px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 6 }}>⭐ Solo en PRO — esto te estás perdiendo</div>
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
                  <span style={{ fontSize: 14 }}>{item.icon}</span>{item.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ flex: 1, background: `linear-gradient(135deg,${C.accent},#6366F1)`, border: "none", borderRadius: 10, padding: "11px 16px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px ${C.accentGlow}` }}>
                🎁 Probar PRO gratis 3 días
              </motion.button>
              <button onClick={onUpgrade} style={{ flex: 1, background: "transparent", border: `1px solid ${C.gold}40`, borderRadius: 10, padding: "11px 16px", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ⭐ Activar PRO — $4.99/mes
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
function ProCalculator({ trialDaysLeft, onUpgrade, onBackToFree }) {
  const [currencyCode, setCurrencyCode] = useState("USD");
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const fmt = makeFmt(currency.symbol);
  const [inputs, setInputs] = useState({ costo: 8, precio: 34.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true });
  const set = (key) => (val) => setInputs(p => ({ ...p, [key]: val }));
  const R = useCalc(inputs);
  const health = calcHealth(inputs, R);
  const risk = calcRisk(inputs, R);
  const invisible = calcInvisibleLosses(inputs, R);
  const breakPts = calcBreakPoints(inputs, R);
  const isProfit = R.gananciaNet >= 0;
  const [tab, setTab] = useState("resultados");
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
<div class="header"><div class="badge">COD Calculator PRO · LATAM · ${currency.name}</div><h1>Reporte Profesional de Rentabilidad</h1><p style="font-size:11px;opacity:.7">${date} · Salud: ${h.score}/100 · Riesgo: ${r.level}</p></div>
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
<div class="footer">COD Calculator PRO · Simulación Financiera Real · Dropshipping Contraentrega LATAM</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.onload = () => setTimeout(() => win.print(), 300);
  };

  const TABS = [
    { id: "resultados", label: "📊 Resultados" },
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Inter',system-ui,sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}F0`, backdropFilter: "blur(24px)", position: "sticky", top: 0, zIndex: 100, padding: "0 14px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBackToFree} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 11, fontFamily: "inherit", padding: "4px 6px" }}>← Gratis</button>
            <div style={{ width: 1, height: 14, background: C.border }} />
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg,${C.gold},${C.amber})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⭐</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>COD Calculator <span style={{ color: C.gold }}>PRO</span></div>
              <div style={{ fontSize: 9, color: C.textMuted }}>Sistema operativo de dropshipping COD LATAM</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ background: `${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}15`, border: `1px solid ${health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red}35`, borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red }}>❤️ {health.score}/100</div>
            <div style={{ background: `${risk.color}15`, border: `1px solid ${risk.color}35`, borderRadius: 7, padding: "3px 9px", fontSize: 10, fontWeight: 700, color: risk.color }}>{risk.emoji} {risk.level}</div>
            <button onClick={generatePDF} style={{ background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 7, padding: "4px 10px", color: C.green, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📄 PDF</button>
          </div>
        </div>
      </div>

      {trialDaysLeft > 0 && <TrialBanner daysLeft={trialDaysLeft} onUpgrade={onUpgrade} />}

      <div className="main-layout" style={{ maxWidth: 1300, margin: "0 auto", padding: "16px 12px 40px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>

        {/* LEFT */}
        <motion.div className="left-panel" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          style={{ background: C.card, border: `1px solid ${C.gold}20`, borderRadius: 18, padding: "18px", position: "sticky", top: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>⚙️</span>
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
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 7 }}>🔁 Recuperación del producto</div>
          <Toggle value={inputs.recupera} onChange={set("recupera")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
            <div style={{ background: `${C.purple}0A`, border: `1px solid ${C.purple}25`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Dropi</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.purple }}>2.5%</div>
            </div>
            <div style={{ background: `${C.amber}0A`, border: `1px solid ${C.amber}25`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Flete</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.amber }}>40%</div>
            </div>
          </div>
          <div style={{ marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Ganancia por pedido</div>
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
          {/* Simulations */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>📁 Simulaciones ({sims.length}/10)</div>
              <button onClick={() => setShowSave(!showSave)} style={{ background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 7, padding: "4px 9px", color: C.green, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Guardar</button>
            </div>
            <AnimatePresence>
              {showSave && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 7 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={simName} onChange={e => setSimName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveSim()} placeholder="Nombre de campaña..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 11, fontFamily: "inherit", outline: "none", minWidth: 0 }} />
                    <button onClick={saveSim} style={{ background: C.green, border: "none", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>OK</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {sims.slice(0, 3).map(s => (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 9, color: s.results.gananciaNet >= 0 ? C.green : C.red }}>{s.results.gananciaNet >= 0 ? "+" : ""}{Math.round(s.results.gananciaNet)} · {fmtPct(s.results.margen)}</div>
                </div>
                <button onClick={() => setInputs(s.inputs)} style={{ background: `${C.accent}15`, border: "none", borderRadius: 6, padding: "4px 8px", color: C.accent, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>↩</button>
              </div>
            ))}
          </div>
          <button onClick={generatePDF} style={{ width: "100%", marginTop: 10, background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "9px", color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📄 Generar PDF profesional</button>
        </motion.div>

        {/* RIGHT */}
        <div>
          {/* Big result */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: isProfit ? `${C.green}0A` : `${C.red}0A`, border: `1.5px solid ${isProfit ? C.green : C.red}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{isProfit ? "✦ Ganancia neta total" : "⚠ Pérdida neta total"}</div>
              <div style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 900, letterSpacing: "-0.03em", color: isProfit ? C.green : C.red, lineHeight: 1 }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Margen: <span style={{ fontWeight: 700, color: isProfit ? C.green : C.red }}>{fmtPct(R.margen)}</span> · {currency.flag} {currency.code}</div>
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
                style={{ padding: "7px 12px", background: tab === t.id ? `${C.gold}15` : C.card, border: `1px solid ${tab === t.id ? C.gold : C.border}`, borderRadius: 9, color: tab === t.id ? C.gold : C.textDim, fontSize: 11, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

              {/* ── RESULTADOS ── */}
              {tab === "resultados" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 12 }}>
                    {[
                      { label: "Totales", val: fmtNum(inputs.pedidos), color: C.accent, icon: "📋" },
                      { label: "Confirmados", val: fmtNum(R.confirmados), color: C.accent, icon: "✅" },
                      { label: "Entregados", val: fmtNum(R.entregados), color: C.green, icon: "📬" },
                      { label: "Devoluciones", val: fmtNum(R.devoluciones), color: C.red, icon: "↩️" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 6 }}>{m.icon} {m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 12 }}>
                    {[
                      { label: "Ingresos totales", val: fmt(R.ingresosBrutos), color: C.green, icon: "📈" },
                      { label: "Gastos totales", val: fmt(R.gastosTotales), color: C.red, icon: "📉" },
                      { label: "Ganancia/pedido", val: fmt(R.gananciaXPedido), color: R.gananciaXPedido >= 0 ? C.green : C.red, icon: "💰" },
                      { label: "ROAS actual", val: `${R.roas.toFixed(2)}x`, color: C.accent, icon: "🎯" },
                      { label: "ROAS Break Even", val: `${R.roasBreakEven.toFixed(2)}x`, color: C.amber, icon: "⚖️" },
                      { label: "Comisión Dropi", val: fmt(R.totalDropi), color: C.purple, icon: "🏢" },
                      { label: "Pérdidas dev.", val: fmt(R.totalPerdidaDev), color: C.red, icon: "💸" },
                      { label: "Perdido en ads", val: fmt(R.perdidaCPA_dev + R.perdidaCPA_noc), color: C.red, icon: "📣" },
                      { label: "Perdido logística", val: fmt(R.perdidaFlete_dev), color: C.amber, icon: "🚚" },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 12px" }}>
                        <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 6 }}>{m.icon} {m.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Charts */}
                  <div className="charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 10 }}>Flujo de pedidos</div>
                      <ResponsiveContainer width="100%" height={170}>
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
                      <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={[{ name: "Ingresos", value: R.ingresosBrutos, fill: C.green }, { name: "Gastos", value: R.gastosTotales, fill: C.red }, { name: "Ganancia", value: Math.max(0, R.gananciaNet), fill: C.accent }]} barSize={28} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
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
                          <div style={{ fontSize: 22, fontWeight: 900, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, lineHeight: 1 }}>{health.score}</div>
                          <div style={{ fontSize: 9, color: C.textMuted }}>/ 100</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Puntuación de salud</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: health.score >= 75 ? C.green : health.score >= 50 ? C.amber : C.red, marginBottom: 4 }}>
                          {health.score >= 75 ? "Saludable" : health.score >= 50 ? "En riesgo" : "Crítico"}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{health.issues.length} problema(s) · {health.wins.length} punto(s) positivo(s)</div>
                      </div>
                    </div>
                    {health.issues.map((issue, i) => (
                      <div key={i} style={{ background: `${issue.severity === "urgente" ? C.red : C.amber}08`, border: `1px solid ${issue.severity === "urgente" ? C.red : C.amber}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 12 }}>{issue.severity === "urgente" ? "🚨" : "⚠️"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: issue.severity === "urgente" ? C.red : C.amber }}>{issue.label}</span>
                          <span style={{ background: `${issue.severity === "urgente" ? C.red : C.amber}20`, color: issue.severity === "urgente" ? C.red : C.amber, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" }}>{issue.severity}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{issue.detail}</div>
                      </div>
                    ))}
                    {health.wins.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {health.wins.map((w, i) => <div key={i} style={{ background: `${C.green}0A`, border: `1px solid ${C.green}25`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: C.green }}>✓ {w.label}: {w.detail}</div>)}
                    </div>}
                  </div>

                  {/* Risk level */}
                  <div style={{ background: `${risk.color}08`, border: `1.5px solid ${risk.color}40`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>⚡ Nivel de riesgo</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <div style={{ fontSize: 40 }}>{risk.emoji}</div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: risk.color }}>{risk.level}</div>
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
                          <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: item.ok ? C.green : C.red }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Break predictor */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>⚡ Predictor de Quiebre</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Los límites críticos de tu campaña. Si cruzas estas líneas, pierdes dinero.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}25`, borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>🚨 Entrega mínima rentable</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{breakPts.minEntrega}%</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          {inputs.pctEntregados > breakPts.minEntrega
                            ? `✓ Estás ${inputs.pctEntregados - breakPts.minEntrega}pp por encima del límite`
                            : `⚠ Estás ${breakPts.minEntrega - inputs.pctEntregados}pp por debajo del límite`}
                        </div>
                      </div>
                      <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}25`, borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>⚠️ CPA máximo seguro</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: C.amber }}>{fmt(breakPts.maxCPA)}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          {inputs.cpa <= breakPts.maxCPA
                            ? `✓ Tu CPA está ${fmt(breakPts.maxCPA - inputs.cpa)} por debajo del límite`
                            : `⚠ Tu CPA supera el límite en ${fmt(inputs.cpa - breakPts.maxCPA)}`}
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>🏆 Benchmarks COD LATAM</div>
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
                        <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
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
                  <div style={{ background: `linear-gradient(135deg,${C.red}10,${C.purple}07)`, border: `1px solid ${C.red}25`, borderRadius: 16, padding: "20px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.red, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>🔍 Pérdida Invisible</div>
                    <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Este es el dinero que <strong style={{ color: C.text }}>podrías estar ganando</strong> si optimizas los puntos clave de tu campaña. No es lo que pierdes — es lo que dejas de ganar.</div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: C.red, letterSpacing: "-0.02em", marginBottom: 6 }}>−{fmt(invisible.total)}</div>
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
                        <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: C.red }}>−{fmt(item.amount)}</div>
                          </div>
                          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8, lineHeight: 1.5 }}>{item.desc}</div>
                          <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 8, padding: "7px 10px", fontSize: 11, color: C.green }}>
                            💡 {item.action}
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>🎭 Modo Escenario</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Tres proyecciones automáticas basadas en tus datos. Sin cambiar nada manualmente.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                    {scenarioResults.map((sc, i) => (
                      <motion.div key={sc.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        onClick={() => setScenarioMode(sc.key)}
                        style={{ background: scenarioMode === sc.key ? `${sc.color}12` : C.card, border: `1.5px solid ${scenarioMode === sc.key ? sc.color : C.border}`, borderRadius: 14, padding: "16px", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: sc.color, marginBottom: 3 }}>{sc.label}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>{sc.desc}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: sc.ganancia >= 0 ? C.green : C.red }}>{sc.ganancia >= 0 ? "" : "−"}{fmt(sc.ganancia)}</div>
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>📈 Simulador de Escalado</div>
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>🎯 Centro de Optimización</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Acciones ordenadas por impacto económico real. Las más rentables primero.</div>
                  {growthOps.map((op, i) => {
                    const difColor = { "Fácil": C.green, "Media": C.amber, "Difícil": C.red };
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{op.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{op.title}</span>
                            <span style={{ background: `${difColor[op.dif]}18`, color: difColor[op.dif], fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px" }}>{op.dif}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{op.desc}</div>
                          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: C.textMuted }}>
                            <span>⏱ {op.time}</span>
                            <span>🎯 Prioridad #{op.priority}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: op.gain >= 0 ? C.green : C.red }}>{op.gain >= 0 ? "+" : "−"}{fmt(op.gain)}</div>
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
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>⚖️ Comparador de Productos</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>¿Cuál producto conviene más escalar? Compara rentabilidad lado a lado.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    {/* Producto A */}
                    <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}25`, borderRadius: 14, padding: "16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginBottom: 12 }}>📦 Producto A (actual)</div>
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
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.purple, marginBottom: 10 }}>📦 Producto B (comparar)</div>
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: row.aBetter ? C.green : C.textDim, background: row.aBetter ? `${C.green}08` : "transparent", borderRadius: 7, padding: "4px 8px", textAlign: "center" }}>A: {row.a} {row.aBetter ? "✓" : ""}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: !row.aBetter ? C.green : C.textDim, background: !row.aBetter ? `${C.green}08` : "transparent", borderRadius: 7, padding: "4px 8px", textAlign: "center" }}>B: {row.b} {!row.aBetter ? "✓" : ""}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, background: R.gananciaNet >= RB.ganancia ? `${C.green}08` : `${C.purple}08`, border: `1px solid ${R.gananciaNet >= RB.ganancia ? C.green : C.purple}25`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: R.gananciaNet >= RB.ganancia ? C.green : C.purple }}>
                        {R.gananciaNet >= RB.ganancia ? "📦 Producto A" : "📦 Producto B"} es más rentable para escalar
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
        <div style={{ fontSize: 10, color: C.textMuted }}>COD Calculator PRO · Sistema operativo de dropshipping COD LATAM</div>
      </div>
      <GlobalStyles />
    </div>
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
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>🤖 Consultor de IA PRO</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Análisis personalizado · Contexto COD LATAM · Sin respuestas genéricas</div>
        </div>
        <motion.button onClick={getAdvice} disabled={loading} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ background: loading ? C.border : `linear-gradient(135deg,${C.accent},#6366F1)`, border: "none", borderRadius: 11, padding: "10px 18px", color: loading ? C.textMuted : "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
          {loading ? <><span style={{ display: "inline-block", width: 13, height: 13, border: `2px solid ${C.textMuted}`, borderTopColor: C.text, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Analizando...</> : "✨ Analizar mi campaña"}
        </motion.button>
      </div>
      {!advice && !loading && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
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
                    <div style={{ fontSize: 12, fontWeight: 800, color: s.color, marginBottom: 5 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.content}</div>
                  </motion.div>
                ))}
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={getAdvice} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 11px", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🔄 Nuevo análisis</button>
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
function Landing({ onOpenFree, onOpenPro, onStartTrial }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Inter',system-ui,sans-serif", color: C.text }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}EE`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},#6366F1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>COD Calculator <span style={{ color: C.gold }}>Pro</span></div>
          </div>
          <div className="hide-mobile" style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <a href="#nosotros" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Quiénes somos</a>
            <a href="#precios" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Precios</a>
            <a href="#faq" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>FAQ</a>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 16px", color: C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Gratis</button>
            <motion.button onClick={onOpenPro} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: `linear-gradient(135deg,${C.gold},${C.amber})`, border: "none", borderRadius: 9, padding: "8px 16px", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>⭐ Ver PRO</motion.button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 20px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: `radial-gradient(ellipse,${C.accentGlow},transparent 65%)`, pointerEvents: "none" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 99, padding: "6px 16px", fontSize: 12, color: C.green, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 24 }}>
            ✦ La herramienta que los dropshippers de LATAM necesitaban
          </div>
          <h1 style={{ fontSize: "clamp(30px,5.5vw,60px)", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 20px", lineHeight: 1.08, background: `linear-gradient(135deg,${C.text} 35%,${C.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>
            Deja de perder dinero en campañas que parecen rentables y no lo son
          </h1>
          <p style={{ fontSize: "clamp(14px,2vw,17px)", color: C.textDim, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.75 }}>
            Calcula tu ganancia real incluyendo devoluciones, confirmaciones, comisión Dropi y publicidad. Con puntuación de salud, IA, benchmarks LATAM y simulador de escalado. <strong style={{ color: C.text }}>16 monedas de toda Latinoamérica.</strong>
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <motion.button onClick={onOpenFree} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 13, padding: "14px 28px", color: C.textDim, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Usar gratis →
            </motion.button>
            <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: `linear-gradient(135deg,${C.gold},${C.amber})`, border: "none", borderRadius: 13, padding: "14px 28px", color: C.bg, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 8px 32px ${C.amberGlow}` }}>
              ⭐ Probar PRO gratis 3 días
            </motion.button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: C.textMuted }}>✓ Sin tarjeta de crédito &nbsp;·&nbsp; ✓ Sin registro &nbsp;·&nbsp; ✓ 16 monedas LATAM</div>
        </motion.div>
        <div style={{ marginTop: 40, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          {CURRENCIES.map(c => (
            <div key={c.code} title={c.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 11, color: C.textDim, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13 }}>{c.flag}</span>{c.code}
            </div>
          ))}
        </div>
      </section>

      {/* Free vs Pro comparison */}
      <section id="precios" style={{ padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Planes</div>
            <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>Elige tu nivel</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>Gratis para calcular. PRO para escalar y ganar más.</div>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Free */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 22px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>Gratis</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.text, letterSpacing: "-0.03em" }}>$0</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Para siempre</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Calcula si tu campaña es rentable. Rápido y simple.</div>
              {["Calculadora completa", "16 monedas LATAM", "Score de salud básico", "1 gráfico de pedidos", "Resultados principales"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textDim, marginBottom: 7 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓</span>{f}
                </div>
              ))}
              <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
              {["Benchmarks LATAM", "Simulador de escalado", "Pérdida Invisible", "Asesor IA", "Escenarios", "Comparador A/B", "PDF profesional", "Simulaciones guardadas"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textMuted, marginBottom: 6, opacity: 0.5 }}>
                  <span style={{ color: C.textMuted }}>✗</span>{f}
                </div>
              ))}
              <button onClick={onOpenFree} style={{ width: "100%", marginTop: 16, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", color: C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            </div>

            {/* Pro */}
            <div style={{ background: `linear-gradient(135deg,${C.gold}08,${C.purple}06)`, border: `2px solid ${C.gold}40`, borderRadius: 20, padding: "26px 22px", position: "relative" }}>
              <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${C.gold},${C.amber})`, borderRadius: 99, padding: "3px 14px", fontSize: 10, color: C.bg, fontWeight: 800, whiteSpace: "nowrap" }}>⭐ SISTEMA PROFESIONAL</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>PRO</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.text, letterSpacing: "-0.03em" }}>$4.99</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>por mes · cancela cuando quieras</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Sistema operativo de dropshipping COD. Escala, optimiza y toma decisiones profesionales.</div>
              {[
                "Todo lo del plan gratis",
                "❤️ Salud y riesgo detallado",
                "🏆 Benchmarks LATAM reales",
                "🔍 Pérdida Invisible calculada",
                "🎭 Simulador de 3 escenarios",
                "📈 Escalado proyectado",
                "🎯 Centro de optimización",
                "⚖️ Comparador A/B de productos",
                "🤖 Consultor IA ilimitado",
                "⚡ Predictor de quiebre",
                "📄 PDF profesional",
                "📁 Simulaciones ilimitadas",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: i === 0 ? C.textDim : C.text, marginBottom: 7 }}>
                  <span style={{ color: C.gold, fontWeight: 700 }}>✓</span>{f}
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                <button onClick={onStartTrial} style={{ background: `linear-gradient(135deg,${C.gold},${C.amber})`, border: "none", borderRadius: 12, padding: "12px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  🎁 Probar PRO gratis 3 días
                </button>
                <button onClick={onOpenPro} style={{ background: "transparent", border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "10px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Activar PRO — $4.99/mes
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
            <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Quiénes somos</div>
            <div style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 900, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Nació de perder dinero real.<br />
              <span style={{ background: `linear-gradient(135deg,${C.accent},${C.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Se construyó para que tú no lo pierdas.</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center", marginBottom: 44 }}>
            <div>
              <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, borderRadius: 14, padding: "20px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>⚠️ El momento que lo cambió todo</div>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, margin: 0 }}>Era un martes por la noche. Tenía los números en la cabeza: 200 pedidos, precio $35, CPA $4. La matemática parecía perfecta. <strong style={{ color: C.text }}>Pero cuando llegó el dinero real, había perdido más de $600.</strong></p>
              </div>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, marginBottom: 12 }}>Lo que no había calculado: que solo el 72% iba a confirmar. Que el 63% iba a recibir el paquete. Que cada devolución costaba el CPA más el 60% del flete.</p>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>Esa noche construí la herramienta que ojalá hubiera tenido desde el primer día.</p>
            </div>
            <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 18, padding: "24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>📊 Lo que aprendimos a las malas</div>
              {[
                { stat: "40%", desc: "de dropshippers en LATAM pierden dinero en su primera campaña sin saberlo" },
                { stat: "2–3x", desc: "es la diferencia entre el margen estimado y el real al incluir devoluciones" },
                { stat: "$800+", desc: "es el promedio que un dropshipper pierde antes de entender el COD real" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: i < 2 ? 14 : 0, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, flexShrink: 0, lineHeight: 1 }}>{item.stat}</div>
                  <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{item.desc}</div>
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
                <div style={{ fontSize: 10, color: m.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>{m.role}</div>
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
            <div style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 900, color: C.text }}>Preguntas frecuentes</div>
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
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", background: `linear-gradient(135deg,${C.gold}10,${C.purple}08)`, border: `1px solid ${C.gold}25`, borderRadius: 22, padding: "40px 24px" }}>
          <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.02em", marginBottom: 10 }}>¿Tu campaña es rentable de verdad?</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 22, lineHeight: 1.7 }}>Descúbrelo en 30 segundos. Sin registro. Sin tarjeta.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 22px", color: C.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: `linear-gradient(135deg,${C.gold},${C.amber})`, border: "none", borderRadius: 12, padding: "12px 22px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              ⭐ Probar PRO gratis 3 días
            </motion.button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg,${C.accent},#6366F1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📦</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>COD Calculator <span style={{ color: C.gold }}>Pro</span></div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.textMuted, flexWrap: "wrap" }}>
            <a href="#nosotros" style={{ color: C.textMuted, textDecoration: "none" }}>Quiénes somos</a>
            <span style={{ cursor: "pointer" }}>Términos</span>
            <span style={{ cursor: "pointer" }}>Privacidad</span>
            <span style={{ cursor: "pointer" }}>Contacto</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>© 2025 COD Calculator Pro · LATAM</div>
        </div>
      </footer>
      <GlobalStyles />
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("landing"); // "landing" | "free" | "pro"
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const startTrial = () => {
    setTrialDaysLeft(3);
    setView("pro");
  };

  const openPro = () => setView("pro");
  const openFree = () => setView("free");
  const goLanding = () => setView("landing");

  if (view === "free") return <FreeCalculator onUpgrade={openPro} onStartTrial={startTrial} />;
  if (view === "pro") return <ProCalculator trialDaysLeft={trialDaysLeft} onUpgrade={openPro} onBackToFree={openFree} />;
  return <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} />;
}
