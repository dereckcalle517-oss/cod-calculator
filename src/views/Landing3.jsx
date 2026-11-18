import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { Brand } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";
import { LiveLedger } from "./Landing1";

// ─── LANDING 3 ────────────────────────────────────────────────────────────────
// Versión corta: el problema real (el dinero tarda en volver), la solución y una demo. Un solo botón principal.

export function Landing3({ onOpenFree, onStartTrial, onHome }) {
  const { user } = useAuth();
  const wrap = { maxWidth: 760, margin: "0 auto", padding: "0 22px" };
  const gold = { background: C.gold, border: "none", borderRadius: 12, padding: "16px 28px", color: "#0B0B0C", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
  const link = { background: "none", border: "none", color: C.text, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "14px 8px" };
  const h2 = { fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.08, margin: 0 };
  const p = { fontSize: 18, lineHeight: 1.6, color: C.textDim, margin: "16px 0 0" };
  const legalBtn = { background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" };

  const days = [
    { d: "Hoy", t: "Pagas los ads y Dropi cobra el envío al despachar.", c: C.amber, out: true },
    { d: "Días 1 a 5", t: "Los pedidos viajan. Solo sale dinero.", c: C.amber, out: true },
    { d: "Día 6 en adelante", t: "Se entrega, te pagan y puedes retirar.", c: C.green, out: false },
  ];
  const solves = [
    ["¿Gano o pierdo?", "Tu ganancia real por pedido, con envío, devoluciones y CPA."],
    ["¿Cuánto invierto?", "El monto diario que tu dinero aguanta, respetando el mínimo de TikTok Ads."],
    ["¿Dónde dejo el dinero?", "Cuánto en tu banco y cuánto en Dropi, para que ninguno se quede en cero."],
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text }}>
      <GlobalStyles />
      <div style={{ background: C.accentDim, borderBottom: `1px solid ${C.border}`, padding: "8px 20px", fontSize: 12, color: C.textDim, display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span>Vista previa: <b style={{ color: C.text }}>Landing 3</b>. La página actual no cambia.</span>
        {user && <button onClick={() => navTo("panel")} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al panel</button>}
      </div>
      <nav style={{ ...wrap, maxWidth: 1000, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Brand onClick={onHome} size={30} />
        <button onClick={user ? () => navTo("panel") : onOpenFree} style={{ ...link, fontSize: 14 }}>{user ? "Ir al panel" : "Usar gratis"}</button>
      </nav>

      <header style={{ ...wrap, padding: "56px 22px 20px" }}>
        <h1 style={{ fontSize: "clamp(38px,8vw,64px)", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.02, margin: 0 }}>
          Tu campaña puede ganar y aun así quedarse sin saldo.
        </h1>
        <p style={{ ...p, fontSize: 20, marginTop: 22 }}>
          En contraentrega pagas hoy y cobras días después. Si tu dinero está en la cuenta equivocada, el anuncio se frena aunque tus pedidos sí dejen ganancia.
        </p>
      </header>

      <section style={{ ...wrap, padding: "36px 22px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {days.map((x) => (
            <div key={x.d} style={{ display: "flex", gap: 16, alignItems: "baseline", background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${x.c}`, borderRadius: 12, padding: "16px 18px" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: x.c, minWidth: 112 }}>{x.d}</span>
              <span style={{ fontSize: 16, color: C.textDim, lineHeight: 1.5 }}>{x.t}</span>
            </div>
          ))}
        </div>
        <p style={{ ...p, fontSize: 17 }}>Entre el día 0 y el 6 solo sale dinero. Cuánto necesitas, y en cuál cuenta, depende de tus números.</p>
      </section>

      <section style={{ ...wrap, padding: "56px 22px 20px" }}>
        <h2 style={h2}>Cuadre hace esa cuenta por ti.</h2>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column" }}>
          {solves.map(([q, a]) => (
            <div key={q} style={{ padding: "20px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{q}</div>
              <div style={{ fontSize: 17, color: C.textDim, lineHeight: 1.55, marginTop: 6 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...wrap, padding: "40px 22px 20px" }}>
        <LiveLedger />
      </section>

      <section style={{ ...wrap, padding: "60px 22px 90px", textAlign: "center" }}>
        <h2 style={h2}>Haz las cuentas antes de gastar el primer dólar.</h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 32 }}>
          <button onClick={onStartTrial} style={gold}>Probar PRO gratis 3 días</button>
          <button onClick={onOpenFree} style={link}>Calculadora gratis →</button>
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 18 }}>PRO cuesta $5.99 al mes (precio de lanzamiento). Se cancela cuando quieras.</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Cuadre hace cuentas con tus números. Son estimaciones, no garantías.</div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "26px 22px 40px" }}>
        <div style={{ ...wrap, maxWidth: 1000, padding: 0, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.textMuted }}>
          <span>© {new Date().getFullYear()} Cuadre · Dereck Calle</span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
