import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { useTracking, trkRows, trkSum } from "../lib/tracking";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DAY = 86400000;
const HORIZON = 45;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const fmtDate = (d) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
const short = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
// Offset en días corridos al sumar n días hábiles (los domingos no cuentan)
function bizOffset(start, n) {
  let x = new Date(start), left = n, off = 0;
  while (left > 0) { x = addDays(x, 1); off++; if (x.getDay() !== 0) left--; }
  return off;
}

// Simula día a día mantener la campaña. El banco paga los ads; Dropi debe tener
// una reserva para el envío de los pedidos en camino que se devuelvan.
// Cada día se reequilibra: se pasa del banco a Dropi lo que falte y se retira lo que sobre.
export function simulate(i, lag, days = HORIZON, today = startOfToday()) {
  const ordersPerDay = i.cpa > 0 ? i.adsDia / i.cpa : 0;
  const conf = ordersPerDay * i.pctConf / 100;
  const ent = conf * i.pctEnt / 100, dev = conf - ent;
  const netDel = i.precio - i.envio - i.costo - i.precio * i.comision / 100;
  const lagOff = [], payOff = [];
  for (let t = 0; t < days; t++) {
    const d = addDays(today, t);
    const r = bizOffset(d, lag);
    lagOff.push(t + r);
    payOff.push(t + r + bizOffset(addDays(d, r), i.retiro));
  }
  let bank = i.banco, wallet = i.dropi, locked = 0;
  const pend = [];                  // resoluciones: { day, ent, dev, payDay }
  const unlock = [];                // pagos que se liberan: { day, amount }
  // Pedidos que ya están en camino hoy: se resuelven repartidos en el plazo
  if (i.enCamino > 0) {
    const span = Math.max(1, bizOffset(today, lag));
    for (let k = 1; k <= span; k++) {
      const c = i.enCamino / span, e = c * i.pctEnt / 100;
      pend.push({ day: k, ent: e, dev: c - e, payDay: k + bizOffset(addDays(today, k), i.retiro) });
    }
  }
  const rows = [];
  let failDay = null, minBank = Infinity, minWallet = Infinity, maxReserve = 0;
  let adsOn = i.adsDia > 0;
  for (let t = 0; t < days; t++) {
    // 1) el banco paga los ads del día
    bank -= adsOn ? i.adsDia : 0;
    if (adsOn) pend.push({ day: lagOff[t], ent, dev, payDay: payOff[t] });
    // 2) lo que se resuelve hoy: las devoluciones cobran envío, las entregas dejan su pago bloqueado unos días
    for (const p of pend) if (p.day === t) {
      wallet -= p.dev * i.envio;
      locked += p.ent * netDel; unlock.push({ day: p.payDay, amount: p.ent * netDel });
    }
    for (const u of unlock) if (u.day === t) { locked -= u.amount; wallet += u.amount; }
    // 3) reserva = envíos que se perderían si todo lo que está en camino se devuelve
    const reserve = pend.filter(p => p.day > t).reduce((s, p) => s + p.dev * i.envio, 0);
    maxReserve = Math.max(maxReserve, reserve);
    // 4) reequilibrar
    if (wallet < reserve) { const m = reserve - wallet; bank -= m; wallet += m; }
    else if (wallet > reserve) { const m = wallet - reserve; bank += m; wallet -= m; }
    minBank = Math.min(minBank, bank); minWallet = Math.min(minWallet, wallet);
    if (failDay === null && bank < -0.005) { failDay = t; adsOn = false; }
    rows.push({ t, date: addDays(today, t), bank, wallet, locked, reserve, ads: adsOn ? i.adsDia : 0 });
  }
  return { rows, failDay, ordersPerDay, conf, ent, dev, netDel, minBank, maxReserve,
    perDay: ent * netDel - dev * i.envio - i.adsDia };
}

