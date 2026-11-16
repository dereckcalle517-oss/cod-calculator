import { useState } from "react";
import { C } from "../theme";
import { Ic, LOGO_D } from "./ui";
import { refUrlFor, useMyRefCode } from "../lib/referral";


// ─── COMPARTIR RESULTADO (imagen) ──────────────────────────────────
export async function buildShareImage({ R, inputs, fmt, url }) {
  try { await document.fonts.ready; } catch {}
  const W = 1080, H = 1080, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), F = "'InterVariable', 'Inter', system-ui, sans-serif";
  const rr = (X, Y, w, h, r, fill, stroke) => { x.beginPath(); x.roundRect(X, Y, w, h, r); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 2; x.stroke(); } };
  const t = (txt, X, Y, size, color, weight = 700, align = "left") => { x.font = `${weight} ${size}px ${F}`; x.fillStyle = color; x.textAlign = align; x.fillText(txt, X, Y); };
  x.fillStyle = "#0B0B0C"; x.fillRect(0, 0, W, H);
  rr(60, 60, 960, 960, 36, "#121214", "#2A2A2E");
  x.save(); x.translate(110, 106); x.scale(0.56, 0.56); x.fillStyle = "#F5F5F5"; x.fill(new Path2D(LOGO_D)); x.restore();
  t("Cuadre", 184, 148, 34, "#F5F5F5", 800);
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


export function ShareButton({ R, inputs, fmt, style }) {
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
