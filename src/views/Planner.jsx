import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { AppShell } from "../components/Shell";
import { Ic } from "../components/ui";
import { makeFmt } from "../lib/calc";
import { monthKey, sumBy, todayISO } from "../lib/dates";
import { useFinance } from "./Finance";
import { CashPlanner } from "./CashPlanner";

// Planificador de ads: sección propia del panel. Comparte datos con Control financiero
// (el plan se guarda en la misma cuenta, así que lo ya escrito no se pierde).
export function PlannerView({ onHome }) {
  const { data, update, status, user } = useFinance();
  const fmt = makeFmt("$");
  const k = todayISO().slice(0, 7);
  const exp = (data.expenses || []).filter(e => monthKey(e.date) === k);
  const fnd = (data.funds || []).filter(f => monthKey(f.date) === k);
  const saldo = (Number((data.capital || {})[k]) || 0) + sumBy(fnd) - sumBy(exp);
  const statusText = { loading: "Cargando…", saving: "Guardando…", saved: user ? "Guardado en tu cuenta" : "Guardado en este navegador", error: "Error al guardar" }[status];
  return (
    <AppShell active="plan" onHome={onHome}
      right={<span className="hide-mobile" style={{ fontSize: 11, color: status === "error" ? C.red : C.textMuted }}>{statusText}</span>}>
      <GlobalStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 14px 50px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}><Ic n="megaphone" /> Planificador de ads</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Cuánto invertir cada día y cuánto dejar en tu banco y en Dropi para no quedarte sin fondos.</div>
          {!user && <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>Inicia sesión para guardar tu plan en tu cuenta. Ahora se guarda solo en este navegador.</div>}
          <div className="show-mobile-only" style={{ fontSize: 10, color: status === "error" ? C.red : C.textMuted, marginTop: 6 }}>{statusText}</div>
        </div>
        <CashPlanner data={data} update={update} saldo={saldo} fmt={fmt} />
      </div>
    </AppShell>
  );
}
