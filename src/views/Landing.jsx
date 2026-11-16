import { motion } from "framer-motion";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { UserMenu } from "../components/Shell";
import { FAQItem } from "../components/shared";
import { Brand, Ic, Logo } from "../components/ui";
import { makeFmt, useCalcPure } from "../lib/calc";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";


// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export function HeroPreview() {
  const rows = [
    { l: "Ingresos por ventas", v: "$1.754,51", w: 100, c: C.green },
    { l: "Publicidad (CPA)", v: "−$400,00", w: 23, c: C.amber },
    { l: "Envío perdido en devoluciones", v: "−$78,75", w: 6, c: C.red },
    { l: "Comisión de Dropi", v: "−$43,86", w: 4, c: C.purple },
    { l: "Ganancia neta", v: "$598,15", w: 34, c: C.accent },
  ];
  return (
    <div style={{ position: "relative" }}>
            <div aria-hidden="true" style={{ position: "relative", background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: 22, boxShadow: "0 40px 90px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim }}>Campaña de ejemplo</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.green, background: `${C.green}14`, border: `1px solid ${C.green}30`, borderRadius: 99, padding: "3px 10px" }}>Seguro · 92/100</div>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Ganancia neta</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: C.green }}>$598,15</div>
          <div style={{ fontSize: 13, color: C.textDim }}>margen 34,1%</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
          {[["Confirmados", "75"], ["Entregados", "49"], ["Devueltos", "26"]].map(([l, v]) => (
            <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        {rows.map(r => (
          <div key={r.l} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: C.textDim }}>{r.l}</span><span style={{ color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{r.v}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: C.border }}><div style={{ width: `${r.w}%`, height: "100%", borderRadius: 99, background: r.c }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function Landing({ onOpenFree, onOpenPro, onStartTrial, onUpgrade }) {
  const { user } = useAuth();
  const cpaEx = (() => { const inp = { costo: 8, precio: 35.99, envio: 5, cpa: 4, pedidos: 100, pctConfirmados: 75, pctEntregados: 65, recupera: true }; return { cpa: inp.cpa, r: useCalcPure(inp), f: makeFmt("$") }; })();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.surface}EE`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Brand onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} size={30} />
          <div className="hide-mobile" style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <a href="#nosotros" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Quiénes somos</a>
            <a href="#precios" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>Precios</a>
            <a href="#faq" style={{ fontSize: 13, color: C.textDim, textDecoration: "none" }}>FAQ</a>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!user && <button className="hide-mobile" onClick={onOpenPro} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 16px", color: C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ver PRO</button>}
            <motion.button onClick={user ? () => navTo("panel") : onOpenFree} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: C.text, border: "none", borderRadius: 9, padding: "8px 16px", color: C.bg, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{user ? "Ir a mi panel" : "Abrir calculadora"}</motion.button>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "76px 20px 56px" }}>
        <div className="hero-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.02fr) minmax(0,1fr)", gap: 56, alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", fontWeight: 700, letterSpacing: "-0.035em", margin: "0 0 20px", lineHeight: 1.06 }}>
              Deja de perder dinero en campañas que parecen rentables y no lo son
            </h1>
            <p style={{ fontSize: 16, color: C.textDim, maxWidth: 500, margin: "0 0 32px", lineHeight: 1.7 }}>
              Calcula tu ganancia real con envío, CPA y devoluciones incluidos.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {user ? (
                <button onClick={() => navTo("panel")} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px 24px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ir a mi panel</button>
              ) : (<>
              <button onClick={onStartTrial} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px 24px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Probar PRO gratis 3 días
              </button>
              <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "13px 24px", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Usar la versión gratis
              </button>
              </>)}
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: C.textMuted }}>
              <span><Ic n="✓" /> Calculadora gratis sin registro</span><span><Ic n="✓" /> Cancela cuando quieras</span><span><Ic n="✓" /> 16 monedas de LATAM</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* CPA real */}
      <section style={{ padding: "48px 20px 104px" }}>
        <div className="hero-grid cpa-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 72, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.12 }}>Tu Ads Manager dice $4. Tu CPA real es $8,21.</h2>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.75, margin: "0 0 24px", maxWidth: 480 }}>En contraentrega solo cuentan los pedidos que se entregan. Lo que gastas en los demás lo pagan los que sí llegan.</p>
            <button onClick={onOpenFree} style={{ background: C.text, border: "none", borderRadius: 10, padding: "12px 22px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Calcular mi CPA real</button>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, marginBottom: 18 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 6 }}>Lo que ves en Ads Manager</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>{cpaEx.f(cpaEx.cpa)}</div>
              </div>
              <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>Tu CPA real</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: C.red }}>{cpaEx.f(cpaEx.r.cpaReal)}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 12, fontSize: 13 }}>
              <span style={{ color: C.textDim }}>CPA máximo para no perder</span><b>{cpaEx.f(cpaEx.r.cpaMax)}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Costos incluidos */}
      <section style={{ padding: "16px 20px 104px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
            <h2 style={{ fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1.15 }}>Cada costo que se come tu ganancia, ya incluido</h2>
            <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.7, margin: 0 }}>Casi todos calculan solo precio menos costo del producto. Cuadre descuenta todo lo que de verdad sale de tu bolsillo y te dice si ganas o pierdes.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {[
              { i: "truck", t: "Costo de envío", d: "El flete de cada pedido entregado y lo que pierdes en cada devolución, ya descontados de tu ganancia." },
              { i: "megaphone", t: "CPA de publicidad", d: "Tu CPA real y el máximo que puedes pagar sin perder, contando lo que gastas en pedidos que no se entregan." },
              { i: "undo", t: "Confirmaciones y devoluciones", d: "Cuántos pedidos se confirman, cuántos llegan de verdad y cuánto te cuesta cada devolución." },
              { i: "building", t: "Comisiones de plataforma", d: "Lo que cobra la plataforma, como Dropi, por cada pedido entregado, descontado de tu ganancia real." },
            ].map(x => (
              <div key={x.t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 18 }}><Ic n={x.i} size={19} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{x.t}</div>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.65 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Pro comparison */}
      <section id="precios" style={{ padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Elige tu nivel</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>Gratis para calcular. PRO para escalar y ganar más.</div>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Free */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "26px 22px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>Gratis</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>$0</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Para siempre</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Calcula si tu campaña es rentable. Rápido y simple.</div>
              {["Calculadora completa", "16 monedas LATAM", "Score de salud básico", "1 gráfico de pedidos", "Resultados principales"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textDim, marginBottom: 7 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}><Ic n="✓" /></span>{f}
                </div>
              ))}
              <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
              {["Benchmarks LATAM", "Simulador de escalado", "Pérdida Invisible", "Asesor IA", "Escenarios", "Comparador A/B", "PDF profesional", "Simulaciones guardadas"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textMuted, marginBottom: 6, opacity: 0.5 }}>
                  <span style={{ color: C.textMuted }}><Ic n="✗" /></span>{f}
                </div>
              ))}
              <button onClick={onOpenFree} style={{ width: "100%", marginTop: 16, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px", color: C.textDim, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            </div>

            {/* Pro */}
            <div style={{ background: C.card, border: `1px solid ${C.gold}60`, borderRadius: 14, padding: "26px 22px", position: "relative" }}>
              <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.gold, borderRadius: 99, padding: "3px 14px", fontSize: 10, color: C.bg, fontWeight: 800, whiteSpace: "nowrap" }}>Recomendado</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>PRO</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>$5.99</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>por mes · cancela cuando quieras</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18, lineHeight: 1.5 }}>Sistema operativo de dropshipping COD. Escala, optimiza y toma decisiones profesionales.</div>
              {[
                "Todo lo del plan gratis",
                "Salud y riesgo detallado",
                "Benchmarks LATAM reales",
                "Pérdida Invisible calculada",
                "Simulador de 3 escenarios",
                "Escalado proyectado",
                "Centro de optimización",
                "Comparador A/B de productos",
                "Consultor IA ilimitado",
                "Predictor de quiebre",
                "PDF profesional",
                "Simulaciones ilimitadas",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: i === 0 ? C.textDim : C.text, marginBottom: 7 }}>
                  <span style={{ color: C.gold, fontWeight: 700 }}><Ic n="✓" /></span>{f}
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                <button onClick={onStartTrial} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "12px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  <Ic n="🎁" /> Probar PRO gratis 3 días
                </button>
                <button onClick={onUpgrade} style={{ background: "transparent", border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "10px", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Activar PRO — $5.99/mes
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
            <div style={{ fontSize: "clamp(24px,3.4vw,38px)", fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Nació de perder dinero real.<br />
              <span style={{ color: C.gold }}>Se construyó para que tú no lo pierdas.</span>
            </div>
          </div>
          <div style={{ margin: "0 auto 44px" }}>
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: C.textDim, marginBottom: 16 }}>Lo que aprendimos a las malas</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {[
                { stat: "40%", desc: "de dropshippers en LATAM pierden dinero en su primera campaña sin saberlo" },
                { stat: "2–3x", desc: "es la diferencia entre el margen estimado y el real al incluir devoluciones" },
                { stat: "$800+", desc: "es el promedio que un dropshipper pierde antes de entender el COD real" },
              ].map((item, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 22px 20px", textAlign: "left" }}>
                  <div style={{ fontSize: 38, fontWeight: 700, color: C.text, letterSpacing: "-0.035em", lineHeight: 1, marginBottom: 12 }}>{item.stat}</div>
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
                <div style={{ fontSize: 10, color: m.color, fontWeight: 600, marginBottom: 7 }}>{m.role}</div>
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
            <div style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, color: C.text }}>Preguntas frecuentes</div>
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
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", background: C.card, border: `1px solid ${C.gold}25`, borderRadius: 22, padding: "40px 24px" }}>
          <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", marginBottom: 10 }}>¿Tu campaña es rentable de verdad?</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 22, lineHeight: 1.7 }}>Descúbrelo en 30 segundos con la calculadora gratis, sin registro.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onOpenFree} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 22px", color: C.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Usar gratis</button>
            <motion.button onClick={onStartTrial} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: C.gold, border: "none", borderRadius: 12, padding: "12px 22px", color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              <Ic n="⭐" /> Probar PRO gratis 3 días
            </motion.button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "44px 20px 26px", marginTop: 20 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "28px 24px" }}>
            <div style={{ gridColumn: "span 2", minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                <Logo size={26} />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Cuadre</div>
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, maxWidth: 320 }}>Calcula tu ganancia real en contraentrega: CPA real, devoluciones y costos que Ads Manager no te muestra.</div>
            </div>
            {[
              { t: "Producto", l: [
                { k: "Calculadora gratis", f: () => (user ? navTo("calc") : onOpenFree()) },
                { k: "Precios", h: "#precios" },
                { k: "Preguntas frecuentes", h: "#faq" },
              ] },
              { t: "Empresa", l: [
                { k: "Quiénes somos", h: "#nosotros" },
                { k: "Contacto", h: `mailto:${SUPPORT_EMAIL}` },
              ] },
              { t: "Legal", l: [
                { k: "Términos", h: "/terminos", f: () => openLegal("terms") },
                { k: "Privacidad", h: "/privacidad", f: () => openLegal("privacy") },
                { k: "Reembolsos", h: "/reembolsos", f: () => openLegal("refund") },
              ] },
            ].map(col => (
              <div key={col.t}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>{col.t}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {col.l.map(x => (
                    <a key={x.k} href={x.h || "#"} onClick={x.f ? (e) => { e.preventDefault(); x.f(); } : undefined} style={{ fontSize: 13, color: C.textMuted, textDecoration: "none" }}>{x.k}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 36, paddingTop: 18, borderTop: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, fontSize: 12, color: C.textMuted }}>
            <span>© 2026 Cuadre · Dereck Calle · Hecho en Ecuador para LATAM</span>
            <span>Pagos seguros con Paddle</span>
          </div>
        </div>
      </footer>
      <GlobalStyles />
    </div>
  );
}
