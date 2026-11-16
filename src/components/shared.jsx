import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../theme";
import { Flag, Ic, Rich } from "./ui";
import { CURRENCIES, fmtPct } from "../lib/calc";


// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
export function Slider({ label, sublabel, value, onChange, color = C.accent }) {
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


export function NumInput({ label, value, onChange, prefix = "$", icon, sublabel }) {
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


export function Toggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {[{ label: "✓ Sí recupero", val: true, c: C.green }, { label: "✗ No recupero", val: false, c: C.red }].map(opt => (
        <button key={String(opt.val)} onClick={() => onChange(opt.val)} style={{ flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", background: value === opt.val ? `${opt.c}18` : "transparent", color: value === opt.val ? opt.c : C.textMuted, fontWeight: value === opt.val ? 700 : 500, fontSize: 12, fontFamily: "inherit", borderBottom: value === opt.val ? `2px solid ${opt.c}` : "2px solid transparent", transition: "all 0.2s" }}><Rich>{opt.label}</Rich></button>
      ))}
    </div>
  );
}


export function CurrencySelector({ value, onChange }) {
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
export function ProLocked({ title, desc, icon, onUpgrade }) {
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
export function TrialBanner({ daysLeft, onUpgrade }) {
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
export function BenchmarkBar({ label, value, bench, suffix = "%" }) {
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
export function FAQItem({ q, a }) {
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


export function MobileProfitBar({ R, fmt, isProfit }) {
  return (
    <div className="m-bar" style={{ position: "sticky", top: 52, zIndex: 90, background: `${C.surface}F5`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "8px 14px", display: "none", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 11, color: C.textMuted }}>{isProfit ? "Ganancia neta" : "Pérdida neta"}<span style={{ marginLeft: 6, color: isProfit ? C.green : C.red, fontWeight: 700 }}>{fmtPct(R.margen)}</span></div>
      <div style={{ fontSize: 18, fontWeight: 800, color: isProfit ? C.green : C.red }}>{isProfit ? "" : "−"}{fmt(R.gananciaNet)}</div>
    </div>
  );
}
