import { useEffect, useMemo, useState } from "react";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { FAQItem } from "../components/shared";
import { Brand } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";

// ─── CUADRE BOT (página de lista de espera) ─────────────────────────────────
// Presenta el asistente de WhatsApp que confirma pedidos contra entrega.
// Todavía no se vende: esta página solo recoge interesados. La calculadora de tiempo es un ejemplo, no una promesa.

const STEPS = [
  { t: "Llega el pedido", d: "Toma el nombre, el producto, la dirección y el total del mensaje automático de tu tienda." },
  { t: "Saluda y coordina", d: "Lo saluda por su nombre y le pregunta si podrá recibir en el plazo de entrega." },
  { t: "Pide la ubicación", d: "Revisa que la ubicación coincida con la ciudad de la dirección y recuerda si no la envía." },
  { t: "Confirma el pedido", d: "Recuerda que el pago es en efectivo y pide la confirmación." },
  { t: "Reconfirma a la mañana siguiente", d: "Escribe solo a los confirmados antes del despacho." },
  { t: "Te deja listo el despacho", d: "En tu panel ves quién está listo y lo subes a tu proveedor." },
];

const FAQ = [
  { q: "¿Ya está disponible?", a: "Todavía no. Estamos terminando la versión para varias tiendas. Si te anotas, te avisamos cuando abramos los primeros cupos." },
  { q: "¿Necesito mi propio número de WhatsApp?", a: "Sí. Funciona con la API oficial de WhatsApp de Meta, conectada al número de tu negocio." },
  { q: "¿La inteligencia artificial inventa respuestas?", a: "No. Solo responde con la información de tu tienda que tú escribes. Si no sabe algo, dice que lo consulta y te avisa. Si le preguntan si es un bot, lo dice." },
  { q: "¿Puedo intervenir en una conversación?", a: "Sí. Desde el panel respondes a mano y el bot se pausa en ese chat." },
  { q: "¿Cuánto costará?", a: "Aún no hay precio definido. Depende de la cantidad de pedidos de cada tienda. Quienes se anoten serán los primeros en conocerlo." },
];

function useSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    let m = document.querySelector('meta[name="description"]');
    const created = !m;
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    const prevDesc = m.getAttribute("content");
    document.title = "Cuadre Bot: asistente de WhatsApp para confirmar pedidos contra entrega";
    m.setAttribute("content", "Un asistente con IA que confirma por WhatsApp tus pedidos contra entrega y te deja listo el despacho. Anótate en la lista de espera.");
    return () => { document.title = prevTitle; if (created) m.remove(); else m.setAttribute("content", prevDesc || ""); };
  }, []);
}

