import { useEffect, useMemo } from "react";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { FAQItem } from "../components/shared";
import { Brand } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";
import { optimizeCash, scenario, startOfToday } from "../lib/cashflow";
import { LiveLedger } from "./Landing1";

// ─── LANDING 4 ────────────────────────────────────────────────────────────────
// Rediseño estratégico: de "calculadora" a "control financiero para COD".
// Orden: promesa → ciclo del dinero (problema) → decisiones que resuelve → producto real →
// ecosistema → planes → confianza → preguntas → cierre.
// Todas las cifras de ejemplo salen del mismo motor de la herramienta (src/lib/cashflow.js) y se rotulan como ejemplo.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const d0 = (n) => `$${Math.round(n)}`;
const BASE = { costo: 8, envio: 6, comision: 2.5, otros: 0, pctConf: 75, pctEnt: 65, entMin: 3, entMax: 5, retiro: 1, transfer: 1, deposito: 0, retiroCada: 3, enCamino: 0, envioModo: "despacho", costoModo: "liquidar" };

function usePlan() {
  return useMemo(() => {
    const today = startOfToday();
    const i = { ...BASE, adsDia: 25, cpa: 3, precio: 35.99, banco: 455, dropi: 245 };
    const first = optimizeCash(i, 5, 3, 14, today);
    const plan = optimizeCash({ ...i, banco: first.hoy.banco, dropi: first.hoy.dropi }, 5, 3, 14, today);
    const perDay = scenario(i, i.adsDia, 5).s.perDay;
    return { plan, today, perDay, capital: i.banco + i.dropi, ads: i.adsDia };
  }, []);
}


