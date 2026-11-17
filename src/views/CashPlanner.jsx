import { useMemo } from "react";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { useTracking, trkRows, trkSum } from "../lib/tracking";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const fmtDate = (d) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
// Suma días hábiles: los domingos no cuentan
function addBizDays(d, n) {
  let x = new Date(d), left = n;
  while (left > 0) { x = addDays(x, 1); if (x.getDay() !== 0) left--; }
  return x;
}
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };

// Cálculo puro (se puede probar aparte)
export function planCash(i) {
  const today = startOfToday();
  const conf = i.pedidosDia * i.pctConf / 100;
  const bestBiz = i.entMin + i.retiro, worstBiz = i.entMax + i.retiro;
  const bestDate = addBizDays(today, bestBiz), worstDate = addBizDays(today, worstBiz);
  const bestCal = Math.round((bestDate - today) / DAY), worstCal = Math.round((worstDate - today) / DAY);
  const transit = Number.isFinite(i.enCamino) ? i.enCamino : Math.round(conf * ((i.entMin + i.entMax) / 2 + i.retiro));
  const reserva = transit * (1 - i.pctEnt / 100) * i.envio;
  const retirable = Math.max(0, i.dropi - reserva);
  const falta = Math.max(0, reserva - i.dropi);
  const adMoney = Math.max(0, i.banco + i.dropi - reserva);
  const runway = i.adsDia > 0 ? Math.floor(adMoney / i.adsDia) : null;
  const safeDaily = adMoney / worstCal;
  let light = null;
  if (runway !== null) light = runway >= worstCal ? "green" : runway >= bestCal ? "amber" : "red";
  return { today, conf, bestDate, worstDate, bestCal, worstCal, transit, reserva, retirable, falta, adMoney, runway, safeDaily, light,
    lastAdDay: runway !== null && runway > 0 ? addDays(today, runway - 1) : null,
    noFundsFrom: runway !== null ? addDays(today, runway) : null };
}