export function CuadreBot({ onHome }) {
  const { user } = useAuth();
  useSeo();
  const [pedidos, setPedidos] = useState(30);
  const [min, setMin] = useState(4);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState("");
  const [country, setCountry] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | ok | error

  const horas = useMemo(() => {
    const p = Math.max(0, Math.min(2000, Number(pedidos) || 0));
    const m = Math.max(0, Math.min(60, Number(min) || 0));
    return Math.round((p * m * 30) / 60);
  }, [pedidos, min]);

  const send = async (e) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orders, country, hp }),
      });
      setState(r.ok ? "ok" : "error");
    } catch { setState("error"); }
  };

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 24px" };
  const sec = { ...wrap, padding: "88px 24px 0" };
  const h2 = { fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 };
  const lead = { fontSize: 18, lineHeight: 1.6, color: C.textDim, margin: "16px 0 0", maxWidth: 640 };
  const gold = { background: C.gold, border: "none", borderRadius: 10, padding: "15px 24px", color: "#0B0B0C", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const input = { width: "100%", background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "13px 14px", color: C.text, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const label = { fontSize: 13, color: C.textDim, fontWeight: 600, display: "block", marginBottom: 6 };
  const legalBtn = { background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" };
  const toForm = () => { const el = document.getElementById("lista-espera"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif" }}>
      <GlobalStyles />
      <nav style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }} aria-label="Principal">
        <Brand onClick={onHome} size={30} />
        <button onClick={user ? () => navTo("panel") : onHome} style={{ background: "none", border: "none", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{user ? "Ir al panel" : "Ver Cuadre"}</button>
      </nav>

      <header style={{ ...wrap, padding: "56px 24px 0" }}>
        <div style={{ display: "inline-block", border: `1px solid ${C.borderBright}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 20 }}>Cuadre Bot · Próximamente</div>
        <h1 style={{ fontSize: "clamp(36px,6vw,62px)", fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1.03, margin: 0, maxWidth: 820 }}>
          Un asistente de WhatsApp que confirma tus pedidos contra entrega por ti.
        </h1>
        <p style={lead}>
          Cuando un cliente compra en tu tienda, el asistente lo saluda por su nombre, coordina la entrega, le pide su ubicación y lo reconfirma a la mañana siguiente. Tú solo entras a un panel y ves quién está listo para despachar.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
          <button onClick={toForm} style={gold}>Avisarme cuando esté listo</button>
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 14 }}>Para tiendas de dropshipping con pago contra entrega. Aún no está abierto al público.</div>
      </header>

      <section style={sec} aria-labelledby="flujo">
        <h2 id="flujo" style={h2}>Así atiende cada pedido</h2>
        <p style={lead}>Mensajes cortos, escritos como una persona y siguiendo el proceso que tú defines.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s.t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 800, marginBottom: 6 }}>Paso {i + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.t}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={sec} aria-labelledby="tiempo">
        <h2 id="tiempo" style={h2}>¿Cuánto tiempo te ahorraría?</h2>
        <p style={lead}>Un cálculo de ejemplo con tus propios números. El resultado real depende de tu operación.</p>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, alignItems: "end" }}>
          <div>
            <label htmlFor="ped" style={label}>Pedidos por día</label>
            <input id="ped" type="number" inputMode="numeric" min="0" max="2000" value={pedidos} onChange={(e) => setPedidos(e.target.value)} style={input} />
          </div>
          <div>
            <label htmlFor="mnt" style={label}>Minutos que tardas confirmando cada pedido</label>
            <input id="mnt" type="number" inputMode="numeric" min="0" max="60" value={min} onChange={(e) => setMin(e.target.value)} style={input} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>Tiempo al mes dedicado a confirmar</div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.04em", color: C.gold, lineHeight: 1 }}>{horas} h</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Ejemplo: pedidos × minutos × 30 días. No incluye el tiempo de las dudas que el asistente no pueda resolver y te pase a ti.</div>
      </section>

      <section style={sec} aria-labelledby="panel">
        <h2 id="panel" style={h2}>Tú controlas todo desde un panel</h2>
        <ul style={{ ...lead, paddingLeft: 20, maxWidth: 680 }}>
          <li>Pedidos por estado: coordinando, confirmados, sin responder, listos para despachar y cancelados.</li>
          <li>Una lista lista para tu proveedor, que puedes copiar o descargar en Excel.</li>
          <li>El chat completo de cada cliente. Si respondes tú, el bot se pausa en ese chat.</li>
          <li>El texto con la información de tu tienda que usa la inteligencia artificial para responder.</li>
        </ul>
      </section>

      <section id="lista-espera" style={sec} aria-labelledby="espera">
        <h2 id="espera" style={h2}>Anótate en la lista de espera</h2>
        <p style={lead}>Te avisamos por correo cuando abramos los primeros cupos. Sin compromiso y sin pago.</p>
        {state === "ok" ? (
          <div style={{ background: C.greenGlow, border: `1px solid ${C.green}`, borderRadius: 14, padding: "18px 20px", marginTop: 28, maxWidth: 520, fontSize: 15 }}>
            Listo, quedaste anotado. Te escribiremos cuando haya novedades.
          </div>
        ) : (
          <form onSubmit={send} style={{ marginTop: 28, maxWidth: 520, display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="em" style={label}>Correo</label>
              <input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="tu@correo.com" />
            </div>
            <div>
              <label htmlFor="ord" style={label}>Pedidos por día (opcional)</label>
              <input id="ord" type="text" inputMode="numeric" maxLength={6} value={orders} onChange={(e) => setOrders(e.target.value)} style={input} placeholder="Ej.: 30" />
            </div>
            <div>
              <label htmlFor="ctr" style={label}>País (opcional)</label>
              <input id="ctr" type="text" maxLength={40} value={country} onChange={(e) => setCountry(e.target.value)} style={input} placeholder="Ecuador, Colombia…" />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            <button type="submit" disabled={state === "sending"} style={{ ...gold, opacity: state === "sending" ? 0.7 : 1 }}>{state === "sending" ? "Enviando…" : "Avisarme cuando esté listo"}</button>
            {state === "error" && <div role="alert" style={{ color: C.red, fontSize: 14 }}>No pudimos guardarte. Revisa el correo e inténtalo otra vez.</div>}
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
              Usamos tu correo solo para avisarte de Cuadre Bot. Más detalles en la <button type="button" onClick={() => openLegal("privacy")} style={{ ...legalBtn, textDecoration: "underline" }}>política de privacidad</button>.
            </div>
          </form>
        )}
      </section>

      <section style={{ ...sec, paddingBottom: 8 }} aria-labelledby="faq">
        <h2 id="faq" style={h2}>Preguntas frecuentes</h2>
        <div style={{ marginTop: 20, maxWidth: 760 }}>
          {FAQ.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "26px 24px 44px", marginTop: 72 }}>
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
