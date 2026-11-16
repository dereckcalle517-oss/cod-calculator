import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../theme";
import { Ic, Rich } from "../components/ui";


// ─── AI TAB ───────────────────────────────────────────────────────────────────
export function AITab({ inputs, R, currency, fmt, health, risk }) {
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