// Fuera de CashPlanner a propósito: si se define dentro, React lo recrea en cada tecla y el campo pierde el foco.
function PlanField({ k, label, hint, value, auto: a, plan, set, inp }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{label}</span>
      <input style={inp} inputMode="decimal" value={plan[k] ?? ""} onChange={set(k)} placeholder={String(value)} />
      <span style={{ display: "block", fontSize: 10, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{a ? "Tomado de tu Seguimiento. " : ""}{hint}</span>
    </label>
  );
}

export function CashPlanner({ data, update, saldo, fmt }) {
  const { products } = useTracking();
  const plan = data.plan || {};
  const set = (k) => (e) => update(d => ({ ...d, plan: { ...(d.plan || {}), [k]: e.target.value } }));

  // Valores sugeridos desde Seguimiento (últimos 3 días registrados)
  const auto = useMemo(() => {
    const rows = [];
    products.forEach(p => trkRows(p).forEach(r => rows.push({ ...r, p })));
    const dates = [...new Set(rows.map(r => r.date))].sort().slice(-3);
    if (!dates.length) return null;
    const rs = rows.filter(r => dates.includes(r.date));
    const t = trkSum(rs.map(r => r.c));
    const p0 = products[0];
    return { adsDia: t.ads / dates.length, pedidosDia: t.pedidos / dates.length, envio: p0.envio, pctConf: p0.pctConfirmados, pctEnt: p0.pctEntregados };
  }, [products]);

  const pick = (k, fallback) => { const v = num(plan[k]); if (Number.isFinite(v)) return v; if (auto && auto[k] !== undefined) return +Number(auto[k]).toFixed(2); return fallback; };
  const bancoAuto = Math.max(0, saldo);
  const i = {
    banco: Number.isFinite(num(plan.banco)) ? num(plan.banco) : bancoAuto,
    dropi: pick("dropi", 0),
    adsDia: pick("adsDia", 0),
    pedidosDia: pick("pedidosDia", 0),
    envio: pick("envio", 6),
    pctConf: pick("pctConf", 75),
    pctEnt: pick("pctEnt", 65),
    entMin: pick("entMin", 3), entMax: pick("entMax", 5), retiro: pick("retiro", 1),
    enCamino: num(plan.enCamino),
  };
  const r = planCash(i);
  const lightMap = { green: [C.green, "Tu caja aguanta hasta que vuelva el dinero"], amber: [C.amber, "Vas justo: puede que el dinero llegue tarde"], red: [C.red, "Te quedas sin fondos antes de que llegue el dinero"] };
  const [lc, lt] = r.light ? lightMap[r.light] : [C.textDim, "Escribe cuánto inviertes al día en ads para calcularlo"];

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box", colorScheme: "dark" };
  const fp = { plan, set, inp };
  const big = (label, value, color, sub) => (
    <div style={{ ...card, borderLeft: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, color, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
    </div>
  );

  const tips = [];
  if (r.falta > 0) tips.push({ c: C.red, t: `Tu cuenta de Dropi necesita ${fmt(r.falta)} más para cubrir los envíos de las devoluciones. Pásalos desde tu banco antes de seguir con ads.` });
  if (r.retirable > 0) tips.push({ c: C.green, t: `Puedes retirar ${fmt(r.retirable)} de Dropi a tu banco y dejar ${fmt(r.reserva)} para cubrir envíos.` });
  if (r.light === "red") tips.push({ c: C.red, t: `Baja tu inversión a ${fmt(r.safeDaily)} al día o menos: así tu dinero alcanza hasta que llegue el primer pago (${fmtDate(r.worstDate)} en el peor caso).` });
  if (r.light === "amber") tips.push({ c: C.amber, t: `Si el dinero llega en el mejor caso (${fmtDate(r.bestDate)}) estás bien; en el peor (${fmtDate(r.worstDate)}) te faltan ${r.worstCal - r.runway} día(s). Un gasto de ${fmt(r.safeDaily)} al día te cubre en cualquier caso.` });
  if (r.light === "green") tips.push({ c: C.green, t: `Estás cubierto. Podrías subir hasta ${fmt(r.safeDaily)} al día sin quedarte sin fondos antes del primer pago.` });
  if (!tips.length) tips.push({ c: C.textDim, t: "Completa los datos de arriba y te digo cuánto puedes invertir y retirar." });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card, borderColor: `${lc}55` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: lc, flexShrink: 0 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: lc }}>{lt}</div>
        </div>
        {r.runway !== null && (
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginTop: 8 }}>
            {r.adMoney <= 0
              ? "Después de reservar el dinero de los envíos no te queda para ads."
              : r.runway === 0
                ? "Con tu dinero disponible no alcanzas a cubrir ni un día de ads."
                : <>Con lo que tienes puedes invertir <b style={{ color: C.text }}>{r.runway} {r.runway === 1 ? "día" : "días"}</b>, hasta el <b style={{ color: C.text }}>{fmtDate(r.lastAdDay)}</b>. Desde el <b style={{ color: C.text }}>{fmtDate(r.noFundsFrom)}</b> no deberías invertir más hasta que se entreguen los pedidos y el dinero llegue a tu cuenta.</>}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {big("Puedes invertir al día", r.adMoney > 0 ? fmt(r.safeDaily) : fmt(0), C.accent, "Límite seguro: tu dinero alcanza hasta el primer pago (peor caso).")}
        {big("Dropi debe tener", fmt(r.reserva), C.amber, `Reserva para envíos de devoluciones de ${Math.round(r.transit)} pedidos en camino.`)}
        {big("Puedes retirar a tu banco", fmt(r.retirable), r.retirable > 0 ? C.green : C.textDim, r.falta > 0 ? `Te faltan ${fmt(r.falta)} en Dropi.` : "Lo que sobra en Dropi después de la reserva.")}
        {big("Dinero para ads", fmt(r.adMoney), C.text, "Banco + Dropi − reserva de envíos.")}
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Cuándo vuelve el dinero</div>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>
          Lo que inviertas hoy genera pedidos que se entregan en {i.entMin} a {i.entMax} días hábiles, más {i.retiro} día para retirar. Sin contar domingos.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 12 }}>
          <div style={{ background: C.surface, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted }}>Mejor caso</div><div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{fmtDate(r.bestDate)}</div></div>
          <div style={{ background: C.surface, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted }}>Peor caso</div><div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>{fmtDate(r.worstDate)}</div></div>
          {r.runway !== null && <div style={{ background: C.surface, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: C.textMuted }}>Tu dinero para ads dura hasta</div><div style={{ fontSize: 16, fontWeight: 700, color: lc }}>{r.runway > 0 ? fmtDate(r.lastAdDay) : "—"}</div></div>}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Qué hacer ahora</div>
        <div style={{ display: "grid", gap: 10 }}>
          {tips.map((x, k) => <div key={k} style={{ borderLeft: `3px solid ${x.c}`, paddingLeft: 12, fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{x.t}</div>)}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tus datos</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
          <PlanField {...fp} k="banco" label="Dinero disponible en tu banco" value={i.banco} hint="Por defecto: el saldo de tu Control financiero este mes." />
          <PlanField {...fp} k="dropi" label="Fondos en Dropi" value={i.dropi} hint="Lo que tienes hoy en tu cuenta de Dropi." />
          <PlanField {...fp} k="adsDia" label="Inversión diaria en ads" value={i.adsDia} auto={!!auto && !plan.adsDia} hint="Lo que gastas por día." />
          <PlanField {...fp} k="pedidosDia" label="Pedidos por día" value={i.pedidosDia} auto={!!auto && !plan.pedidosDia} hint="Promedio de pedidos que te entran." />
          <PlanField {...fp} k="envio" label="Costo promedio de envío" value={i.envio} auto={!!auto && !plan.envio} hint="Lo que cuesta cada envío." />
          <PlanField {...fp} k="pctConf" label="Confirmados (%)" value={i.pctConf} auto={!!auto && !plan.pctConf} hint="De los pedidos, cuántos confirman." />
          <PlanField {...fp} k="pctEnt" label="Entregados (%)" value={i.pctEnt} auto={!!auto && !plan.pctEnt} hint="De los confirmados, cuántos se entregan." />
          <PlanField {...fp} k="enCamino" label="Pedidos en camino ahora (opcional)" value={Math.round(r.transit)} hint="Si lo dejas vacío, lo estimo con tus pedidos por día." />
          <PlanField {...fp} k="entMin" label="Entrega, mínimo (días hábiles)" value={i.entMin} hint="Mejor caso." />
          <PlanField {...fp} k="entMax" label="Entrega, máximo (días hábiles)" value={i.entMax} hint="Peor caso." />
          <PlanField {...fp} k="retiro" label="Días para poder retirar" value={i.retiro} hint="Después de la entrega." />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginTop: 14 }}>
          <Ic n="bulb" size={12} /> Cómo se calcula: la reserva de Dropi cubre el envío de los pedidos en camino que podrían devolverse (envío × pedidos en camino × % que no se entrega). El dinero para ads es tu banco más tus fondos de Dropi menos esa reserva. Es una estimación: ajusta los datos a tu operación.
        </div>
      </div>
    </div>
  );
}
