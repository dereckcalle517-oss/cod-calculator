import { C } from "../theme";
import { Ic } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { navTo, openAccount, openPlans } from "../lib/nav";
import { TodayCard } from "../lib/tracking";


// ─── PANEL DE INICIO ──────────────────────────────────────────────────────────
export function Dashboard({ trialDaysLeft, onUpgrade }) {
  const { user, isPro, profile } = useAuth();
  const canPro = isPro || trialDaysLeft > 0;
  const name = ((user && user.displayName) || "").split(" ")[0];
  const st = profile && profile.lsStatus;
  const planNote = isPro ? (st === "bonus" ? "Tienes PRO por tus referidos." : st === "trialing" ? "Tu plan PRO está activo (en prueba gratis)." : "Tu plan PRO está activo.") : "Estás en el plan gratis. PRO cuesta $5.99 al mes.";
  const cards = [
    { i: "calculator", t: "Calculadora", d: canPro ? "Calcula tu ganancia real con envío, CPA, devoluciones y Dropi incluidos." : "Calcula tu ganancia real con todos los costos. Incluye tu CPA real y tu CPA máximo.", b: "Abrir calculadora", fn: () => navTo("calc") },
    { i: "target", t: "CPA real y desglose", d: canPro ? "Tu CPA real, los niveles de rentabilidad y qué pasa si cambia la entrega." : "Disponible solo en PRO: el desglose de CPA por niveles y la sensibilidad a la entrega.", b: canPro ? "Ver desglose" : "Ver planes", fn: () => { window.__nxCalcTab = "cpa"; navTo("calc"); }, lock: !canPro },
    { i: "megaphone", t: "Planificador de ads", d: canPro ? "Cuánto invertir cada día y cuánto dejar en tu banco y en Dropi para no quedarte sin fondos." : "Disponible solo en PRO: cuánto invertir cada día y cuánto dejar en tu banco y en Dropi para no quedarte sin fondos.", b: canPro ? "Abrir planificador" : "Ver planes", fn: () => navTo("planner"), lock: !canPro },
    { i: "wallet", t: "Control financiero", d: canPro ? "Registra gastos y fondos de ads y mira tu capital mes a mes." : "Disponible solo en PRO: registra gastos y fondos de ads y mira tu capital mes a mes.", b: canPro ? "Abrir" : "Ver planes", fn: () => navTo("finance"), lock: !canPro },
    { i: "gift", t: "Referidos", d: "Gana 15 días de PRO por cada amigo que se suscriba.", b: "Ver mi enlace", fn: () => openAccount("referidos") },
    { i: "card", t: "Suscripción", d: planNote, b: "Administrar", fn: () => openAccount("suscripcion") },
  ];
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 16px 60px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>{name ? `Hola, ${name}` : "Hola"}</h1>
      <div style={{ fontSize: 14, color: C.textDim, marginBottom: 24 }}>¿Qué quieres hacer hoy?</div>
      {!isPro && (
        <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 14, padding: "16px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 2 }}>Pasa a PRO</div>
            <div style={{ fontSize: 13, color: C.textDim }}>Desglose de CPA, benchmarks, escenarios, asesor de IA y control financiero.</div>
          </div>
          <button onClick={openPlans} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "10px 18px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ver planes</button>
        </div>
      )}
      <TodayCard />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {cards.map(c => (
          <div key={c.t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={c.i} size={19} /></div>
              {c.lock && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: C.gold, background: `${C.gold}14`, border: `1px solid ${C.gold}33`, borderRadius: 99, padding: "3px 10px" }}><Ic n="lock" size={11} /> Solo PRO</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.t}</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 18, flex: 1 }}>{c.d}</div>
            <button onClick={c.lock ? openPlans : c.fn} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 16px", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{c.lock && <Ic n="lock" size={13} />}{c.b}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
