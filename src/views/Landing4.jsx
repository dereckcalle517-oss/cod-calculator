import { useEffect, useMemo } from "react";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { FAQItem } from "../components/shared";
import { Brand } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";
import { optimizeCash, startOfToday } from "../lib/cashflow";
import { LiveLedger, WeekBars } from "./Landing1";

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
    const first = optimizeCash(i, 5, 3, 10, today);
    const plan = optimizeCash({ ...i, banco: first.hoy.banco, dropi: first.hoy.dropi }, 5, 3, 10, today);
    return { plan, today };
  }, []);
}

const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function Landing4({ onOpenFree, onStartTrial, onUpgrade, onHome }) {
  const { user } = useAuth();
  const { plan, today } = usePlan();

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
    { t: "Calculadora", d: "¿Este producto deja ganancia?" },
    { t: "Seguimiento", d: "¿Cómo va mi campaña hoy?" },
    { t: "Planificador de ads", d: "¿Cuánto invierto y dónde dejo el dinero?" },
    { t: "Control financiero", d: "¿A dónde se fue mi capital?" },
  ];
  const free = ["Calculadora de ganancia real", "CPA real y CPA máximo", "Sin registro para probarla"];
  const pro = ["Todo lo del plan gratis", "Seguimiento diario de campañas", "Planificador de ads y optimización del dinero", "Control financiero", "Simulador de escenarios", "Benchmarks LATAM"];
  const faqs = [
    { q: "¿Se conecta con Dropi o con mis cuentas?", a: "No. Hoy trabajas con los números que tú escribes. No hay integraciones automáticas." },
    { q: "¿Cómo funciona la prueba de 3 días?", a: "Tienes acceso a las funciones PRO durante 3 días. Al terminar vuelves al plan gratis si no te suscribes." },
    { q: "¿Cuánto cuesta y cómo cancelo?", a: "PRO cuesta $5.99 al mes (precio de lanzamiento). Se cancela cuando quieras desde Ajustes. Mira las condiciones en Términos y Reembolsos." },
    { q: "¿Para qué países sirve?", a: "Para operaciones contraentrega en LATAM. Soporta 16 monedas, entre ellas USD y COP, y los plazos de entrega y cobro los ajustas a tu caso." },
    { q: "¿Me garantiza resultados?", a: "No. Cuadre hace cuentas con tus supuestos y te muestra qué pasaría. Si tus tasas reales cambian, el resultado cambia." },
  ];

  const fmt = (r) => { const dt = new Date(today); dt.setDate(dt.getDate() + r.t); return `${DIAS[dt.getDay()]} ${dt.getDate()} ${MESES[dt.getMonth()]}`; };
  const rows = plan.rows.slice(0, 8);
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
        .l4-three{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
        .l4-tbl{overflow-x:auto}
        .l4-b:focus-visible{outline:2px solid ${C.gold};outline-offset:3px}
        @media(max-width:860px){.l4-hero,.l4-two{grid-template-columns:1fr;gap:40px}.l4-cycle,.l4-three{grid-template-columns:1fr}.l4-tools{grid-template-columns:1fr 1fr}}
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
          <LiveLedger />
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
        <div style={{ marginTop: 56 }}><WeekBars /></div>
      </section>

      {/* 3. SOLUCIÓN */}
      <section style={sec} aria-labelledby="l4-solucion">
        <h2 id="l4-solucion" style={{ ...h2, maxWidth: 760 }}>Cuadre responde las tres preguntas que frenan tu campaña.</h2>
        <div style={{ marginTop: 40 }}>
          {decisions.map((x) => (
            <div key={x.q} className="l4-two" style={{ gap: 24, padding: "26px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>{x.q}</div>
              <div style={{ fontSize: 17, color: C.textDim, lineHeight: 1.6 }}>{x.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRODUCTO */}
      <section style={sec} aria-labelledby="l4-producto">
        <h2 id="l4-producto" style={{ ...h2, maxWidth: 760 }}>Un plan día por día, en tu banco y en Dropi.</h2>
        <p style={lead}>El planificador te dice con cuánto empezar en cada cuenta y qué pasa cada día: cuánto gastas, cuántos pedidos se entregan y cuándo te pagan.</p>
        <div style={{ marginTop: 40, background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: "24px 24px 18px" }}>
          <div style={{ display: "flex", gap: "10px 40px", flexWrap: "wrap", marginBottom: 22 }}>
            <div><div style={{ fontSize: 13, color: C.textMuted }}>Empieza con en el banco</div><div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: C.gold }}>{d0(plan.hoy.banco)}</div></div>
            <div><div style={{ fontSize: 13, color: C.textMuted }}>Empieza con en Dropi</div><div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: C.gold }}>{d0(plan.hoy.dropi)}</div></div>
          </div>
          <div className="l4-tbl">
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={{ ...th, textAlign: "left", paddingLeft: 0 }}>Día</th><th style={th}>Ads</th><th style={th}>Envíos</th><th style={th}>Pedidos entregados</th><th style={th}>Te pagan</th><th style={th}>Banco</th><th style={th}>Dropi</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.t}>
                    <td style={{ ...td, textAlign: "left", paddingLeft: 0, color: C.textDim }}>{fmt(r)}</td>
                    <td style={td}>{d0(r.ads)}</td>
                    <td style={td}>{d0(r.ship)}</td>
                    <td style={td}>{r.entN}</td>
                    <td style={{ ...td, color: r.pay > 0 ? C.green : C.textMuted, fontWeight: r.pay > 0 ? 700 : 400 }}>{r.pay > 0 ? d0(r.pay) : "–"}</td>
                    <td style={td}>{d0(r.bank)}</td>
                    <td style={td}>{d0(r.wallet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 14, lineHeight: 1.55 }}>
            Ejemplo con números de demostración: $25 al día en ads, CPA $3, precio $35.99, $700 de capital, 75% de confirmación y 65% de entrega. Calculado con el mismo motor de la herramienta. Son estimaciones, no garantías.
          </div>
        </div>
      </section>

      {/* 5. ECOSISTEMA */}
      <section style={sec} aria-labelledby="l4-eco">
        <h2 id="l4-eco" style={{ ...h2, maxWidth: 760 }}>No es una calculadora. Es el ciclo completo de tu operación.</h2>
        <p style={lead}>Cada herramienta alimenta a la siguiente: decides con la calculadora, controlas el día a día, planificas el dinero y revisas tu capital.</p>
        <div className="l4-tools" style={{ marginTop: 40, borderTop: `1px solid ${C.borderBright}` }}>
          {tools.map((x, n) => (
            <div key={x.t} style={{ padding: "22px 20px 22px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{n + 1}</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6 }}>{x.t}</div>
              <div style={{ fontSize: 15, color: C.textDim, marginTop: 6, lineHeight: 1.45 }}>{x.d}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 15, color: C.textMuted, margin: "18px 0 0" }}>Además: simulador de escenarios y benchmarks LATAM.</p>
      </section>

      {/* 6. PLANES */}
      <section style={sec} aria-labelledby="l4-planes">
        <h2 id="l4-planes" style={h2}>Empieza gratis. Pasa a PRO cuando necesites planificar.</h2>
        <div className="l4-two" style={{ marginTop: 44, gap: 24 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Gratis</div>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", marginTop: 10 }}>$0</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "22px 0 0", display: "flex", flexDirection: "column", gap: 12, color: C.textDim, fontSize: 16 }}>
              {free.map((x) => <li key={x} style={{ display: "flex", gap: 10 }}><Check />{x}</li>)}
            </ul>
            <button className="l4-b" onClick={onOpenFree} style={{ ...ghost, width: "100%", marginTop: 26 }}>Usar calculadora gratis</button>
          </div>
          <div style={{ border: `1px solid ${C.gold}`, borderRadius: 16, padding: 28, background: C.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>PRO</span>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>Precio de lanzamiento</span>
            </div>
            <div style={{ marginTop: 10 }}><span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em" }}>$5.99</span> <span style={{ fontSize: 15, color: C.textMuted }}>al mes</span></div>
            <ul style={{ listStyle: "none", padding: 0, margin: "22px 0 0", display: "flex", flexDirection: "column", gap: 12, color: C.textDim, fontSize: 16 }}>
              {pro.map((x) => <li key={x} style={{ display: "flex", gap: 10 }}><span style={{ color: C.gold, display: "flex" }}><Check /></span>{x}</li>)}
            </ul>
            <button className="l4-b" onClick={onStartTrial} style={{ ...gold, width: "100%", marginTop: 26 }}>Probar gratis 3 días</button>
            <button className="l4-b" onClick={onUpgrade} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%", marginTop: 10 }}>Activar PRO ahora</button>
          </div>
        </div>
      </section>

      {/* 7. CONFIANZA */}
      <section style={sec} aria-labelledby="l4-confianza">
        <h2 id="l4-confianza" style={h2}>Qué es Cuadre, y qué no.</h2>
        <div className="l4-three" style={{ marginTop: 40 }}>
          {[
            ["Es para", "Quien vende por contraentrega en LATAM con Dropi, Shopify y anuncios en TikTok o Meta, y quiere decidir con números."],
            ["Hace", "Cálculos con tus datos: ganancia real, CPA máximo, cuánto invertir y cuánto dejar en cada cuenta, con la lógica visible."],
            ["No hace", "No se conecta solo a tus cuentas, no mueve tu dinero y no promete resultados. Los números dependen de los datos que escribes."],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{t}</div>
              <p style={{ fontSize: 16, color: C.textDim, lineHeight: 1.6, margin: "10px 0 0" }}>{d}</p>
            </div>
          ))}
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
