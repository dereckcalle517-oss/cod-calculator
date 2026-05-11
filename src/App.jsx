import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg: "#080C12",
  surface: "#0D1117",
  card: "#111820",
  cardHover: "#141D27",
  border: "#1C2638",
  borderBright: "#243044",
  accent: "#3B82F6",
  accentGlow: "rgba(59,130,246,0.18)",
  accentDim: "rgba(59,130,246,0.08)",
  green: "#10B981",
  greenGlow: "rgba(16,185,129,0.15)",
  red: "#EF4444",
  redGlow: "rgba(239,68,68,0.15)",
  amber: "#F59E0B",
  amberGlow: "rgba(245,158,11,0.15)",
  purple: "#A78BFA",
  purpleGlow: "rgba(167,139,250,0.15)",
  text: "#F0F6FF",
  textMuted: "#64748B",
  textDim: "#94A3B8",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, dec = 2) =>
  n === undefined || isNaN(n)
    ? "$0.00"
    : `$${Math.abs(n).toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

const fmtPct = (n) => `${n?.toFixed(1) ?? "0.0"}%`;
const fmtNum = (n) => Math.round(n ?? 0).toLocaleString("es-ES");

// ─── Slider ──────────────────────────────────────────────────────────────────
function Slider({ label, sublabel, value, onChange, color = C.accent }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "inherit" }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{
          background: `${color}20`, border: `1px solid ${color}40`,
          borderRadius: 8, padding: "3px 12px",
          fontSize: 14, fontWeight: 700, color, fontFamily: "inherit"
        }}>{value}%</div>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: C.border, cursor: "pointer" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${value}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          transition: "width 0.1s",
          boxShadow: `0 0 10px ${color}60`,
        }} />
        <input
          type="range" min={1} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", inset: 0, opacity: 0,
            width: "100%", cursor: "pointer", margin: 0, height: "100%"
          }}
        />
        <div style={{
          position: "absolute", top: "50%", transform: "translate(-50%,-50%)",
          left: `${value}%`, width: 16, height: 16, borderRadius: "50%",
          background: color, border: `2px solid ${C.bg}`,
          boxShadow: `0 0 12px ${color}`,
          transition: "left 0.1s", pointerEvents: "none"
        }} />
      </div>
    </div>
  );
}

// ─── NumberInput ──────────────────────────────────────────────────────────────
function NumInput({ label, sublabel, value, onChange, prefix = "$", icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        {label}
      </div>
      {sublabel && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{sublabel}</div>}
      <div style={{
        display: "flex", alignItems: "center",
        background: focused ? C.accentDim : C.surface,
        border: `1px solid ${focused ? C.accent : C.border}`,
        borderRadius: 10, overflow: "hidden",
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 3px ${C.accentGlow}` : "none",
      }}>
        <span style={{ padding: "0 12px", color: focused ? C.accent : C.textMuted, fontSize: 13, fontWeight: 700 }}>{prefix}</span>
        <input
          type="number" value={value}
          onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          min={0}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: C.text, fontSize: 15, fontWeight: 600, padding: "11px 12px 11px 0",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: "hidden", display: "flex"
    }}>
      {[
        { label: "✓ Sí recupero el producto", val: true, c: C.green },
        { label: "✗ No recupero el producto", val: false, c: C.red },
      ].map(opt => (
        <button
          key={String(opt.val)}
          onClick={() => onChange(opt.val)}
          style={{
            flex: 1, padding: "10px 8px", border: "none", cursor: "pointer",
            background: value === opt.val ? `${opt.c}18` : "transparent",
            color: value === opt.val ? opt.c : C.textMuted,
            fontWeight: value === opt.val ? 700 : 500,
            fontSize: 12, fontFamily: "inherit",
            borderBottom: value === opt.val ? `2px solid ${opt.c}` : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ─── MetricCard ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = C.accent, icon, large, negative }) {
  const glowMap = { [C.green]: C.greenGlow, [C.red]: C.redGlow, [C.amber]: C.amberGlow, [C.purple]: C.purpleGlow, [C.accent]: C.accentGlow };
  const glow = glowMap[color] || C.accentGlow;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: large ? "24px" : "18px",
        position: "relative", overflow: "hidden",
        transition: "all 0.25s",
        cursor: "default",
      }}
      whileHover={{ background: C.cardHover, borderColor: C.borderBright, y: -2 }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80, borderRadius: "0 16px 0 100%",
        background: `${color}0A`,
      }} />
      <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        fontSize: large ? 30 : 22, fontWeight: 800, color: negative ? C.red : color,
        letterSpacing: "-0.02em", lineHeight: 1,
        textShadow: `0 0 20px ${negative ? C.redGlow : glow}`,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
    </motion.div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>{children}</div>
      {sub && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => <div style={{ height: 1, background: C.border, margin: "28px 0" }} />;

// ─── InfoBadge ────────────────────────────────────────────────────────────────
function InfoBadge({ label, value, color = C.accent }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: `${color}12`, border: `1px solid ${color}30`,
      borderRadius: 8, padding: "6px 12px", fontSize: 12, color,
    }}>
      <span style={{ fontWeight: 600, color: C.textMuted }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
    }}>
      {label && <div style={{ color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value?.toFixed ? `$${p.value.toFixed(2)}` : p.value}</div>
      ))}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [inputs, setInputs] = useState({
    costo: 8,
    precio: 34.99,
    envio: 5,
    cpa: 4,
    pedidos: 100,
    pctConfirmados: 75,
    pctEntregados: 65,
    recupera: true,
  });

  const set = (key) => (val) => setInputs(p => ({ ...p, [key]: val }));

  // ─── Cálculos ────────────────────────────────────────────────────────────
  const R = useMemo(() => {
    const {
      costo, precio, envio, cpa, pedidos,
      pctConfirmados, pctEntregados, recupera
    } = inputs;

    const DROPI_PCT = 0.025;
    const FLETE_PERDIDA = 0.60;
    const FLETE_RECUPERADO = 0.40;

    const confirmados = pedidos * (pctConfirmados / 100);
    const entregados = confirmados * (pctEntregados / 100);
    const devoluciones = confirmados - entregados;
    const noConfirmados = pedidos - confirmados;

    const dropi = precio * DROPI_PCT;
    const gananciaXPedido = precio - costo - envio - cpa - dropi;

    const ingresosBrutos = entregados * precio;
    const gananciasEntregados = entregados * gananciaXPedido;

    // Pérdidas en devoluciones
    const perdidaCPA_dev = devoluciones * cpa;
    const perdidaFlete_dev = devoluciones * envio * FLETE_PERDIDA;
    const perdidaProducto_dev = recupera ? 0 : devoluciones * costo;
    const totalPerdidaDev = perdidaCPA_dev + perdidaFlete_dev + perdidaProducto_dev;

    // Pérdidas en no confirmados (solo CPA)
    const perdidaCPA_noc = noConfirmados * cpa;

    const totalDropi = entregados * dropi;
    const totalCPA = pedidos * cpa;
    const totalEnvio = entregados * envio + devoluciones * (envio * FLETE_PERDIDA);
    const totalCosto = recupera ? entregados * costo : (entregados + devoluciones) * costo;

    const gastosTotales = totalCPA + totalEnvio + totalCosto + totalDropi;
    const gananciaNet = ingresosBrutos - gastosTotales;
    const margen = ingresosBrutos > 0 ? (gananciaNet / ingresosBrutos) * 100 : 0;

    const roas = cpa > 0 ? precio / cpa : 0;
    const roasBreakEven = gananciaXPedido !== precio ? precio / (precio - (costo + envio + dropi)) : 0;

    // ── Inversión total en ads (calculada automáticamente) ──
    const invAds = cpa * pedidos;
    const roasRealInversion = invAds > 0 ? ingresosBrutos / invAds : 0;
    const cppConfirmado = confirmados > 0 ? invAds / confirmados : 0;
    const cppEntregado  = entregados  > 0 ? invAds / entregados  : 0;
    const roiPct        = invAds > 0 ? ((gananciaNet / invAds) * 100) : 0;

    return {
      confirmados, entregados, devoluciones, noConfirmados,
      dropi, gananciaXPedido,
      ingresosBrutos, gananciasEntregados,
      perdidaCPA_dev, perdidaFlete_dev, perdidaProducto_dev, totalPerdidaDev,
      perdidaCPA_noc,
      totalDropi, totalCPA, totalEnvio, totalCosto,
      gastosTotales, gananciaNet, margen,
      roas, roasBreakEven,
      fleteRecuperado: devoluciones * envio * FLETE_RECUPERADO,
      // ads investment
      invAds, roasRealInversion, cppConfirmado, cppEntregado, roiPct,
    };
  }, [inputs]);

  // Chart data
  const pieData = [
    { name: "Entregados", value: Math.round(R.entregados), color: C.green },
    { name: "Devoluciones", value: Math.round(R.devoluciones), color: C.red },
    { name: "No confirmados", value: Math.round(R.noConfirmados), color: C.textMuted },
  ];

  const barData = [
    { name: "Ingresos", value: R.ingresosBrutos, color: C.green },
    { name: "Gastos", value: R.gastosTotales, color: C.red },
    { name: "Ganancia neta", value: Math.max(0, R.gananciaNet), color: C.accent },
  ];

  const areaData = [
    { name: "CPA total", value: R.totalCPA },
    { name: "Envío", value: R.totalEnvio },
    { name: "Producto", value: R.totalCosto },
    { name: "Dropi", value: R.totalDropi },
  ];

  const isProfit = R.gananciaNet >= 0;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      color: C.text,
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: `${C.surface}CC`,
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.accent}, #6366F1)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, boxShadow: `0 4px 14px ${C.accentGlow}`,
            }}>📦</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>COD Profit Calculator</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>Dropshipping LATAM</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <InfoBadge label="Dropi" value="2.5%" color={C.purple} />
            <InfoBadge label="Flete devuelto" value="40%" color={C.amber} />
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, #0A1020 100%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: "40px 24px 32px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 200,
          background: `radial-gradient(ellipse, ${C.accentGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${C.accent}12`, border: `1px solid ${C.accent}30`,
            borderRadius: 99, padding: "5px 14px", fontSize: 11, color: C.accent,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16,
          }}>
            ✦ Simulación Financiera Real · Dropshipping Contraentrega LATAM
          </div>
          <h1 style={{
            fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 900,
            letterSpacing: "-0.03em", margin: "0 0 10px",
            background: `linear-gradient(135deg, ${C.text} 30%, ${C.accent})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Calculadora Real de Rentabilidad
          </h1>
          <p style={{ fontSize: 15, color: C.textMuted, margin: 0 }}>
            Descubre si tu campaña es rentable antes de escalar. Resultados en tiempo real.
          </p>
        </motion.div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px", display: "grid", gridTemplateColumns: "min(380px, 100%) 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left Panel: Inputs ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
          style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: 24, position: "sticky", top: 76,
          }}
        >
          <SectionTitle sub="Todos los campos actualizan los resultados al instante">⚙️ Parámetros de Campaña</SectionTitle>

          <NumInput label="Costo del producto" value={inputs.costo} onChange={set("costo")} icon="📦" />
          <NumInput label="Precio de venta" value={inputs.precio} onChange={set("precio")} icon="🏷️" />
          <NumInput label="Costo de envío" value={inputs.envio} onChange={set("envio")} icon="🚚" />
          <NumInput label="CPA (Costo por adquisición)" value={inputs.cpa} onChange={set("cpa")} icon="📣" sublabel="Gasto publicitario por pedido generado" />
          <NumInput label="Total de pedidos" value={inputs.pedidos} onChange={set("pedidos")} prefix="#" icon="📋" />

          <Divider />

          <Slider
            label="Pedidos confirmados"
            sublabel="Pedidos que responden y confirman la compra"
            value={inputs.pctConfirmados}
            onChange={set("pctConfirmados")}
            color={C.accent}
          />
          <Slider
            label="Pedidos entregados"
            sublabel="Pedidos realmente entregados al cliente"
            value={inputs.pctEntregados}
            onChange={set("pctEntregados")}
            color={C.green}
          />

          <Divider />

          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            🔁 Recuperación del producto en devoluciones
          </div>
          <Toggle value={inputs.recupera} onChange={set("recupera")} />

          {/* Fixed costs info */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: `${C.purple}0A`, border: `1px solid ${C.purple}25`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Comisión Dropi</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>2.5%</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>del precio de venta</div>
            </div>
            <div style={{ background: `${C.amber}0A`, border: `1px solid ${C.amber}25`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Flete devuelto</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>40%</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>pierde el 60%</div>
            </div>
          </div>

          {/* Per order summary */}
          <div style={{ marginTop: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Ganancia por pedido entregado</div>
            {[
              { label: "Precio de venta", val: inputs.precio, sign: "+" },
              { label: "Costo producto", val: -inputs.costo, sign: "−" },
              { label: "Costo envío", val: -inputs.envio, sign: "−" },
              { label: "CPA", val: -inputs.cpa, sign: "−" },
              { label: "Comisión Dropi (2.5%)", val: -(inputs.precio * 0.025), sign: "−" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5, color: row.val >= 0 ? C.green : C.textDim }}>
                <span>{row.sign} {row.label}</span>
                <span style={{ fontWeight: 700 }}>{fmt(Math.abs(row.val))}</span>
              </div>
            ))}
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: R.gananciaXPedido >= 0 ? C.green : C.red }}>
              <span>= Ganancia neta</span>
              <span>{fmt(R.gananciaXPedido)}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Right Panel: Results ── */}
        <div>

          {/* Flujo de pedidos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <SectionTitle sub="Embudo real de conversión de tu campaña">📊 Flujo de Pedidos</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
              <MetricCard icon="📋" label="Pedidos totales" value={fmtNum(inputs.pedidos)} color={C.accent} />
              <MetricCard icon="✅" label="Pedidos confirmados" value={fmtNum(R.confirmados)} sub={`${inputs.pctConfirmados}% del total`} color={C.accent} />
              <MetricCard icon="📬" label="Pedidos entregados" value={fmtNum(R.entregados)} sub={`${inputs.pctEntregados}% de confirmados`} color={C.green} />
              <MetricCard icon="↩️" label="Devoluciones" value={fmtNum(R.devoluciones)} sub={`${(100 - inputs.pctEntregados).toFixed(0)}% de confirmados`} color={C.red} negative />
            </div>
          </motion.div>

          {/* Resultados financieros */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <SectionTitle sub="Resumen económico completo de la campaña">💰 Resultados Financieros</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 12 }}>
              <MetricCard icon="📈" label="Ingresos totales" value={fmt(R.ingresosBrutos)} color={C.green} />
              <MetricCard icon="📉" label="Gastos totales" value={fmt(R.gastosTotales)} color={C.red} negative />
            </div>
            <div style={{ marginBottom: 24 }}>
              <motion.div
                style={{
                  background: isProfit ? `${C.green}0C` : `${C.red}0C`,
                  border: `1.5px solid ${isProfit ? C.green : C.red}40`,
                  borderRadius: 16, padding: 24,
                  display: "grid", gridTemplateColumns: "1fr auto",
                  alignItems: "center", gap: 16,
                }}
                animate={{ borderColor: isProfit ? `${C.green}60` : `${C.red}60` }}
              >
                <div>
                  <div style={{ fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    {isProfit ? "✦ Ganancia neta total" : "⚠ Pérdida neta total"}
                  </div>
                  <div style={{
                    fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em",
                    color: isProfit ? C.green : C.red,
                    textShadow: `0 0 30px ${isProfit ? C.greenGlow : C.redGlow}`,
                  }}>
                    {isProfit ? "" : "−"}{fmt(R.gananciaNet)}
                  </div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
                    Margen: <span style={{ fontWeight: 700, color: isProfit ? C.green : C.red }}>{fmtPct(R.margen)}</span>
                  </div>
                </div>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: isProfit ? `${C.green}15` : `${C.red}15`,
                  border: `2px solid ${isProfit ? C.green : C.red}40`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                }}>
                  {isProfit ? "🚀" : "⚠️"}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* KPIs adicionales */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <SectionTitle sub="Métricas clave para escalar o pausar">📐 KPIs de Campaña</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
              <MetricCard icon="🎯" label="ROAS actual" value={`${R.roas.toFixed(2)}x`} color={C.accent} sub="Precio de venta / CPA" />
              <MetricCard icon="⚖️" label="ROAS Break Even" value={`${R.roasBreakEven.toFixed(2)}x`} color={C.amber} sub="Mínimo para no perder" />
              <MetricCard icon="💸" label="Pérdidas por devoluciones" value={fmt(R.totalPerdidaDev)} color={C.red} negative />
              <MetricCard icon="🏢" label="Comisión total Dropi" value={fmt(R.totalDropi)} color={C.purple} />
              <MetricCard icon="📣" label="Dinero perdido en ads" value={fmt(R.perdidaCPA_dev + R.perdidaCPA_noc)} color={C.red} negative />
              <MetricCard icon="🚚" label="Dinero perdido en logística" value={fmt(R.perdidaFlete_dev)} color={C.amber} negative />
            </div>
          </motion.div>

          {/* ── Total invertido en Ads (calculado automáticamente) ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}>
            <SectionTitle sub="Calculado automáticamente según tu CPA y total de pedidos">💰 Total Invertido en Ads</SectionTitle>
            <div style={{
              background: `linear-gradient(135deg, ${C.accent}10 0%, ${C.purple}08 100%)`,
              border: `1.5px solid ${C.accent}35`,
              borderRadius: 18, padding: 24, marginBottom: 24,
              display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 20,
            }}>
              <div>
                <div style={{ fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>
                  📣 CPA ${inputs.cpa} × {fmtNum(inputs.pedidos)} pedidos
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: C.accent, letterSpacing: "-0.03em", lineHeight: 1, textShadow: `0 0 30px ${C.accentGlow}` }}>
                  {fmt(R.invAds)}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>
                  invertidos en publicidad para generar estos pedidos
                </div>
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: `${C.accent}15`, border: `2px solid ${C.accent}40`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              }}>💸</div>
            </div>
          </motion.div>

          {/* Desglose de pérdidas */}
          {R.totalPerdidaDev > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
              <div style={{ background: `${C.red}06`, border: `1px solid ${C.red}20`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 14 }}>⚠️ Desglose de pérdidas en devoluciones</div>
                {[
                  { label: `CPA perdido (${fmtNum(R.devoluciones)} dev. × $${inputs.cpa})`, value: R.perdidaCPA_dev },
                  { label: `60% del flete perdido (${fmtNum(R.devoluciones)} dev.)`, value: R.perdidaFlete_dev },
                  ...(!inputs.recupera ? [{ label: `Producto no recuperado (${fmtNum(R.devoluciones)} unidades)`, value: R.perdidaProducto_dev }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: i < 2 - (inputs.recupera ? 0 : -1) ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ color: C.textDim }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: C.red }}>−{fmt(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: C.red, marginTop: 6 }}>
                  <span>Total pérdidas</span>
                  <span>−{fmt(R.totalPerdidaDev)}</span>
                </div>
                {inputs.recupera && (
                  <div style={{ marginTop: 10, fontSize: 12, color: C.green, background: `${C.green}0A`, borderRadius: 8, padding: "6px 10px" }}>
                    ✓ Recuperas el flete: <strong>{fmt(R.fleteRecuperado)}</strong> (40% del envío en {fmtNum(R.devoluciones)} devoluciones)
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Gráficos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <SectionTitle sub="Visualización de los resultados de tu campaña">📉 Análisis Visual</SectionTitle>

            {/* Pie + Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Pie */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 16 }}>Entregados vs Devoluciones</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: C.textDim, fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 16 }}>Ingresos vs Gastos</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 16 }}>Desglose de gastos totales</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={areaData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={C.red} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Simulación banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
            style={{
              background: `linear-gradient(135deg, ${C.accent}14 0%, ${C.purple}0A 100%)`,
              border: `1px solid ${C.accent}30`,
              borderRadius: 20, padding: 28, marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              ✦ Simulación Financiera Real · Dropshipping Contraentrega LATAM
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 10 }}>
              Esta herramienta simula el escenario real de tus campañas COD
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
              En el modelo contraentrega de Ecuador y Colombia, el verdadero margen no depende solo del precio de venta. 
              Depende de tu tasa de confirmación, tu tasa de entrega, tu CPA, y cuánto pierdes en cada devolución. 
              Esta calculadora modela todos esos factores para darte el número real.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Tasa de confirmación", val: `${inputs.pctConfirmados}%` },
                { label: "Tasa de entrega", val: `${inputs.pctEntregados}%` },
                { label: "Ganancia/pedido", val: fmt(R.gananciaXPedido) },
                { label: "ROAS BE", val: `${R.roasBreakEven.toFixed(2)}x` },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: `${C.accent}0F`, border: `1px solid ${C.accent}20`,
                  borderRadius: 8, padding: "6px 12px", fontSize: 12,
                }}>
                  <span style={{ color: C.textMuted }}>{kpi.label}: </span>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{kpi.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          COD Profit Calculator · Dropshipping LATAM · Todos los cálculos en tiempo real
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: min(380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
