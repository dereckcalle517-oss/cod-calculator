import { useMemo, useState } from "react";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { FAQItem } from "../components/shared";
import { Brand, Ic } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openLegal } from "../lib/nav";
import { scenario, simulate, startOfToday, addDays } from "../lib/cashflow";

// ─── LANDING 1 ────────────────────────────────────────────────────────────────
// Versión alternativa de la página de inicio. No reemplaza a Landing.jsx: se abre desde el menú del panel.
// La demo de arriba usa el mismo motor de Caja y ads que la herramienta real.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fmtDate = (d) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
const usd = (v) => `${v < -0.005 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
const num = (v, fb) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : fb; };

// Supuestos fijos de la demo (se muestran a la persona, no se esconden)
const BASE = { costo: 8, envio: 6, comision: 2.5, otros: 0, pctConf: 75, pctEnt: 65, entMin: 3, entMax: 5, retiro: 1, transfer: 1, deposito: 0, retiroCada: 3, enCamino: 0, envioModo: "despacho", costoModo: "liquidar" };
const lag = 5;

function useDemo(f) {
  return useMemo(() => {
    const ads = num(f.ads, 0), cpa = num(f.cpa, 0), precio = num(f.precio, 0), total = num(f.total, 0);
    if (!(ads > 0 && cpa > 0 && precio > 0)) return null;
    const i = { ...BASE, adsDia: ads, cpa, precio, banco: total * 0.65, dropi: total * 0.35 };
    return { i, sc: scenario(i, ads, lag), rows: simulate(i, lag, 14).rows };
  }, [f.ads, f.cpa, f.precio, f.total]);
}

function Field({ label, k, f, set, prefix = "$" }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "0 12px" }}>
        <span style={{ color: C.textMuted, fontSize: 14 }}>{prefix}</span>
        <input value={f[k]} onChange={(e) => set(k, e.target.value)} inputMode="decimal" aria-label={label}
          style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 16, fontWeight: 600, padding: "11px 8px", width: "100%", minWidth: 0, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }} />
      </span>
    </label>
  );
}

export function LiveLedger() {
  const [f, setF] = useState({ ads: "25", cpa: "3", precio: "35.99", total: "500" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const d = useDemo(f);
  const today = startOfToday();
  const s = d && d.sc.s, ok = s && s.failDay === null;
  const first = s && s.firstRecovery !== null ? fmtDate(addDays(today, s.firstRecovery)) : null;
  const row = (l, v, c, big) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: big ? "14px 0 4px" : "9px 0", borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textDim }}>{l}</span>
      <span style={{ fontSize: big ? 26 : 17, fontWeight: 700, color: c || C.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 22, boxShadow: "0 40px 90px rgba(0,0,0,0.45)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Pruébalo con tus números</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>Escribe y mira cómo cuadra tu semana. Sin registro.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Inviertes al día en ads" k="ads" f={f} set={set} />
        <Field label="Costo por pedido (CPA)" k="cpa" f={f} set={set} />
        <Field label="Precio de venta" k="precio" f={f} set={set} />
        <Field label="Dinero que tienes (banco + Dropi)" k="total" f={f} set={set} />
      </div>
      {!d ? (
        <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 0" }}>Completa los cuatro datos para ver el resultado.</div>
      ) : (
        <div>
          {row("Ganancia por día, cuando todo se entrega", usd(s.perDay), s.perDay >= 0 ? C.green : C.red)}
          {row("Deja en tu banco (para los ads)", usd(d.sc.need.banco))}
          {row("Deja en Dropi (para los envíos)", usd(d.sc.need.dropi), C.amber)}
          {row(ok ? "Te alcanza para" : "Con tu dinero aguantas", ok ? "Sin límite" : `${d.sc.autonomia} ${d.sc.autonomia === 1 ? "día" : "días"}`, ok ? C.green : C.red, true)}
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55, marginTop: 8 }}>
            {first ? `Tu primer cobro llega el ${first}; hasta entonces solo sale dinero. ` : ""}Supone 75% de confirmación, 65% de entrega en 5 días hábiles, producto de $8 y envío de $6. Son estimaciones, no garantías.
          </div>
        </div>
      )}
    </div>
  );
}

// Una semana en barras: lo que sale cada día frente a lo que entra
export function WeekBars() {
  const d = useDemo({ ads: "25", cpa: "3", precio: "35.99", total: "500" });
  const today = startOfToday();
  const rows = d.rows.slice(0, 12);
  const max = Math.max(...rows.map((r) => Math.max(r.ads + r.ship, r.unlocked)), 1);
  const fr = d.sc.s.firstRecovery;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 190, borderBottom: `1px solid ${C.borderBright}` }} role="img" aria-label="Dinero que sale y que entra por día durante las primeras dos semanas">
        {rows.map((r) => (
          <div key={r.t} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: "100%", minWidth: 0 }}>
            <div style={{ width: "42%", height: `${((r.ads + r.ship) / max) * 100}%`, background: C.amber, borderRadius: "3px 3px 0 0" }} />
            <div style={{ width: "42%", height: `${(r.unlocked / max) * 100}%`, background: C.green, borderRadius: "3px 3px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {rows.map((r) => <div key={r.t} style={{ flex: 1, textAlign: "center", fontSize: 10, color: r.t === fr ? C.green : C.textMuted, fontWeight: r.t === fr ? 700 : 400, minWidth: 0 }}>{addDays(today, r.t).getDate()}</div>)}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 12, color: C.textDim, flexWrap: "wrap" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: C.amber, marginRight: 6 }} />Sale: ads + envíos</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: C.green, marginRight: 6 }} />Entra: cobros de pedidos entregados</span>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.55 }}>
        Ejemplo: $25 al día en ads, CPA $3, precio $35.99. {fr !== null ? `El primer cobro llega el ${fmtDate(addDays(today, fr))}.` : ""} Cálculo del mismo motor de Cuadre.
      </div>
    </div>
  );
}

export function Landing1({ onOpenFree, onStartTrial, onUpgrade, onHome }) {
  const { user } = useAuth();
  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 20px" };
  const h2 = { fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.08, margin: 0 };
  const lead = { fontSize: 16, color: C.textDim, lineHeight: 1.65, margin: 0 };
  const gold = { background: C.gold, border: "none", borderRadius: 12, padding: "14px 24px", color: C.bg, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
  const ghost = { background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 12, padding: "14px 24px", color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const tools = [
    { q: "¿Gano o pierdo con este producto?", t: "Calculadora", d: "Tu ganancia real con envío, devoluciones, comisión y CPA. Te dice tu CPA real y hasta cuánto puedes pagar por pedido." },
    { q: "¿Cómo voy hoy?", t: "Seguimiento", d: "Anota tu CPA y tus pedidos del día. Cuadre calcula el resultado y te avisa si algo anda mal." },
    { q: "¿Cuánto invierto y dónde dejo el dinero?", t: "Planificador de ads", d: "Cuánto invertir cada día, cuánto dejar en tu banco y cuánto en Dropi para no quedarte sin fondos, con el plan día por día." },
    { q: "¿A dónde se fue mi dinero?", t: "Control financiero", d: "Registra gastos y fondos de ads y mira tu capital mes a mes." },
  ];
  const free = ["Calculadora de ganancia real", "CPA real y CPA máximo", "Sin registro"];
  const pro = ["Todo lo del plan gratis", "Seguimiento diario de tus campañas", "Planificador de ads: banco y Dropi", "Control financiero", "Simulador de escenarios", "Benchmarks LATAM y consultor IA"];
  const faqs = [
    { q: "¿Cómo funciona la prueba de 3 días?", a: "Tienes acceso completo a las funciones PRO durante 3 días sin pagar. Al terminar vuelves al plan gratis." },
    { q: "¿Para qué países sirve?", a: "Para cualquier país de LATAM. Soporta 16 monedas, entre ellas USD y COP. Los plazos de entrega y cobro los ajustas a tu operación." },
    { q: "¿Esto me garantiza resultados?", a: "No. Cuadre hace cuentas con los números que tú escribes y te muestra qué pasaría. Si tus tasas reales cambian, el resultado cambia." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. PRO es mensual y se cancela desde Ajustes. Mira las condiciones en Términos y Reembolsos." },
  ];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text, fontVariantNumeric: "tabular-nums" }}>
      <GlobalStyles />
      <div style={{ background: C.accentDim, borderBottom: `1px solid ${C.border}`, padding: "8px 20px", fontSize: 12, color: C.textDim, display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <span>Vista previa: <b style={{ color: C.text }}>Landing 1</b>. La página actual no cambia.</span>
        {user && <button onClick={() => navTo("panel")} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al panel</button>}
      </div>
      <nav style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Brand onClick={onHome} size={30} />
        <button onClick={user ? () => navTo("panel") : onOpenFree} style={{ ...ghost, padding: "9px 16px", fontSize: 13 }}>{user ? "Ir al panel" : "Usar gratis"}</button>
      </nav>

      <header style={{ ...wrap, padding: "44px 20px 70px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: "40px 48px", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "clamp(36px,6vw,64px)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1.02, margin: "0 0 20px" }}>
            Sabes cuánto vendes.<br />¿Sabes cuánto puedes invertir mañana?
          </h1>
          <p style={{ ...lead, fontSize: 18, maxWidth: 520 }}>
            En contraentrega el dinero tarda en volver: pagas los ads hoy y cobras en una semana. Cuadre calcula tu ganancia real y te dice cuánto invertir y cuánto dejar en tu banco y en Dropi para no quedarte sin fondos.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
            <button onClick={onStartTrial} style={gold}>Probar PRO gratis 3 días</button>
            <button onClick={onOpenFree} style={ghost}>Calculadora gratis</button>
          </div>
        </div>
        <LiveLedger />
      </header>

      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ ...wrap, padding: "70px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "36px 56px", alignItems: "center" }}>
          <div>
            <h2 style={h2}>La semana que nadie te cuenta</h2>
            <p style={{ ...lead, marginTop: 16 }}>
              Cada día gastas en ads y Dropi te cobra el envío al despachar. Los pedidos se entregan días después y el dinero tarda un día más en poder retirarse. Si no lo planeas, la plata que sí tienes está en la cuenta equivocada y el anuncio se frena.
            </p>
            <p style={{ ...lead, marginTop: 12 }}>Cuadre pone cada día en una tabla: qué sale, qué entra y en qué cuenta debe estar el dinero.</p>
          </div>
          <WeekBars />
        </div>
      </section>

      <section style={{ ...wrap, padding: "80px 20px 40px" }}>
        <h2 style={{ ...h2, maxWidth: 640 }}>Una herramienta para cada pregunta</h2>
        <div style={{ marginTop: 34, borderTop: `1px solid ${C.border}` }}>
          {tools.map((t) => (
            <div key={t.t} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: "8px 40px", padding: "26px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "clamp(19px,2.4vw,24px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{t.q}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{t.t}</div>
                <div style={{ fontSize: 14.5, color: C.textDim, lineHeight: 1.6 }}>{t.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="planes" style={{ ...wrap, padding: "60px 20px 40px" }}>
        <h2 style={h2}>Empieza gratis. Pasa a PRO cuando lo necesites.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16, marginTop: 32, alignItems: "stretch" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textDim }}>Gratis</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", margin: "6px 0 16px" }}>$0</div>
            {free.map((x) => <div key={x} style={{ fontSize: 14, color: C.textDim, marginBottom: 9, display: "flex", gap: 8 }}><span style={{ color: C.textMuted }}><Ic n="✓" /></span>{x}</div>)}
            <button onClick={onOpenFree} style={{ ...ghost, width: "100%", marginTop: 14 }}>Usar la calculadora</button>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.gold}66`, borderRadius: 16, padding: 26 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>PRO</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 4px" }}>
              <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em" }}>$5.99</span><span style={{ fontSize: 13, color: C.textMuted }}>al mes</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Precio de lanzamiento. Cancelas cuando quieras.</div>
            {pro.map((x) => <div key={x} style={{ fontSize: 14, color: C.text, marginBottom: 9, display: "flex", gap: 8 }}><span style={{ color: C.gold }}><Ic n="✓" /></span>{x}</div>)}
            <button onClick={onStartTrial} style={{ ...gold, width: "100%", marginTop: 14 }}>Probar PRO gratis 3 días</button>
            <button onClick={onUpgrade} style={{ background: "transparent", border: "none", color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%", marginTop: 10 }}>Activar PRO ahora</button>
          </div>
        </div>
      </section>

      <section style={{ ...wrap, padding: "50px 20px 30px", maxWidth: 760 }}>
        <h2 style={{ ...h2, fontSize: "clamp(22px,3vw,30px)", marginBottom: 22 }}>Preguntas frecuentes</h2>
        {faqs.map((x) => <FAQItem key={x.q} q={x.q} a={x.a} />)}
      </section>

      <section style={{ ...wrap, padding: "50px 20px 80px" }}>
        <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 22, padding: "44px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontSize: "clamp(24px,3.4vw,34px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1 }}>Haz las cuentas antes de gastar el primer dólar.</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 10 }}>Empieza con la calculadora gratis o prueba PRO 3 días.</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onOpenFree} style={ghost}>Usar gratis</button>
            <button onClick={onStartTrial} style={gold}>Probar PRO</button>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "28px 20px 40px" }}>
        <div style={{ ...wrap, padding: 0, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 12, color: C.textMuted }}>
          <span>© {new Date().getFullYear()} Cuadre · Dereck Calle</span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button onClick={() => openLegal("terms")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" }}>Términos</button>
            <button onClick={() => openLegal("privacy")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" }}>Privacidad</button>
            <button onClick={() => openLegal("refund")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" }}>Reembolsos</button>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "inherit" }}>{SUPPORT_EMAIL}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
