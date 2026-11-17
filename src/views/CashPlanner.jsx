import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { useTracking, trkRows, trkSum } from "../lib/tracking";
import { HORIZON, startOfToday, addDays, simulate, capitalNeeded, maxSafeAds, scenario } from "../lib/cashflow";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fmtDate = (d) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
const short = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const PLATAFORMAS = ["TikTok Ads", "Meta Ads", "Google Ads", "Otra"];

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
  const setRaw = (k, v) => update(d => ({ ...d, plan: { ...(d.plan || {}), [k]: v } }));
  const set = (k) => (e) => setRaw(k, e.target.value);
  const sg = (v) => `${v < -0.005 ? "−" : ""}${fmt(Math.abs(v))}`;

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
    precio: pick("precio", 0), costo: pick("costo", 0), envio: pick("envio", 6), comision: pick("comision", 2.5), otros: pick("otros", 0),
    pctConf: pick("pctConf", 75), pctEnt: pick("pctEnt", 65),
    entMin: pick("entMin", 3), entMax: pick("entMax", 5), retiro: pick("retiro", 1), transfer: pick("transfer", 1),
    enCamino: Number.isFinite(num(plan.enCamino)) ? num(plan.enCamino) : 0,
    envioModo: plan.envioModo === "devolucion" ? "devolucion" : "despacho",
    costoModo: plan.costoModo === "despacho" ? "despacho" : "liquidar",
    deposito: pick("deposito", 0), retiroCada: Math.max(1, pick("retiroCada", 3)),
  };
  const lags = { mejor: i.entMin, medio: Math.round((i.entMin + i.entMax) / 2), peor: i.entMax };
  const lag = lags[scen];
  const ready = i.adsDia > 0 && i.cpa > 0 && i.precio > 0;
  const key = JSON.stringify(i) + scen;

  // Presupuestos de los escenarios (editables); por defecto ~ 2/3, 1, 5/3 y 8/3 del actual
  const defEsc = [0.67, 1, 1.67, 2.67].map(m => Math.max(1, Math.round(i.adsDia * m)));
  const escNames = ["Conservador", "Actual", "Crecimiento", "Agresivo"];
  const escAds = defEsc.map((d, k) => { const v = num(plan["esc" + k]); return Number.isFinite(v) && v > 0 ? v : d; });

  const R = useMemo(() => {
    if (!ready) return null;
    const main = scenario(i, i.adsDia, lag);
    const safe = maxSafeAds(i, lag);
    const sc = escAds.map(a => scenario(i, a, lag));
    return { main, safe, sc };
  }, [key, JSON.stringify(escAds), ready]);
  const today = startOfToday();

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box", colorScheme: "dark" };
  const fp = { plan, set, inp };
  const kpi = (label, value, color, sub) => (
    <div style={{ ...card, borderLeft: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "clamp(19px,2.6vw,24px)", fontWeight: 700, color, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
    </div>
  );
  const chip = (id, label, on, onClick) => (
    <button key={id} onClick={onClick} style={{ background: on ? C.accentDim : "transparent", border: `1px solid ${on ? C.accent + "66" : C.border}`, color: on ? C.accent : C.textDim, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
  );

  let view = null;
  if (R) {
    const { main, safe, sc } = R;
    const s = main.s, need = main.need;
    const ok = s.failDay === null;
    const loses = s.perDay < 0;
    const color = ok ? (loses ? C.amber : C.green) : C.red;
    const dropiRec = need.dropi;
    const dropiFalta = Math.max(0, dropiRec - i.dropi);
    const retirable = Math.max(0, i.dropi - dropiRec);
    const bancoFalta = Math.max(0, need.banco - i.banco);
    const lastAd = s.failDay !== null && s.failDay > 0 ? addDays(today, s.failDay - 1) : null;
    const scenName = scen === "peor" ? "entrega más lenta" : scen === "mejor" ? "entrega más rápida" : "entrega promedio";

    // Escenario siguiente que ya es sostenible, para hablar de cuándo escalar
    const nextUp = sc.filter(x => x.ads > i.adsDia + 0.01).sort((a, b) => a.ads - b.ads)[0];
    let growDate = null;
    const growNow = !!nextUp && ok && nextUp.need.total <= i.banco + i.dropi && nextUp.risk !== "alto";
    if (nextUp && ok && !growNow) { const hit = s.rows.find(r => r.bank + r.wallet >= nextUp.need.total); if (hit) growDate = hit.date; }

    const summary = ok
      ? `Con tu capital actual, puedes invertir hasta ${fmt(safe)} diarios en publicidad (tu ritmo de ${fmt(i.adsDia)} es sostenible durante ${HORIZON}+ días con ${scenName}). Necesitas ${fmt(dropiRec)} en Dropi para cubrir los envíos y ${fmt(need.banco)} en tu banco para sostener las campañas. Estimo ${s.orders.toFixed(1)} pedidos al día, ${s.ent.toFixed(1)} entregados y ${sg(s.perDay)} de ganancia neta al día${retirable > 0 ? `. Podrías retirar ${fmt(retirable)} de Dropi sin comprometer la operación` : ""}${growNow ? `, y ya te alcanza para subir a ${fmt(nextUp.ads)} al día` : nextUp && growDate ? `, y podrías subir a ${fmt(nextUp.ads)} al día cerca del ${fmtDate(growDate)}` : ""}.`
      : `Con tu capital actual no puedes mantener ${fmt(i.adsDia)} al día: ${s.failDay === 0 ? "te quedas sin fondos desde el primer día" : `puedes sostenerlo ${s.failDay} ${s.failDay === 1 ? "día" : "días"}${lastAd ? `, hasta el ${fmtDate(lastAd)}` : ""}`} con ${scenName}. Lo máximo que aguanta tu dinero es ${fmt(safe)} al día. Para tu ritmo actual necesitas ${fmt(dropiRec)} en Dropi y ${fmt(need.banco)} en tu banco${bancoFalta + dropiFalta > 0 ? ` (te faltan ${fmt(bancoFalta + dropiFalta)})` : ""}.`;

    // Alertas basadas en la simulación
    const alerts = [];
    if (dropiFalta > 0) alerts.push({ c: C.red, t: `Tu saldo de Dropi (${fmt(i.dropi)}) no alcanza para financiar los envíos proyectados: necesitas ${fmt(dropiRec)}. Te faltan ${fmt(dropiFalta)}.` });
    if (!ok) alerts.push({ c: C.red, t: `Tu inversión de ${fmt(i.adsDia)} al día es demasiado alta para tu liquidez: se acaba el dinero ${lastAd ? "después del " + fmtDate(lastAd) : "desde el primer día"}.` });
    else if (s.minBank < i.adsDia * 3) alerts.push({ c: C.amber, t: `Tu banco llega a solo ${fmt(Math.max(0, s.minBank))} en el punto más bajo (${s.rows.reduce((m, r) => (r.bank < m.bank ? r : m), s.rows[0]).date ? short(s.rows.reduce((m, r) => (r.bank < m.bank ? r : m), s.rows[0]).date) : ""}): estás cerca de quedarte sin capital para publicidad.` });
    if (s.firstRecovery !== null && s.firstRecovery >= 4) alerts.push({ c: C.amber, t: `Hay un desfase de ${s.firstRecovery} días entre que empiezas a gastar y recibes tu primer dinero disponible (${fmtDate(addDays(today, s.firstRecovery))}). Hasta entonces tu capital solo sale.` });
    if (loses) alerts.push({ c: C.red, t: `Tu operación pierde ${fmt(-s.perDay)} al día en régimen. Antes de escalar baja el CPA o sube el precio.` });
    if (ok && !loses && safe >= i.adsDia * 1.2) alerts.push({ c: C.green, t: `Tienes capital para aumentar tu presupuesto hasta ${fmt(safe)} al día.` });
    if (retirable > 0 && ok) alerts.push({ c: C.green, t: `Puedes retirar ${fmt(retirable)} de Dropi sin comprometer tus operaciones.` });
    if (!alerts.length) alerts.push({ c: C.green, t: "No hay alertas: tu operación va equilibrada con estos datos." });

    const chartA = s.rows.slice(0, 30).map(r => ({ f: short(r.date), Banco: +r.bank.toFixed(2), Dropi: +r.wallet.toFixed(2), "Por liberar": +(r.locked + r.inTr).toFixed(2) }));
    const chartB = s.rows.slice(0, 30).map(r => ({ f: short(r.date), "Ads del día": +r.ads.toFixed(2), "Comprometido en pedidos": +r.committed.toFixed(2), "Ingresos recuperados": +r.recovered.toFixed(2), "Capital total": +r.total.toFixed(2) }));
    const tt = { contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }, formatter: (v) => fmt(v) };
    const axis = { tick: { fill: C.textMuted, fontSize: 10 }, axisLine: false, tickLine: false };

    const qa = [
      ["¿Cuánto puedo invertir al día?", `Hasta ${fmt(safe)} al día con tu dinero actual y ${scenName}.`],
      ["¿Cuánto necesito en Dropi?", `${fmt(dropiRec)} para cubrir los envíos${dropiFalta > 0 ? ` (te faltan ${fmt(dropiFalta)})` : " (ya lo tienes)"}.`],
      ["¿Cuánto necesito en el banco?", `${fmt(need.banco)} para sostener ${fmt(i.adsDia)} al día${bancoFalta > 0 ? ` (te faltan ${fmt(bancoFalta)})` : " (ya lo tienes)"}.`],
      ["¿Cuántos días puedo mantener mi inversión?", ok ? `Más de ${HORIZON} días.` : s.failDay === 0 ? "Ninguno: te falta dinero desde el inicio." : `${s.failDay} ${s.failDay === 1 ? "día" : "días"}.`],
      ["¿Cuánto puedo retirar de Dropi?", retirable > 0 && ok ? `${fmt(retirable)} sin comprometer tu operación.` : "Nada por ahora: todo lo de Dropi hace falta para los envíos."],
      ["¿Cuándo recupero el capital invertido?", s.paybackDay === 0 ? "No hay capital que recuperar: tu caja no baja de lo que tenías." : s.paybackDay !== null ? `Cerca del ${fmtDate(addDays(today, s.paybackDay))} tu capital total vuelve al nivel de hoy.` : `No dentro de ${HORIZON} días con estos datos.`],
      ["¿Cuándo puedo aumentar mi presupuesto?", !nextUp ? "Ya estás en el escenario más alto." : growNow ? `Ya puedes: para sostener ${fmt(nextUp.ads)} al día necesitas ${fmt(nextUp.need.total)} en total y tienes ${fmt(i.banco + i.dropi)}.` : growDate ? `Para subir a ${fmt(nextUp.ads)} al día necesitas ${fmt(nextUp.need.total)} en total: lo tendrías cerca del ${fmtDate(growDate)}.` : nextUp.need.total <= i.banco + i.dropi ? `Ya puedes: necesitas ${fmt(nextUp.need.total)} y tienes ${fmt(i.banco + i.dropi)}.` : `Necesitas ${fmt(nextUp.need.total)} en total; hoy tienes ${fmt(i.banco + i.dropi)}.`],
      ["¿Cuánto capital extra necesito para escalar?", nextUp ? `${fmt(Math.max(0, nextUp.need.total - i.banco - i.dropi))} más para sostener ${fmt(nextUp.ads)} al día.` : "No aplica."],
    ];
    const riskC = { bajo: C.green, medio: C.amber, alto: C.red };

    view = (
      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Velocidad de entrega:</span>
          {chip("peor", `Más lenta (${lags.peor} días)`, scen === "peor", () => setScen("peor"))}
          {chip("medio", `Promedio (${lags.medio})`, scen === "medio", () => setScen("medio"))}
          {chip("mejor", `Más rápida (${lags.mejor})`, scen === "mejor", () => setScen("mejor"))}
        </div>

        <div style={{ ...card, borderColor: `${color}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: color, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color }}>{ok ? (loses ? "Aguantas, pero tu campaña pierde dinero" : "Operación sostenible") : "Riesgo de quedarte sin liquidez"}</div>
          </div>
          <div style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.65 }}>{summary}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          {kpi("Inversión diaria recomendada", fmt(Math.min(safe, Math.max(i.adsDia, 0)) || safe), C.accent, safe >= i.adsDia ? `Tu ritmo actual (${fmt(i.adsDia)}) es sostenible. Máximo: ${fmt(safe)}.` : `Máximo que aguanta tu dinero.`)}
          {kpi("Capital necesario en Dropi", fmt(dropiRec), dropiFalta > 0 ? C.red : C.amber, "Para cubrir los envíos de los pedidos nuevos.")}
          {kpi("Capital necesario en el banco", fmt(need.banco), bancoFalta > 0 ? C.red : C.green, "Para sostener las campañas.")}
          {kpi("Días de autonomía", ok ? `${HORIZON}+` : String(s.failDay), ok ? C.green : C.red, ok ? "Sostenible en todo el horizonte." : "Hasta quedarte sin liquidez.")}
          {kpi("Pedidos al día", s.orders.toFixed(1), C.text, `${s.conf.toFixed(1)} confirmados`)}
          {kpi("Entregas al día", s.ent.toFixed(1), C.text, `${s.dev.toFixed(1)} no se entregan`)}
          {kpi("Ingresos proyectados (30 días)", fmt(s.ingresosDia * 30), C.text, "Ventas de pedidos entregados.")}
          {kpi("Ganancia neta (30 días)", sg(s.perDay * 30), s.perDay >= 0 ? C.green : C.red, `${sg(s.perDay)} al día. Gastos: ${fmt(s.gastosDia * 30)}.`)}
          {kpi("Capital retirable", fmt(retirable), retirable > 0 ? C.green : C.textDim, "De Dropi, sin comprometer envíos.")}
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Alertas</div>
          <div style={{ display: "grid", gap: 10 }}>
            {alerts.map((x, k) => <div key={k} style={{ borderLeft: `3px solid ${x.c}`, paddingLeft: 12, fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{x.t}</div>)}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Banco, Dropi y dinero por liberar (30 días)</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="f" {...axis} interval={4} /><YAxis {...axis} width={52} />
                <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Banco" stroke={C.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Dropi" stroke={C.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Por liberar" stroke={C.textMuted} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Si la línea del banco baja de cero, ese día ya no puedes pagar ads. "Por liberar" es dinero de pedidos entregados que aún no puedes retirar.</div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Gasto, capital comprometido e ingresos recuperados</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartB} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="f" {...axis} interval={4} /><YAxis {...axis} width={52} />
                <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Ads del día" stroke={C.red} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Comprometido en pedidos" stroke={C.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Ingresos recuperados" stroke={C.green} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Capital total" stroke={C.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Comprometido = ads y envíos pagados de pedidos que todavía no generan dinero. Capital total = banco + Dropi + dinero por liberar: si baja, estás financiando la operación; si sube, ganas.</div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Escenarios de inversión</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Cambia los presupuestos para ver cómo cambian tus resultados (con {scenName}).</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 12.5 }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: C.textMuted, fontWeight: 600 }}></th>
                {escNames.map((n, k) => <th key={n} style={{ textAlign: "right", padding: "6px 8px", color: C.textDim }}>{n}<div><input aria-label={`Presupuesto ${n}`} value={plan["esc" + k] ?? ""} placeholder={String(defEsc[k])} onChange={set("esc" + k)} inputMode="decimal" style={{ ...inp, width: 78, textAlign: "right", marginTop: 4, padding: "6px 8px", fontSize: 12 }} /></div></th>)}
              </tr></thead>
              <tbody>
                {[
                  ["Ads al día", x => fmt(x.ads)],
                  ["Pedidos (30 días)", x => Math.round(x.pedidos30)],
                  ["Entregas (30 días)", x => Math.round(x.entregas30)],
                  ["Ingresos (30 días)", x => fmt(x.ingresos30)],
                  ["Gastos (30 días)", x => fmt(x.gastos30)],
                  ["Ganancia neta (30 días)", x => sg(x.neta30), x => (x.neta30 >= 0 ? C.green : C.red)],
                  ["Banco necesario", x => fmt(x.need.banco)],
                  ["Dropi necesario", x => fmt(x.need.dropi)],
                  ["Autonomía", x => (x.autonomia === null ? `${HORIZON}+ días` : `${x.autonomia} ${x.autonomia === 1 ? "día" : "días"}`), x => (x.autonomia === null ? C.green : C.red)],
                  ["Riesgo de iliquidez", x => x.risk.charAt(0).toUpperCase() + x.risk.slice(1), x => riskC[x.risk]],
                ].map(([label, f, col]) => (
                  <tr key={label} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px", color: C.textDim }}>{label}</td>
                    {sc.map((x, k) => <td key={k} style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: col ? col(x) : C.text }}>{f(x)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recomendaciones</div>
          <div style={{ display: "grid", gap: 12 }}>
            {qa.map(([q, a]) => (
              <div key={q}><div style={{ fontSize: 13, fontWeight: 700 }}>{q}</div><div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55, marginTop: 2 }}>{a}</div></div>
            ))}
          </div>
        </div>

        <div style={card}>
          <details>
            <summary style={{ fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Proyección día por día</summary>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, fontSize: 12 }}>
                <thead><tr>{["Día", "Ads", "Envíos pagados", "Dinero liberado", "Banco", "Dropi", "Por liberar"].map(h => <th key={h} style={{ textAlign: h === "Día" ? "left" : "right", padding: "6px 8px", color: C.textMuted, fontWeight: 600, borderBottom: `2px solid ${C.accent}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {s.rows.map(r => (
                    <tr key={r.t} style={{ borderTop: `1px solid ${C.border}`, background: r.unlocked > 0 && r.t === s.firstRecovery ? `${C.green}12` : "transparent" }}>
                      <td style={{ padding: "6px 8px", color: C.textDim }}>{fmtDate(r.date)}{r.t === s.firstRecovery ? " · primer ingreso" : ""}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(r.ads)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(r.ship)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: r.unlocked > 0 ? C.green : C.textMuted }}>{fmt(r.unlocked)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: r.bank < 0 ? C.red : C.text, fontWeight: 600 }}>{sg(r.bank)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(r.wallet)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: C.textMuted }}>{fmt(r.locked + r.inTr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Asesor de liquidez</div>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 14 }}>Tu banco paga la publicidad y tu cuenta de Dropi paga los envíos. Simulo día por día cada grupo de pedidos (entrega, liquidación, retiro y transferencia, sin contar domingos) para decirte cuánto puedes invertir y cuánto necesitas en cada cuenta.</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, margin: "0 0 10px" }}>Tu capital</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
          <PlanField {...fp} k="banco" label="Saldo en tu banco" value={i.banco} hint="Por defecto: el saldo de tu Control financiero." />
          <PlanField {...fp} k="dropi" label="Saldo en Dropi" value={i.dropi} hint="Disponible hoy en Dropi." />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, margin: "0 0 10px" }}>Publicidad</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
          <PlanField {...fp} k="adsDia" label="Inversión diaria" value={i.adsDia} auto={isAuto("adsDia")} hint="Lo que gastas por día." />
          <PlanField {...fp} k="cpa" label="CPA promedio" value={i.cpa} auto={isAuto("cpa")} hint="Costo por pedido." />
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>Plataforma</span>
            <select style={inp} value={plan.plataforma || PLATAFORMAS[0]} onChange={set("plataforma")}>{PLATAFORMAS.map(p => <option key={p}>{p}</option>)}</select>
            <span style={{ display: "block", fontSize: 10, color: C.textMuted, marginTop: 4 }}>Dónde pautas.</span>
          </label>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, margin: "0 0 10px" }}>Producto y logística</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 18 }}>
          <PlanField {...fp} k="precio" label="Precio de venta" value={i.precio} auto={isAuto("precio")} hint="Lo que paga el cliente." />
          <PlanField {...fp} k="costo" label="Costo del producto" value={i.costo} auto={isAuto("costo")} hint="Lo que te cobra el proveedor." />
          <PlanField {...fp} k="envio" label="Costo de envío" value={i.envio} auto={isAuto("envio")} hint="Promedio por envío." />
          <PlanField {...fp} k="comision" label="Comisión de plataforma (%)" value={i.comision} auto={isAuto("comision")} hint="Dropi u otra. 0 si no aplica." />
          <PlanField {...fp} k="otros" label="Otros costos al día" value={i.otros} hint="Herramientas, suscripciones, etc." />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, margin: "0 0 10px" }}>Rendimiento y tiempos</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
          <PlanField {...fp} k="pctConf" label="Confirmados (%)" value={i.pctConf} auto={isAuto("pctConf")} hint="De los pedidos, cuántos confirman." />
          <PlanField {...fp} k="pctEnt" label="Entregados (%)" value={i.pctEnt} auto={isAuto("pctEnt")} hint="De los confirmados, cuántos se entregan." />
          <PlanField {...fp} k="entMin" label="Entrega, mínimo (días hábiles)" value={i.entMin} hint="Del pedido a la entrega. Mejor caso." />
          <PlanField {...fp} k="entMax" label="Entrega, máximo (días hábiles)" value={i.entMax} hint="Peor caso." />
          <PlanField {...fp} k="retiro" label="Días hasta poder retirar" value={i.retiro} hint="De la entrega a dinero disponible en Dropi." />
          <PlanField {...fp} k="transfer" label="Días de Dropi al banco" value={i.transfer} hint="Lo que tarda la transferencia. 0 si es inmediata." />
          <PlanField {...fp} k="enCamino" label="Pedidos en camino ahora (opcional)" value={i.enCamino} hint="Ya despachados y sin resolver." />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>¿Cuándo cobra Dropi el envío?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chip("d", "Al despachar el pedido", i.envioModo === "despacho", () => setRaw("envioModo", "despacho"))}
            {chip("v", "Solo si se devuelve", i.envioModo === "devolucion", () => setRaw("envioModo", "devolucion"))}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>Si Dropi descuenta el envío de tu saldo apenas se despacha, necesitas más capital en Dropi. Elige la opción que coincide con tu cuenta.</div>
        </div>
      </div>

      {!ready && <div style={{ ...card, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Completa inversión diaria, CPA y precio de venta para ver tu simulación.</div>}
      {view}

      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
        <Ic n="bulb" size={12} /> Son estimaciones basadas en las métricas que escribes, no garantías de resultados. Banco y Dropi se tratan como fondos separados: el dinero de un pedido solo cuenta cuando está entregado, liquidado y disponible. Los pedidos no entregados cuestan su envío y no dejan ingreso. Se asume que depositar del banco a Dropi es inmediato.
      </div>
    </div>
  );
}
