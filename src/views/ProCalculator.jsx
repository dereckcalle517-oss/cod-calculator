import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { SavedCalcs } from "../components/SavedCalcs";
import { AppShell } from "../components/Shell";
import { BenchmarkBar, CurrencySelector, MobileProfitBar, NumInput, Slider, Toggle, TrialBanner } from "../components/shared";
import { Flag, Ic, Rich } from "../components/ui";
import { BENCH, CURRENCIES, calcBreakPoints, calcHealth, calcInvisibleLosses, calcRisk, fmtNum, fmtPct, makeFmt, useCalc } from "../lib/calc";
import { readPrefs } from "../lib/nav";
import { AITab } from "./AITab";
import { CpaTab } from "./Cpa";


// ─── PRO CALCULATOR ───────────────────────────────────────────────────────────
export function ProCalculator({ trialDaysLeft, onUpgrade, onBackToFree, onHome, onFinance }) {
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
<div class="header"><div class="badge">Cuadre PRO · LATAM · ${currency.name}</div><h1>Reporte Profesional de Rentabilidad</h1><p style="font-size:11px;opacity:.7">${date} · Salud: ${h.score}/100 · Riesgo: ${r.level}</p></div>
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
<div class="footer">Cuadre PRO · Simulación Financiera Real · Dropshipping Contraentrega LATAM</div>
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
        <div style={{ fontSize: 10, color: C.textMuted }}>Cuadre PRO · Sistema operativo de dropshipping COD LATAM</div>
      </div>
      <GlobalStyles />
    </AppShell>
  );
}
