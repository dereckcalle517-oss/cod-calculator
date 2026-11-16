import { useState } from "react";
import { motion } from "framer-motion";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { SavedCalcs } from "../components/SavedCalcs";
import { UserMenu } from "../components/Shell";
import { CurrencySelector, MobileProfitBar, NumInput, Slider, Toggle } from "../components/shared";
import { Brand, Flag, Ic, Rich } from "../components/ui";
import { CURRENCIES, calcHealth, fmtNum, fmtPct, makeFmt, useCalc } from "../lib/calc";
import { readPrefs } from "../lib/nav";
import { CpaCard } from "./Cpa";


// ─── FREE CALCULATOR ──────────────────────────────────────────────────────────
export function FreeCalculator({ onUpgrade, onStartTrial, onHome, onOpenPro, embedded }) {
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text }}>
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
