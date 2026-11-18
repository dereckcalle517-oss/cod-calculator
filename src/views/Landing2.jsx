import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { FAQItem } from "../components/shared";
import { Brand } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";
import { LiveLedger } from "./Landing1";

// ─── LANDING 2 ────────────────────────────────────────────────────────────────
// Segunda versión alternativa: fondo negro, titular enorme centrado, demo dentro de un marco,
// pasos con círculos, lista de funciones con íconos y un solo plan. No reemplaza a Landing.jsx.

const svg = (children) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  calc: svg(<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" /></>),
  track: svg(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  plan: svg(<><path d="M3 11l16-6v14L3 13z" /><path d="M7 14v4a2 2 0 0 0 4 0v-2" /></>),
  money: svg(<><rect x="3" y="6" width="18" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 12h.01M17.5 12h.01" /></>),
  scenario: svg(<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  globe: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></>),
};

export function Landing2({ onOpenFree, onStartTrial, onUpgrade, onHome }) {
  const { user } = useAuth();
  const wrap = { maxWidth: 1040, margin: "0 auto", padding: "0 24px" };
  const muted = { color: "#8B8B92" };
  const white = { background: "#FFFFFF", color: "#0A0A0B", border: "none", borderRadius: 10, padding: "15px 26px", fontSize: 17, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
  const link = { background: "none", border: "none", color: C.text, fontSize: 17, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "15px 8px" };
  const h2 = { fontSize: "clamp(32px,5.4vw,56px)", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.06, margin: 0, textAlign: "center" };
  const kicker = { textAlign: "center", fontSize: 14, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 22 };

  const steps = [
    { t: "Escribe tus números", d: "Precio, costo, envío, CPA y el dinero que tienes en el banco y en Dropi." },
    { t: "Mira tu semana", d: "Cuadre pone cada día en una tabla: qué sale, qué entra y en qué cuenta debe estar el dinero." },
    { t: "Invierte con un plan", d: "Sabes cuánto invertir en ads y cuánto dejar en cada lado para que el anuncio no se frene." },
  ];
  const feats = [
    { i: "calc", t: "Calculadora", d: "Tu ganancia real con envío, devoluciones, comisión y CPA. Te muestra hasta cuánto puedes pagar por pedido." },
    { i: "track", t: "Seguimiento", d: "Anota tu CPA y tus pedidos del día. Cuadre calcula el resultado y te avisa si algo anda mal." },
    { i: "plan", t: "Planificador de ads", d: "Cuánto invertir cada día, con el mínimo de TikTok Ads y el plan día por día." },
    { i: "money", t: "Optimización del dinero", d: "Cuánto dejar en tu banco y cuánto en Dropi, para no quedarte sin fondos de envío." },
    { i: "scenario", t: "Control financiero", d: "Registra gastos y fondos de ads y mira tu capital mes a mes." },
    { i: "globe", t: "Para LATAM", d: "16 monedas, entre ellas USD y COP. Ajustas los plazos de entrega y cobro a tu operación." },
  ];
  const plan = ["Calculadora de ganancia real", "Seguimiento diario de campañas", "Planificador de ads: banco y Dropi", "Control financiero", "Simulador de escenarios", "Benchmarks LATAM y consultor IA"];
  const faqs = [
    { q: "¿Cómo funciona la prueba de 3 días?", a: "Tienes acceso completo a las funciones PRO durante 3 días sin pagar. Al terminar vuelves al plan gratis." },
    { q: "¿Esto me garantiza resultados?", a: "No. Cuadre hace cuentas con los números que tú escribes y te muestra qué pasaría. Si tus tasas reales cambian, el resultado cambia." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. PRO es mensual y se cancela desde Ajustes. Mira las condiciones en Términos y Reembolsos." },
  ];
  const legalBtn = { background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text }}>
      <GlobalStyles />
      <style>{`
        .l2-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
        .l2-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:56px 40px}
        @media(max-width:760px){.l2-steps,.l2-feats{grid-template-columns:1fr}.l2-steps{gap:48px}.l2-feats{gap:44px}}
        .l2-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
      `}</style>

      <div style={{ background: "#141416", borderBottom: "1px solid #232326", padding: "8px 20px", fontSize: 12, color: "#B0B0B8", display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span>Vista previa: <b style={{ color: C.text }}>Landing 2</b>. La página actual no cambia.</span>
        {user && <button onClick={() => navTo("panel")} style={{ background: "transparent", border: "1px solid #3A3A40", borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al panel</button>}
      </div>

      <nav style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <Brand onClick={onHome} size={30} />
        <button className="l2-btn" onClick={user ? () => navTo("panel") : onOpenFree} style={{ background: "none", border: "none", color: C.text, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{user ? "Ir al panel" : "Usar gratis"}</button>
      </nav>

      {/* HERO */}
      <header style={{ ...wrap, textAlign: "center", padding: "72px 24px 40px" }}>
        <h1 style={{ fontSize: "clamp(44px,9.5vw,92px)", fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1.02, margin: "0 auto", maxWidth: 900 }}>
          Haz las cuentas de tu contraentrega
        </h1>
        <p style={{ ...muted, fontSize: "clamp(18px,2.4vw,22px)", lineHeight: 1.55, maxWidth: 640, margin: "28px auto 0" }}>
          Calcula tu ganancia real y sabe cuánto invertir en ads y cuánto dejar en tu banco y en Dropi, para que tu campaña no se frene por falta de fondos.
        </p>

        {/* marco del demo */}
        <div style={{ margin: "56px auto 0", maxWidth: 520, textAlign: "left", background: "linear-gradient(180deg,#2A2A2E,#161618)", border: "1px solid #34343A", borderRadius: 34, padding: 14, boxShadow: "0 50px 120px rgba(0,0,0,0.7)" }}>
          <div style={{ borderRadius: 22, overflow: "hidden" }}><LiveLedger /></div>
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 44 }}>
          <button className="l2-btn" onClick={onStartTrial} style={white}>Probar PRO gratis</button>
          <button className="l2-btn" onClick={onOpenFree} style={link}>Calculadora gratis →</button>
        </div>
      </header>

      {/* COMPATIBLE */}
      <section style={{ ...wrap, textAlign: "center", padding: "90px 24px 30px" }}>
        <div style={{ ...muted, fontSize: 18 }}>Pensado para quienes venden con</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px 44px", marginTop: 34, fontSize: "clamp(22px,3.6vw,32px)", fontWeight: 600, letterSpacing: "-0.03em", color: "#C9C9CF" }}>
          <span>Dropi</span><span>Shopify</span><span>TikTok Ads</span><span>Meta Ads</span>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ ...wrap, padding: "130px 24px 40px" }}>
        <div style={kicker}>Cómo funciona</div>
        <h2 style={{ ...h2, maxWidth: 820, margin: "0 auto" }}>Tres pasos para saber cuánto invertir</h2>
        <div className="l2-steps" style={{ marginTop: 80, textAlign: "center" }}>
          {steps.map((s, n) => (
            <div key={s.t}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#1D1D20", display: "grid", placeItems: "center", margin: "0 auto 28px", fontSize: 40, fontWeight: 600 }}>{n + 1}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.t}</div>
              <p style={{ ...muted, fontSize: 17, lineHeight: 1.55, margin: "12px auto 0", maxWidth: 300 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FUNCIONES */}
      <section style={{ ...wrap, padding: "150px 24px 40px" }}>
        <h2 style={{ ...h2, maxWidth: 780, margin: "0 auto" }}>Todo lo que necesitas en un solo lugar</h2>
        <p style={{ ...muted, textAlign: "center", fontSize: 19, lineHeight: 1.55, maxWidth: 600, margin: "22px auto 0" }}>
          Desde saber si un producto deja ganancia hasta planear el dinero de cada día.
        </p>
        <div className="l2-feats" style={{ marginTop: 84 }}>
          {feats.map((f) => (
            <div key={f.t}>
              <div style={{ color: "#fff", marginBottom: 22 }}>{ICONS[f.i]}</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{f.t}</div>
              <p style={{ ...muted, fontSize: 17, lineHeight: 1.6, margin: "10px 0 0" }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRECIO */}
      <section style={{ ...wrap, padding: "150px 24px 40px", maxWidth: 560 }}>
        <h2 style={h2}>Un solo plan, todo incluido</h2>
        <p style={{ ...muted, textAlign: "center", fontSize: 18, lineHeight: 1.55, margin: "18px 0 0" }}>La calculadora básica es gratis. PRO desbloquea el resto.</p>
        <div style={{ marginTop: 56, background: "#111113", border: "1px solid #26262A", borderRadius: 24, padding: "32px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>PRO</div>
          <div style={{ ...muted, fontSize: 16, marginTop: 6 }}>Precio de lanzamiento</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 22 }}>
            <span style={{ fontSize: "clamp(44px,13vw,64px)", fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, whiteSpace: "nowrap" }}>US$5.99</span>
            <span style={{ ...muted, fontSize: 18 }}>/ mes</span>
          </div>
          <button className="l2-btn" onClick={onStartTrial} style={{ ...white, width: "100%", marginTop: 28, padding: "16px 24px" }}>Probar gratis 3 días</button>
          <button className="l2-btn" onClick={onUpgrade} style={{ ...link, width: "100%", fontSize: 15, marginTop: 6, color: "#B0B0B8" }}>Activar PRO ahora</button>
          <ul style={{ listStyle: "none", padding: 0, margin: "26px 0 0", display: "flex", flexDirection: "column", gap: 16 }}>
            {plan.map((x) => (
              <li key={x} style={{ display: "flex", gap: 14, alignItems: "flex-start", fontSize: 17, lineHeight: 1.4, color: "#D4D4D9" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...wrap, maxWidth: 720, padding: "130px 24px 40px" }}>
        <h2 style={{ ...h2, fontSize: "clamp(28px,4.4vw,44px)", marginBottom: 36 }}>Preguntas frecuentes</h2>
        {faqs.map((x) => <FAQItem key={x.q} q={x.q} a={x.a} />)}
      </section>

      {/* CTA FINAL */}
      <section style={{ ...wrap, textAlign: "center", padding: "130px 24px 110px" }}>
        <h2 style={{ ...h2, maxWidth: 760, margin: "0 auto" }}>Haz las cuentas antes de gastar el primer dólar</h2>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 40 }}>
          <button className="l2-btn" onClick={onStartTrial} style={white}>Probar PRO gratis</button>
          <button className="l2-btn" onClick={onOpenFree} style={link}>Usar la calculadora gratis →</button>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #1E1E21", padding: "28px 24px 44px" }}>
        <div style={{ ...wrap, padding: 0, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#8B8B92" }}>
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