// Gráfico de líneas simple (SVG). series: [{ pts:[n], color, w }]; mark: índice del primer cobro
function Lines({ series, mark, labels, h = 200, label }) {
  const W = 560, padL = 8, padR = 8, padT = 16, padB = 26;
  const n = series[0].pts.length;
  const max = Math.max(...series.flatMap((x) => x.pts), 1);
  const X = (k) => padL + (k / (n - 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - v / max) * (h - padT - padB);
  const path = (pts) => pts.map((v, k) => `${k ? "L" : "M"}${X(k).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={label} style={{ display: "block" }}>
      {[0, 0.5, 1].map((f) => <line key={f} x1={padL} x2={W - padR} y1={Y(max * f)} y2={Y(max * f)} stroke="#222226" strokeWidth="1" />)}
      {mark != null && <><line x1={X(mark)} x2={X(mark)} y1={padT} y2={h - padB} stroke={C.green} strokeWidth="1" strokeDasharray="4 4" /><text x={X(mark) + 6} y={padT + 10} fontSize="11" fill={C.green}>Primer cobro</text></>}
      {series.map((x, k) => <path key={k} d={path(x.pts)} fill="none" stroke={x.color} strokeWidth={x.w || 2.5} strokeLinejoin="round" strokeLinecap="round" />)}
      {labels.map((t, k) => (k % 2 === 0 || n < 8) ? <text key={k} x={X(k)} y={h - 6} fontSize="11" fill="#7A7A83" textAnchor="middle">{t}</text> : null)}
    </svg>
  );
}

const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function Landing4({ onOpenFree, onStartTrial, onUpgrade, onHome }) {
  const { user } = useAuth();
  const { plan, today, perDay, capital, ads } = usePlan();

  // SEO: título y descripción propios mientras esta vista está abierta
  useEffect(() => {
    const prevTitle = document.title;
    let m = document.querySelector('meta[name="description"]');
    const created = !m;
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    const prevDesc = m.getAttribute("content");
    document.title = "Cuadre: control financiero para dropshipping contraentrega";
    m.setAttribute("content", "Calcula tu ganancia real y planifica cuánto invertir en ads y cuánto dejar en tu banco y en Dropi. Para operaciones contraentrega en LATAM.");
    return () => { document.title = prevTitle; if (created) m.remove(); else m.setAttribute("content", prevDesc || ""); };
  }, []);

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 24px" };
  const gold = { background: C.gold, border: "none", borderRadius: 10, padding: "15px 24px", color: "#0B0B0C", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const ghost = { background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "15px 24px", color: C.text, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const h2 = { fontSize: "clamp(28px,4.2vw,44px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.08, margin: 0 };
  const lead = { fontSize: 18, lineHeight: 1.6, color: C.textDim, margin: "16px 0 0", maxWidth: 620 };
  const sec = { ...wrap, padding: "104px 24px 0" };
  const legalBtn = { background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" };

  const cycle = [
    { t: "Publicidad", s: "Sale hoy", out: true },
    { t: "Pedido", s: "Se confirma", out: null },
    { t: "Envío", s: "Dropi cobra al despachar", out: true },
    { t: "Entrega", s: "Días después", out: null },
    { t: "Cobro", s: "Entra y se puede retirar", out: false },
  ];
  const decisions = [
    { q: "¿Cuánto gano de verdad?", a: "Ganancia por pedido con producto, envío, devoluciones, comisión y CPA. Y el CPA máximo que puedes pagar sin perder." },
    { q: "¿Cuánto puedo reinvertir?", a: "El monto diario que tu dinero aguanta mientras los pedidos viajan, respetando el mínimo de TikTok Ads." },
    { q: "¿Cuánto dejo en el banco y cuánto en Dropi?", a: "Cuánto reservar para envíos y cuánto para ads, para que ninguna cuenta llegue a cero antes de cobrar." },
  ];
  const tools = [
    { t: "Calculadora", d: "Conoce cuánto ganas realmente.", h: "Con envío, devoluciones, comisión y CPA, y el CPA máximo que puedes pagar." },
    { t: "Seguimiento", d: "Detecta cuándo una campaña deja de funcionar.", h: "Anota tu CPA y tus pedidos del día y mira el resultado." },
    { t: "Planificador", d: "Sabe cuánto puedes invertir mañana.", h: "Con el plan día por día y el reparto entre banco y Dropi." },
    { t: "Control financiero", d: "Conoce dónde está tu capital.", h: "Registra gastos y fondos de ads y mira tu capital mes a mes." },
    { t: "Simulador", d: "Anticipa distintos escenarios.", h: "Cambia inversión, CPA o entrega y mira qué pasaría. Incluye benchmarks LATAM de referencia." },
  ];
  const compare = [
    ["Calculadora de ganancia real", true],
    ["CPA real y CPA máximo", true],
    ["Seguimiento diario de campañas", false],
    ["Planificador de ads y reparto banco/Dropi", false],
    ["Control financiero", false],
    ["Simulador de escenarios", false],
    ["Benchmarks LATAM", false],
  ];
  const faqs = [
    { q: "¿Se conecta con Dropi o con mis cuentas?", a: "No. Hoy trabajas con los números que tú escribes. No hay integraciones automáticas." },
    { q: "¿Cómo funciona la prueba de 3 días?", a: "Tienes acceso a las funciones PRO durante 3 días. Al terminar vuelves al plan gratis si no te suscribes." },
    { q: "¿Cuánto cuesta y cómo cancelo?", a: "PRO cuesta $5.99 al mes (precio de lanzamiento). Se cancela cuando quieras desde Ajustes. Mira las condiciones en Términos y Reembolsos." },
    { q: "¿Para qué países sirve?", a: "Para operaciones contraentrega en LATAM. Soporta 16 monedas, entre ellas USD y COP, y los plazos de entrega y cobro los ajustas a tu caso." },
    { q: "¿Me garantiza resultados?", a: "No. Cuadre hace cuentas con tus supuestos y te muestra qué pasaría. Si tus tasas reales cambian, el resultado cambia." },
  ];

  const fmt = (r) => { const dt = new Date(today); dt.setDate(dt.getDate() + r.t); return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MESES[dt.getMonth()]}`; };
  const all = plan.rows.slice(0, 14);
  const rows = all.slice(0, 11);
  const liq = all.map((r) => r.bank + r.wallet);
  const labels = all.map((r) => { const dt = new Date(today); dt.setDate(dt.getDate() + r.t); return String(dt.getDate()); });
  const fp = all.findIndex((r) => r.pay > 0);
  const firstPay = fp >= 0 ? fp : null;
  const profit = all.map((_, k) => perDay * (k + 1));
  const th = { textAlign: "right", fontWeight: 600, color: C.textMuted, fontSize: 12, padding: "0 0 10px 12px", whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "11px 0 11px 12px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", borderTop: `1px solid ${C.border}` };

  return (
    <div style={{ minHeight: "100vh", background: "#09090A", fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text, fontVariantNumeric: "tabular-nums" }}>
      <GlobalStyles />
      <style>{`
        .l4-hero{display:grid;grid-template-columns:1.05fr 0.95fr;gap:56px;align-items:center}
        .l4-cycle{display:grid;grid-template-columns:repeat(5,1fr)}
        .l4-two{display:grid;grid-template-columns:1fr 1fr;gap:56px}
        .l4-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
                .l4-tbl{overflow-x:auto}
        @media(max-width:600px){.l4-hm{display:none}.l4-pt{min-width:0!important;font-size:13px!important}.l4-cmp{min-width:0!important}.l4-cmp .l4-cp{padding-left:8px!important;padding-right:8px!important}}
        .l4-b:focus-visible{outline:2px solid ${C.gold};outline-offset:3px}
        @media(max-width:860px){.l4-hero,.l4-two{grid-template-columns:1fr;gap:40px}.l4-cycle{grid-template-columns:1fr}.l4-tools{grid-template-columns:1fr 1fr}}
        @media(max-width:520px){.l4-tools{grid-template-columns:1fr}}
      `}</style>

      <div style={{ background: C.accentDim, borderBottom: `1px solid ${C.border}`, padding: "8px 20px", fontSize: 12, color: C.textDim, display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span>Vista previa: <b style={{ color: C.text }}>Landing 4</b>. La página actual no cambia.</span>
        {user && <button onClick={() => navTo("panel")} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al panel</button>}
      </div>
      <nav style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }} aria-label="Principal">
        <Brand onClick={onHome} size={30} />
        <button className="l4-b" onClick={user ? () => navTo("panel") : onOpenFree} style={{ background: "none", border: "none", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{user ? "Ir al panel" : "Usar gratis"}</button>
      </nav>

      {/* 1. HERO */}
      <header style={{ ...wrap, padding: "64px 24px 0" }}>
        <div className="l4-hero">
          <div>
            <h1 style={{ fontSize: "clamp(38px,6vw,66px)", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1.02, margin: 0 }}>
              Que tu campaña gane no significa que tu dinero alcance.
            </h1>
            <p style={lead}>
              Cuadre calcula tu ganancia real y te dice cuánto invertir y cuánto dejar en tu banco y en Dropi, para reinvertir sin quedarte sin saldo mientras esperas el cobro.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
              <button className="l4-b" onClick={onStartTrial} style={gold}>Probar PRO gratis 3 días</button>
              <button className="l4-b" onClick={onOpenFree} style={ghost}>Usar calculadora gratis</button>
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 16 }}>Para operaciones contraentrega en LATAM. La calculadora gratis no pide registro.</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: "22px 22px 14px", boxShadow: "0 40px 90px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
              {[
                ["Ganancia real por día", `$${perDay.toFixed(2)}`, C.green, "cuando todo se entrega"],
                ["Capital disponible", d0(capital), C.text, "banco + Dropi"],
                ["Inversión publicitaria", `${d0(ads)}/día`, C.text, "en ads"],
                ["Reservado para envíos", d0(plan.hoy.dropi), C.gold, "en Dropi, al empezar"],
              ].map(([l, v, c, s2]) => (
                <div key={l}>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{l}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: c, marginTop: 2 }}>{v}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{s2}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Proyección de liquidez</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>Dinero disponible en banco + Dropi</span>
              </div>
              <Lines series={[{ pts: liq, color: C.gold }]} mark={firstPay} labels={labels} h={150} label="Proyección del dinero disponible en banco y Dropi durante 14 días" />
              <div style={{ fontSize: 11, color: C.textMuted, margin: "4px 0 6px" }}>Ejemplo con números de demostración. Calculado con el motor de Cuadre.</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. PROBLEMA */}
      <section style={sec} aria-labelledby="l4-problema">
        <h2 id="l4-problema" style={{ ...h2, maxWidth: 760 }}>En contraentrega, el dinero sale primero y vuelve después.</h2>
        <p style={lead}>Pagas la publicidad hoy y Dropi cobra el envío al despachar. El cobro llega cuando el pedido se entrega. En medio, solo sale dinero, y ahí es donde un negocio con ventas se queda sin liquidez.</p>
        <div className="l4-cycle" style={{ marginTop: 48, borderTop: `1px solid ${C.borderBright}` }}>
          {cycle.map((s, n) => (
            <div key={s.t} style={{ padding: "22px 20px 0 0", borderTop: `3px solid ${s.out === true ? C.textMuted : s.out === false ? C.green : C.border}`, marginTop: -2 }}>
              <div style={{ fontSize: 13, color: C.textMuted }}>{n + 1}</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{s.t}</div>
              <div style={{ fontSize: 14, color: s.out === false ? C.green : C.textDim, marginTop: 4, lineHeight: 1.4 }}>{s.s}</div>
            </div>
          ))}
        </div>
        <div className="l4-two" style={{ marginTop: 56, gap: 40, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25 }}>Rentable en el papel. Sin saldo en la cuenta.</div>
            <p style={{ fontSize: 16, color: C.textDim, lineHeight: 1.6, margin: "12px 0 0" }}>La ganancia de tus pedidos crece cada día, pero ese dinero sigue en camino. Tu saldo real baja hasta que llega el primer cobro. Esa brecha es lo que Cuadre te ayuda a cubrir.</p>
          </div>
          <div>
            <Lines series={[{ pts: profit, color: C.green }, { pts: liq, color: C.gold }]} mark={firstPay} labels={labels} h={220} label="Ganancia esperada creciendo frente al dinero disponible que baja hasta el primer cobro" />
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: C.textDim, marginTop: 6 }}>
              <span><span style={{ display: "inline-block", width: 14, height: 3, background: C.green, marginRight: 6, verticalAlign: "middle" }} />Ganancia generada por tus pedidos</span>
              <span><span style={{ display: "inline-block", width: 14, height: 3, background: C.gold, marginRight: 6, verticalAlign: "middle" }} />Dinero disponible</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Ejemplo con números de demostración ($25/día en ads, CPA $3, $700 de capital). Estimaciones, no garantías.</div>
          </div>
        </div>
      </section>

      {/* 3. SOLUCIÓN */}
      <section style={sec} aria-labelledby="l4-solucion">
        <div className="l4-two" style={{ alignItems: "start" }}>
          <div>
            <h2 id="l4-solucion" style={h2}>Cuadre responde las tres preguntas que frenan tu campaña.</h2>
            <div style={{ marginTop: 32 }}>
              {decisions.map((x) => (
                <div key={x.q} style={{ padding: "22px 0", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>{x.q}</div>
                  <div style={{ fontSize: 16, color: C.textDim, lineHeight: 1.6, marginTop: 8 }}>{x.a}</div>
                </div>
              ))}
            </div>
          </div>
          <LiveLedger />
        </div>
      </section>

      {/* 4. PLANIFICADOR */}
      <section style={sec} aria-labelledby="l4-producto">
        <h2 id="l4-producto" style={{ ...h2, maxWidth: 820 }}>Sabes cuánto necesitas, cuánto reservar y dónde dejarlo, día por día.</h2>
        <p style={lead}>El planificador reparte tu capital entre el banco y Dropi para que cada envío tenga saldo y ninguna cuenta llegue a cero antes del cobro.</p>
        <div style={{ marginTop: 44, background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: "28px 26px 20px", boxShadow: "0 40px 90px rgba(0,0,0,0.45)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "18px 28px", marginBottom: 26 }}>
            {[
              ["Empieza con en el banco", d0(plan.hoy.banco), C.gold, "para los ads"],
              ["Empieza con en Dropi", d0(plan.hoy.dropi), C.gold, "para los envíos"],
              ["Banco nunca baja de", d0(plan.minBank), C.text, "en estos 14 días"],
              ["Dropi nunca baja de", d0(plan.minWallet), C.text, "en estos 14 días"],
            ].map(([l, v, c, s2]) => (
              <div key={l}>
                <div style={{ fontSize: 13, color: C.textMuted }}>{l}</div>
                <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.035em", color: c, marginTop: 2 }}>{v}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{s2}</div>
              </div>
            ))}
          </div>
          <div className="l4-tbl">
            <table className="l4-pt" style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={{ ...th, textAlign: "left", paddingLeft: 0 }}>Día</th><th className="l4-hm" style={th}>Ads</th><th className="l4-hm" style={th}>Envíos</th><th className="l4-hm" style={th}>Pedidos entregados</th><th style={th}>Te pagan</th><th style={th}>Banco</th><th style={th}>Dropi</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const cobro = r.t === firstPay;
                  return (
                    <tr key={r.t} style={cobro ? { background: "rgba(34,197,94,0.08)" } : undefined}>
                      <td style={{ ...td, textAlign: "left", paddingLeft: cobro ? 8 : 0, color: cobro ? C.green : C.textDim, fontWeight: cobro ? 700 : 400 }}>{fmt(r)}{cobro ? <span className="l4-hm"> · primer cobro</span> : ""}</td>
                      <td className="l4-hm" style={td}>{d0(r.ads)}</td>
                      <td className="l4-hm" style={td}>{d0(r.ship)}</td>
                      <td className="l4-hm" style={td}>{r.entN}</td>
                      <td style={{ ...td, color: r.pay > 0 ? C.green : C.textMuted, fontWeight: r.pay > 0 ? 700 : 400 }}>{r.pay > 0 ? d0(r.pay) : "–"}</td>
                      <td style={td}>{d0(r.bank)}</td>
                      <td style={{ ...td, paddingRight: cobro ? 8 : 0 }}>{d0(r.wallet)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 14, lineHeight: 1.55 }}>
            Ejemplo con números de demostración: $25 al día en ads, CPA $3, precio $35.99, $700 de capital, 75% de confirmación y 65% de entrega. Réplica de la tabla del planificador, calculada con su mismo motor. Son estimaciones, no garantías.
          </div>
        </div>
      </section>

      {/* 5. ECOSISTEMA */}
      <section style={sec} aria-labelledby="l4-eco">
        <h2 id="l4-eco" style={{ ...h2, maxWidth: 760 }}>Cinco herramientas. Una decisión mejor cada día.</h2>
        <div style={{ marginTop: 36 }}>
          {tools.map((x) => (
            <div key={x.t} className="l4-two" style={{ gap: 12, padding: "22px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{x.d}</div>
              <div style={{ fontSize: 16, color: C.textDim, lineHeight: 1.55 }}><span style={{ color: C.gold, fontWeight: 700 }}>{x.t}.</span> {x.h}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PLANES */}
      <section style={sec} aria-labelledby="l4-planes">
        <h2 id="l4-planes" style={{ ...h2, maxWidth: 800 }}>La calculadora te dice si ganas. PRO te dice si tu dinero alcanza para seguir.</h2>
        <div className="l4-tbl" style={{ marginTop: 44 }}>
          <div className="l4-cmp" style={{ minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.1fr", alignItems: "end" }}>
              <div />
              <div className="l4-cp" style={{ padding: "0 16px 20px" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Gratis</div>
                <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em" }}>$0</div>
                <button className="l4-b" onClick={onOpenFree} style={{ ...ghost, width: "100%", marginTop: 12, padding: "12px 16px", fontSize: 15 }}>Usar gratis</button>
              </div>
              <div className="l4-cp" style={{ padding: "20px 16px", background: C.card, border: `1px solid ${C.gold}`, borderBottom: "none", borderRadius: "14px 14px 0 0" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>PRO</div>
                <div><span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em" }}>$5.99</span> <span style={{ fontSize: 14, color: C.textMuted }}>al mes</span></div>
                <button className="l4-b" onClick={onStartTrial} style={{ ...gold, width: "100%", marginTop: 12, padding: "12px 16px", fontSize: 15 }}>Probar gratis</button>
              </div>
            </div>
            {compare.map(([f, g], k) => (
              <div key={f} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.1fr", alignItems: "center", borderTop: `1px solid ${C.border}` }}>
                <div style={{ padding: "14px 0", fontSize: 15, color: C.textDim }}>{f}</div>
                <div className="l4-cp" style={{ padding: "14px 16px", color: g ? C.textDim : C.textMuted, display: "flex" }}>{g ? <Check /> : "–"}</div>
                <div className="l4-cp" style={{ padding: "14px 16px", color: C.gold, display: "flex", background: C.card, borderLeft: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}`, borderBottom: k === compare.length - 1 ? `1px solid ${C.gold}` : "none", borderRadius: k === compare.length - 1 ? "0 0 14px 14px" : 0 }}><Check /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>PRO: $5.99 al mes, precio de lanzamiento. Prueba de 3 días. Cancelas cuando quieras.</div>
          <button className="l4-b" onClick={onUpgrade} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Activar PRO ahora</button>
        </div>
      </section>

      {/* 7. CONFIANZA */}
      <section style={sec} aria-labelledby="l4-confianza">
        <div className="l4-two" style={{ alignItems: "start" }}>
          <h2 id="l4-confianza" style={h2}>Diseñado para quienes venden con contraentrega.</h2>
          <div>
            <p style={{ fontSize: 18, color: C.textDim, lineHeight: 1.65, margin: 0 }}>
              Para quien vende por contraentrega en Latinoamérica con Dropi y Shopify, y paga su publicidad en TikTok o Meta. Para quien reinvierte las ganancias y necesita saber, antes de gastar, si su dinero va a alcanzar mientras los pedidos se entregan.
            </p>
            <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.6, margin: "18px 0 0" }}>
              Cuadre trabaja con los números que tú escribes. No se conecta solo a tus cuentas ni promete resultados: te muestra qué pasaría con tus supuestos.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section style={{ ...sec, maxWidth: 780 }} aria-labelledby="l4-faq">
        <h2 id="l4-faq" style={{ ...h2, fontSize: "clamp(26px,3.6vw,36px)", marginBottom: 28 }}>Preguntas frecuentes</h2>
        {faqs.map((x) => <FAQItem key={x.q} q={x.q} a={x.a} />)}
      </section>

      {/* 9. CTA FINAL */}
      <section style={{ ...sec, padding: "120px 24px 110px" }}>
        <div style={{ borderTop: `1px solid ${C.borderBright}`, paddingTop: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <h2 style={{ ...h2, maxWidth: 620 }}>Antes de gastar el próximo dólar, mira si tu dinero alcanza.</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="l4-b" onClick={onStartTrial} style={gold}>Probar PRO gratis 3 días</button>
            <button className="l4-b" onClick={onOpenFree} style={ghost}>Usar calculadora gratis</button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "26px 24px 44px" }}>
        <div style={{ ...wrap, padding: 0, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 13, color: C.textMuted }}>
          <span>© {new Date().getFullYear()} Cuadre · Dereck Calle</span>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <button onClick={() => openLegal("terms")} style={legalBtn}>Términos</button>
            <button onClick={() => openLegal("privacy")} style={legalBtn}>Privacidad</button>
            <button onClick={() => openLegal("refund")} style={legalBtn}>Reembolsos</button>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "inherit" }}>{SUPPORT_EMAIL}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