// Capital en banco que hace falta para sostener la campaña sin que falle
export function neededBank(i, lag, days = HORIZON) {
  const big = 1e9;
  const s = simulate({ ...i, banco: big }, lag, days);
  return Math.max(0, big - s.minBank);
}
// Mayor inversión diaria que tu dinero sostiene durante todo el horizonte
export function maxSafeAds(i, lag, days = HORIZON) {
  let lo = 0, hi = Math.max(1000, i.adsDia * 4 + i.banco + i.dropi);
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (simulate({ ...i, adsDia: mid }, lag, days).failDay === null) lo = mid; else hi = mid;
  }
  return lo;
}

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
  const [scen, setScen] = useState("peor");
  const plan = data.plan || {};
  const set = (k) => (e) => update(d => ({ ...d, plan: { ...(d.plan || {}), [k]: e.target.value } }));

  const auto = useMemo(() => {
    const rows = [];
    products.forEach(p => trkRows(p).forEach(r => rows.push({ ...r, p })));
    const dates = [...new Set(rows.map(r => r.date))].sort().slice(-3);
    if (!dates.length) return null;
    const t = trkSum(rows.filter(r => dates.includes(r.date)).map(r => r.c));
    const p0 = products[0];
    return { adsDia: t.ads / dates.length, cpa: t.pedidos > 0 ? t.ads / t.pedidos : 0, envio: p0.envio, precio: p0.precio, costo: p0.costo, comision: p0.comision ?? 2.5, pctConf: p0.pctConfirmados, pctEnt: p0.pctEntregados };
  }, [products]);
  const pick = (k, fb) => { const v = num(plan[k]); if (Number.isFinite(v)) return v; if (auto && auto[k]) return +Number(auto[k]).toFixed(2); return fb; };
  const isAuto = (k) => !!auto && !Number.isFinite(num(plan[k])) && !!auto[k];
  const i = {
    banco: Number.isFinite(num(plan.banco)) ? num(plan.banco) : Math.max(0, saldo),
    dropi: pick("dropi", 0), adsDia: pick("adsDia", 0), cpa: pick("cpa", 0),
    precio: pick("precio", 0), costo: pick("costo", 0), envio: pick("envio", 6), comision: pick("comision", 2.5),
    pctConf: pick("pctConf", 75), pctEnt: pick("pctEnt", 65),
    entMin: pick("entMin", 3), entMax: pick("entMax", 5), retiro: pick("retiro", 1),
    enCamino: Number.isFinite(num(plan.enCamino)) ? num(plan.enCamino) : 0,
  };
  const lags = { mejor: i.entMin, medio: Math.round((i.entMin + i.entMax) / 2), peor: i.entMax };
  const ready = i.adsDia > 0 && i.cpa > 0 && i.precio > 0;
  const sims = useMemo(() => ready ? Object.fromEntries(Object.entries(lags).map(([k, l]) => [k, { s: simulate(i, l), need: neededBank(i, l) }])) : null,
    [JSON.stringify(i), ready]);
  const cur = sims && sims[scen];
  const safe = useMemo(() => ready ? maxSafeAds(i, lags.peor) : 0, [JSON.stringify(i), ready]);
  const today = startOfToday();

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

  let head = null, tips = [];
  if (cur) {
    const { s, need } = cur;
    const ok = s.failDay === null;
    const loses = s.perDay < 0;
    const color = ok ? (loses ? C.amber : C.green) : C.red;
    const lastDay = s.failDay !== null && s.failDay > 0 ? addDays(today, s.failDay - 1) : null;
    head = { color,
      title: ok ? (loses ? `Aguantas ${HORIZON} días, pero tu campaña pierde dinero` : "Puedes mantener esta inversión sin quedarte sin fondos")
                : s.failDay === 0 ? "Con este ritmo no puedes ni empezar: te falta dinero" : `Puedes invertir ${s.failDay} ${s.failDay === 1 ? "día" : "días"} a este ritmo`,
      body: ok
        ? `Si inviertes ${fmt(i.adsDia)} al día, en el escenario ${scen === "peor" ? "más lento" : scen === "mejor" ? "más rápido" : "promedio"} tu dinero alcanza durante los próximos ${HORIZON} días${loses ? `, pero cada día pierdes unos ${fmt(-s.perDay)} en régimen: revisa tu CPA y tu precio` : ", porque lo que entra por los pedidos entregados repone lo que gastas"}.`
        : `Si inviertes ${fmt(i.adsDia)} al día${lastDay ? `, puedes hacerlo hasta el ${fmtDate(lastDay)}` : ""}. Después te quedas sin dinero para ads y para cubrir los envíos de Dropi${s.perDay < 0 ? ", porque en régimen cada día pierdes " + fmt(-s.perDay) : ", porque el dinero de los pedidos tarda en llegar"}.` };
    if (!ok || need > i.banco) tips.push({ c: C.red, t: `Para sostener ${fmt(i.adsDia)} al día necesitas tener en tu banco al menos ${fmt(need)}${need > i.banco ? ` (te faltan ${fmt(need - i.banco)})` : ""}.` });
    if (!ok || safe < i.adsDia) tips.push({ c: C.amber, t: `Con tu dinero actual, lo máximo que puedes invertir sin que falle es ${fmt(safe)} al día.` });
    if (s.perDay < 0) tips.push({ c: C.red, t: `Tu campaña pierde ${fmt(-s.perDay)} al día en régimen. Antes de meter más dinero baja el CPA (creativos nuevos, mejor oferta) o sube el precio.` });
    if (ok && !loses) tips.push({ c: C.green, t: `En régimen ganas unos ${fmt(s.perDay)} al día. Tu dinero te permite subir hasta ${fmt(safe)} al día.` });
    tips.push({ c: C.accent, t: `Mantén en Dropi al menos ${fmt(s.maxReserve)} para cubrir los envíos de devoluciones de los pedidos en camino, y lo que sobre retíralo a tu banco para ads.` });
  }

  const chartData = cur ? cur.s.rows.slice(0, 30).map(r => ({ f: short(r.date), Banco: +r.bank.toFixed(2), Dropi: +r.wallet.toFixed(2) })) : [];
  const scenBtn = (id, label) => (
    <button key={id} onClick={() => setScen(id)} style={{ background: scen === id ? C.accentDim : "transparent", border: `1px solid ${scen === id ? C.accent + "66" : C.border}`, color: scen === id ? C.accent : C.textDim, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Si mantienes tu campaña activa</div>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 14 }}>Escribe cuánto inviertes al día y tus costos. Simulo día por día tu banco y tu cuenta de Dropi (sin contar domingos) para decirte hasta cuándo puedes sostenerlo.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
          <PlanField {...fp} k="adsDia" label="Inversión diaria en ads" value={i.adsDia} auto={isAuto("adsDia")} hint="Lo que gastas por día." />
          <PlanField {...fp} k="cpa" label="CPA (por pedido)" value={i.cpa} auto={isAuto("cpa")} hint="Con esto calculo cuántos pedidos te entran." />
          <PlanField {...fp} k="precio" label="Precio de venta" value={i.precio} auto={isAuto("precio")} hint="Lo que paga el cliente." />
          <PlanField {...fp} k="costo" label="Costo del producto" value={i.costo} auto={isAuto("costo")} hint="Lo que te cobra el proveedor." />
          <PlanField {...fp} k="envio" label="Costo de envío" value={i.envio} auto={isAuto("envio")} hint="Promedio por envío." />
          <PlanField {...fp} k="comision" label="Comisión de plataforma (%)" value={i.comision} auto={isAuto("comision")} hint="Dropi u otra. 0 si no aplica." />
          <PlanField {...fp} k="pctConf" label="Confirmados (%)" value={i.pctConf} auto={isAuto("pctConf")} hint="De los pedidos, cuántos confirman." />
          <PlanField {...fp} k="pctEnt" label="Entregados (%)" value={i.pctEnt} auto={isAuto("pctEnt")} hint="De los confirmados, cuántos se entregan." />
          <PlanField {...fp} k="banco" label="Dinero en tu banco" value={i.banco} hint="Por defecto: el saldo de tu Control financiero." />
          <PlanField {...fp} k="dropi" label="Fondos en Dropi" value={i.dropi} hint="Lo que tienes hoy en Dropi." />
          <PlanField {...fp} k="enCamino" label="Pedidos en camino ahora (opcional)" value={i.enCamino} hint="Los que ya despachaste y aún no se resuelven." />
        </div>
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 12, color: C.textDim, cursor: "pointer" }}>Plazos de entrega y retiro</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginTop: 12 }}>
            <PlanField {...fp} k="entMin" label="Entrega, mínimo (días hábiles)" value={i.entMin} hint="Mejor caso." />
            <PlanField {...fp} k="entMax" label="Entrega, máximo (días hábiles)" value={i.entMax} hint="Peor caso." />
            <PlanField {...fp} k="retiro" label="Días para poder retirar" value={i.retiro} hint="Después de la entrega." />
          </div>
        </details>
      </div>

      {!ready && <div style={{ ...card, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Completa inversión diaria, CPA y precio de venta para ver tu proyección.</div>}

      {cur && head && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Velocidad de entrega:</span>
            {scenBtn("peor", `Más lenta (${lags.peor} días)`)}{scenBtn("medio", `Promedio (${lags.medio})`)}{scenBtn("mejor", `Más rápida (${lags.mejor})`)}
          </div>
          <div style={{ ...card, borderColor: `${head.color}55` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: head.color, flexShrink: 0 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: head.color }}>{head.title}</div>
            </div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginTop: 8 }}>{head.body}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {big("Máximo que puedes invertir al día", fmt(safe), C.accent, "Con tu dinero actual y entrega lenta, sin quedarte sin fondos.")}
            {big("Banco necesario para tu ritmo", fmt(cur.need), cur.need > i.banco ? C.red : C.green, cur.need > i.banco ? `Te faltan ${fmt(cur.need - i.banco)}.` : "Ya lo tienes.")}
            {big("Dropi debe tener", fmt(cur.s.maxReserve), C.amber, "Reserva para envíos de devoluciones.")}
            {big("Resultado diario en régimen", `${cur.s.perDay < 0 ? "−" : ""}${fmt(Math.abs(cur.s.perDay))}`, cur.s.perDay >= 0 ? C.green : C.red, `${cur.s.ordersPerDay.toFixed(1)} pedidos al día, ${cur.s.ent.toFixed(1)} entregados.`)}
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tu dinero en los próximos 30 días</div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="f" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Banco" stroke={C.accent} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Dropi" stroke={C.amber} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>Si la línea del banco baja de cero, ese día ya no puedes pagar ads. Dropi se mantiene en su reserva y el resto vuelve al banco.</div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Qué hacer</div>
            <div style={{ display: "grid", gap: 10 }}>
              {tips.map((x, k) => <div key={k} style={{ borderLeft: `3px solid ${x.c}`, paddingLeft: 12, fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{x.t}</div>)}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Según la velocidad de entrega</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[["peor", "Más lenta"], ["medio", "Promedio"], ["mejor", "Más rápida"]].map(([k, label]) => {
                const x = sims[k]; const fd = x.s.failDay;
                return (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 13, color: C.textDim, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <span>{label} ({lags[k]} días hábiles)</span>
                    <span style={{ color: fd === null ? C.green : C.red, fontWeight: 600 }}>{fd === null ? `Sostenible ${HORIZON}+ días` : fd === 0 ? "No alcanza" : `Alcanza ${fd} ${fd === 1 ? "día" : "días"}`} · banco necesario {fmt(x.need)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
        <Ic n="bulb" size={12} /> Cómo se calcula: cada día pagas ads desde el banco. Los pedidos confirmados se entregan en {i.entMin} a {i.entMax} días hábiles; los entregados te pagan precio − envío − costo − comisión y puedes retirarlo {i.retiro} día(s) después. Los devueltos cobran el envío a tu cuenta de Dropi. Cada día se reequilibra: lo que falta en Dropi sale del banco y lo que sobra vuelve al banco. Es una estimación: ajusta los datos a tu operación.
      </div>
    </div>
  );
}
