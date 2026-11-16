import { motion } from "framer-motion";
import { C } from "../theme";
import { ShareButton } from "../components/Share";
import { Ic } from "../components/ui";
import { CPA_LEVELS, fmtPct, useCalcPure } from "../lib/calc";


export function CpaCard({ R, inputs, fmt }) {
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


export function CpaTab({ inputs, R, fmt }) {
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
