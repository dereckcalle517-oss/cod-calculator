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
    deposito: pick("deposito", 0), retiroCada: Math.max(1, pick("retiroCada", 3)),
    enCamino: Number.isFinite(num(plan.enCamino)) ? num(plan.enCamino) : 0,
    envioModo: plan.envioModo === "devolucion" ? "devolucion" : "despacho",
    costoModo: plan.costoModo === "despacho" ? "despacho" : "liquidar",
  };
  const lags = { mejor: i.entMin, medio: Math.round((i.entMin + i.entMax) / 2), peor: i.entMax };
  const lag = lags[scen];
  const ready = i.adsDia > 0 && i.cpa > 0 && i.precio > 0;
  const key = JSON.stringify(i) + scen;

  const defEsc = [0.67, 1, 1.67, 2.67].map(m => Math.max(1, Math.round(i.adsDia * m)));
  const escNames = ["Conservador", "Actual", "Crecimiento", "Agresivo"];
  const escAds = defEsc.map((d, k) => { const v = num(plan["esc" + k]); return Number.isFinite(v) && v > 0 ? v : d; });

  const R = useMemo(() => {
    if (!ready) return null;
    return { main: scenario(i, i.adsDia, lag), safe: maxSafeAds(i, lag), sc: escAds.map(a => scenario(i, a, lag)) };
  }, [key, JSON.stringify(escAds), ready]);
  const today = startOfToday();

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box", colorScheme: "dark" };
  const fp = { plan, set, inp };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 };
  const hero = (label, value, color, sub) => (
    <div style={{ ...card, borderTop: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "clamp(24px,3.4vw,32px)", fontWeight: 700, color, letterSpacing: "-0.03em", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
  const chip = (id, label, on, onClick) => (
    <button key={id} onClick={onClick} style={{ background: on ? C.accentDim : "transparent", border: `1px solid ${on ? C.accent + "66" : C.border}`, color: on ? C.accent : C.textDim, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
  );
  const detailsBox = (title, children, open) => (
    <div style={card}><details open={open}><summary style={{ fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{title}</summary><div style={{ marginTop: 14 }}>{children}</div></details></div>
  );

  let view = null;
  if (R) {
    const { main, safe, sc } = R;
    const s = main.s, need = main.need;
    const ok = s.failDay === null;
    const loses = s.perDay < 0;
    const color = ok ? (loses ? C.amber : C.green) : C.red;
    const dropiRec = need.dropi, bancoRec = need.banco;
    const dropiFalta = Math.max(0, dropiRec - i.dropi), bancoFalta = Math.max(0, bancoRec - i.banco);
    const retirable = ok ? Math.max(0, i.dropi - dropiRec) : 0;
    const lastAd = s.failDay !== null && s.failDay > 0 ? addDays(today, s.failDay - 1) : null;
    const scenName = scen === "peor" ? "entrega más lenta" : scen === "mejor" ? "entrega más rápida" : "entrega promedio";
    const failWho = s.failWhy === "dropi" ? "en Dropi (para los envíos)" : "en tu banco (para los ads)";

    const nextUp = sc.filter(x => x.ads > i.adsDia + 0.01).sort((a, b) => a.ads - b.ads)[0];
    const growNow = !!nextUp && ok && !loses && nextUp.need.total <= i.banco + i.dropi && nextUp.risk !== "alto";
    let growDate = null;
    if (nextUp && ok && !loses && !growNow) { const hit = s.rows.find(r => r.bank + r.wallet >= nextUp.need.total); if (hit) growDate = hit.date; }
    const days = ok ? `más de ${HORIZON} días` : s.failDay === 0 ? "ningún día" : `${s.failDay} ${s.failDay === 1 ? "día" : "días"}`;

    const main1 = ok
      ? `Con tu capital actual puedes invertir hasta ${fmt(safe)} diarios en publicidad${safe >= i.adsDia ? ` (tu ritmo de ${fmt(i.adsDia)} es sostenible)` : ""}. Necesitas mantener ${fmt(dropiRec)} en Dropi para cubrir los envíos y ${fmt(bancoRec)} en tu banco para financiar las campañas. Si mantienes tus métricas actuales, podrás sostener esta operación durante ${days}.`
      : `Con tu capital actual no puedes mantener ${fmt(i.adsDia)} diarios: te quedas sin dinero ${failWho}${lastAd ? ` después del ${fmtDate(lastAd)}` : " desde el primer día"}. Lo máximo que aguanta hoy tu dinero es ${fmt(safe)} diarios. Para tu ritmo actual necesitas ${fmt(dropiRec)} en Dropi y ${fmt(bancoRec)} en tu banco${dropiFalta + bancoFalta > 0 ? ` (te faltan ${fmt(dropiFalta + bancoFalta)} en total)` : ""}.`;
    const recover = s.paybackDay === 0 ? "Tu capital total no baja del que tienes hoy: no hay inversión que recuperar."
      : s.paybackDay !== null ? `Recuperarás el capital invertido cerca del ${fmtDate(addDays(today, s.paybackDay))}${s.firstRecovery !== null ? `; el primer dinero disponible llega el ${fmtDate(addDays(today, s.firstRecovery))}` : ""}.`
      : `No recuperas el capital dentro de ${HORIZON} días con estos datos${loses ? ": tu campaña pierde dinero" : ""}.`;
    const grow = !nextUp ? "Ya estás en el escenario de inversión más alto."
      : loses ? "No subas el presupuesto hasta que tu campaña deje ganancia: baja el CPA o sube el precio."
      : growNow ? `Ya tienes capacidad para subir a ${fmt(nextUp.ads)} diarios: necesitas ${fmt(nextUp.need.total)} en total y tienes ${fmt(i.banco + i.dropi)}.`
      : growDate ? `Podrás subir a ${fmt(nextUp.ads)} diarios cerca del ${fmtDate(growDate)}, cuando tengas ${fmt(nextUp.need.total)} en total.`
      : `Para subir a ${fmt(nextUp.ads)} diarios necesitas ${fmt(nextUp.need.total)} en total y hoy tienes ${fmt(i.banco + i.dropi)}: te faltan ${fmt(Math.max(0, nextUp.need.total - i.banco - i.dropi))}.`;

    const alerts = [];
    if (dropiFalta > 0) alerts.push({ c: C.red, t: `Deposita ${fmt(dropiFalta)} en Dropi: con ${fmt(i.dropi)} no alcanzas a cubrir los envíos hasta que lleguen tus primeros pagos.` });
    if (bancoFalta > 0) alerts.push({ c: C.red, t: `Te faltan ${fmt(bancoFalta)} en el banco para sostener ${fmt(i.adsDia)} diarios.` });
    if (!ok) alerts.push({ c: C.red, t: `Baja la inversión a ${fmt(safe)} diarios o menos para no quedarte sin dinero.` });
    else if (s.minBank < i.adsDia * 3) alerts.push({ c: C.amber, t: `Tu banco baja hasta ${fmt(Math.max(0, s.minBank))}: estás cerca de quedarte sin capital para publicidad.` });
    if (s.firstRecovery !== null && s.firstRecovery >= 4) alerts.push({ c: C.amber, t: `Pasan ${s.firstRecovery} días entre que empiezas a gastar y recibes tu primer dinero disponible. Hasta entonces el capital solo sale.` });
    if (loses) alerts.push({ c: C.red, t: `Tu operación pierde ${fmt(-s.perDay)} al día en régimen. Revisa el CPA y el precio.` });
    if (retirable > 0) alerts.push({ c: C.green, t: `Puedes retirar ${fmt(retirable)} de Dropi sin comprometer tus envíos.` });
    if (ok && !loses && safe >= i.adsDia * 1.2) alerts.push({ c: C.green, t: `Tienes margen para subir tu inversión hasta ${fmt(safe)} diarios.` });

    const chartA = s.rows.slice(0, 30).map(r => ({ f: short(r.date), Banco: +r.bank.toFixed(2), Dropi: +r.wallet.toFixed(2) }));
    const chartB = s.rows.slice(0, 30).map(r => ({ f: short(r.date), "Ads del día": +r.ads.toFixed(2), "Comprometido en pedidos": +r.committed.toFixed(2), "Ingresos recuperados": +r.recovered.toFixed(2), "Capital total": +r.total.toFixed(2) }));
    const tt = { contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }, formatter: (v) => fmt(v) };
    const axis = { tick: { fill: C.textMuted, fontSize: 10 }, axisLine: false, tickLine: false };
    const riskC = { bajo: C.green, medio: C.amber, alto: C.red };
    const th = (h, left) => <th key={h} style={{ textAlign: left ? "left" : "right", padding: "6px 8px", color: C.textMuted, fontWeight: 600, borderBottom: `2px solid ${C.accent}`, whiteSpace: "nowrap" }}>{h}</th>;

    view = (
      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Velocidad de entrega:</span>
          {chip("peor", `Más lenta (${lags.peor} días)`, scen === "peor", () => setScen("peor"))}
          {chip("medio", `Promedio (${lags.medio})`, scen === "medio", () => setScen("medio"))}
          {chip("mejor", `Más rápida (${lags.mejor})`, scen === "mejor", () => setScen("mejor"))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {hero("Puedes invertir al día", fmt(safe), C.accent, safe >= i.adsDia ? `Hasta ese monto. Tu ritmo de ${fmt(i.adsDia)} está dentro del límite.` : `Es el máximo que aguanta tu dinero. Hoy inviertes ${fmt(i.adsDia)}.`)}
          {hero("Ten en Dropi", fmt(dropiRec), dropiFalta > 0 ? C.red : C.amber, dropiFalta > 0 ? `Para cubrir envíos. Te faltan ${fmt(dropiFalta)}.` : "Para cubrir los envíos hasta que lleguen tus pagos.")}
          {hero("Ten en tu banco", fmt(bancoRec), bancoFalta > 0 ? C.red : C.green, bancoFalta > 0 ? `Para ads y costos. Te faltan ${fmt(bancoFalta)}.` : "Para pagar la publicidad y los costos.")}
          {hero("Días que sostienes tu operación", ok ? `${HORIZON}+` : String(s.failDay), ok ? C.green : C.red, ok ? "Sin quedarte sin dinero en ninguna cuenta." : `Hasta que se acaba el dinero ${failWho}.`)}
        </div>

        <div style={{ ...card, borderColor: `${color}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: color, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color }}>{ok ? (loses ? "Aguantas, pero tu campaña pierde dinero" : "Tu operación es sostenible") : "Riesgo de quedarte sin dinero"}</div>
          </div>
          <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.65 }}>{main1}</div>
          <div style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.65, marginTop: 10 }}>{recover}</div>
          <div style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.65, marginTop: 6 }}>{grow}</div>
        </div>

        {alerts.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Qué hacer</div>
            <div style={{ display: "grid", gap: 10 }}>
              {alerts.map((x, k) => <div key={k} style={{ borderLeft: `3px solid ${x.c}`, paddingLeft: 12, fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{x.t}</div>)}
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tu dinero en los próximos 30 días</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="f" {...axis} interval={4} /><YAxis {...axis} width={52} />
                <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Banco" stroke={C.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Dropi" stroke={C.amber} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>Dropi baja mientras pagas envíos y sube cuando llegan los pagos de los pedidos entregados. Si una línea toca cero, ese día no podrías pagar.</div>
        </div>

        {detailsBox("Escenarios de inversión", (
          <>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>Cambia los presupuestos para ver cómo cambian tus resultados (con {scenName}).</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 12.5 }}>
                <thead><tr>
                  <th style={{ padding: "6px 8px" }}></th>
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
          </>
        ))}

        {detailsBox("Proyección día por día", (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820, fontSize: 12 }}>
              <thead><tr>{th("Día", true)}{th("Ads")}{th("Envíos pagados")}{th("Pago disponible")}{th("Depósito a Dropi")}{th("Retiro al banco")}{th("Banco")}{th("Dropi")}{th("Por liberar")}</tr></thead>
              <tbody>
                {s.rows.map(r => (
                  <tr key={r.t} style={{ borderTop: `1px solid ${C.border}`, background: r.t === s.firstRecovery ? `${C.green}12` : "transparent" }}>
                    <td style={{ padding: "6px 8px", color: C.textDim, whiteSpace: "nowrap" }}>{fmtDate(r.date)}{r.t === s.firstRecovery ? " · primer ingreso" : ""}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(r.ads)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(r.ship)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: r.unlocked > 0 ? C.green : C.textMuted }}>{fmt(r.unlocked)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: r.dep > 0 ? C.amber : C.textMuted }}>{fmt(r.dep)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: r.wd > 0 ? C.accent : C.textMuted }}>{fmt(r.wd)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: r.bank < 0 ? C.red : C.text, fontWeight: 600 }}>{sg(r.bank)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: r.wallet < 0 ? C.red : C.text, fontWeight: 600 }}>{sg(r.wallet)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: C.textMuted }}>{fmt(r.locked + r.inTr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>Banco y Dropi son saldos al cierre del día. "Depósito" es dinero que pasa del banco a Dropi y "Retiro" el que pasa de Dropi al banco; "Por liberar" son pagos de pedidos entregados que aún no puedes retirar.</div>
          </div>
        ))}

        {detailsBox("Gasto, capital comprometido e ingresos recuperados", (
          <>
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
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>Comprometido = ads y envíos pagados de pedidos que todavía no generan dinero. Capital total = banco + Dropi + dinero por liberar (+ producto devuelto si compras el inventario): si baja, financias la operación; si sube, ganas.</div>
          </>
        ))}
      </>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>¿Cuánto puedo invertir en publicidad?</div>
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 14 }}>Escribe tus saldos y tus números. Tu banco paga la publicidad y tu cuenta de Dropi paga los envíos; simulo cada día para decirte cuánto gastar y cuánto reservar en cada cuenta.</div>
        <div style={grid}>
          <PlanField {...fp} k="banco" label="Saldo en tu banco" value={i.banco} hint="Por defecto: tu saldo de Control financiero." />
          <PlanField {...fp} k="dropi" label="Saldo en Dropi" value={i.dropi} hint="Disponible hoy." />
          <PlanField {...fp} k="adsDia" label="Inversión diaria en ads" value={i.adsDia} auto={isAuto("adsDia")} hint="Lo que gastas por día." />
          <PlanField {...fp} k="cpa" label="CPA promedio" value={i.cpa} auto={isAuto("cpa")} hint="Costo por pedido." />
          <PlanField {...fp} k="precio" label="Precio de venta" value={i.precio} auto={isAuto("precio")} hint="Lo que paga el cliente." />
          <PlanField {...fp} k="costo" label="Costo del producto" value={i.costo} auto={isAuto("costo")} hint="Lo que te cobra el proveedor." />
          <PlanField {...fp} k="envio" label="Costo de envío" value={i.envio} auto={isAuto("envio")} hint="Promedio por envío." />
          <PlanField {...fp} k="pctConf" label="Confirmados (%)" value={i.pctConf} auto={isAuto("pctConf")} hint="De los pedidos, cuántos confirman." />
          <PlanField {...fp} k="pctEnt" label="Entregados (%)" value={i.pctEnt} auto={isAuto("pctEnt")} hint="De los confirmados, cuántos se entregan." />
        </div>
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 13, color: C.textDim, cursor: "pointer", fontWeight: 600 }}>Datos avanzados (plazos, comisión y otros)</summary>
          <div style={{ ...grid, marginTop: 14 }}>
            <PlanField {...fp} k="comision" label="Comisión de plataforma (%)" value={i.comision} auto={isAuto("comision")} hint="Dropi u otra. 0 si no aplica." />
            <PlanField {...fp} k="otros" label="Otros costos al día" value={i.otros} hint="Herramientas, suscripciones, etc." />
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 11, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>Plataforma de ads</span>
              <select style={inp} value={plan.plataforma || PLATAFORMAS[0]} onChange={set("plataforma")}>{PLATAFORMAS.map(p => <option key={p}>{p}</option>)}</select>
              <span style={{ display: "block", fontSize: 10, color: C.textMuted, marginTop: 4 }}>Dónde pautas.</span>
            </label>
            <PlanField {...fp} k="entMin" label="Entrega, mínimo (días hábiles)" value={i.entMin} hint="Del pedido a la entrega. Mejor caso." />
            <PlanField {...fp} k="entMax" label="Entrega, máximo (días hábiles)" value={i.entMax} hint="Peor caso." />
            <PlanField {...fp} k="retiro" label="Días hasta poder retirar" value={i.retiro} hint="De la entrega a dinero disponible en Dropi." />
            <PlanField {...fp} k="transfer" label="Días de Dropi al banco" value={i.transfer} hint="Lo que tarda tu retiro. 0 si es inmediato." />
            <PlanField {...fp} k="deposito" label="Días del banco a Dropi" value={i.deposito} hint="Lo que tarda un depósito. 0 si es inmediato." />
            <PlanField {...fp} k="retiroCada" label="Retiras de Dropi cada (días)" value={i.retiroCada} hint="Cada cuánto sacas lo que sobra." />
            <PlanField {...fp} k="enCamino" label="Pedidos en camino ahora" value={i.enCamino} hint="Ya despachados y sin resolver." />
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>¿Cuándo cobra Dropi el envío?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip("d", "Al despachar el pedido", i.envioModo === "despacho", () => setRaw("envioModo", "despacho"))}
                {chip("v", "Solo si se devuelve", i.envioModo === "devolucion", () => setRaw("envioModo", "devolucion"))}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>Si descuenta el envío apenas despacha, necesitas más dinero en Dropi.</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>¿Cuándo se paga el costo del producto?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip("l", "Se descuenta al liquidar (Dropi)", i.costoModo === "liquidar", () => setRaw("costoModo", "liquidar"))}
                {chip("p", "Lo pago al despachar (compro inventario)", i.costoModo === "despacho", () => setRaw("costoModo", "despacho"))}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>Si lo pagas antes, sale de tu banco y necesitas más capital allí.</div>
            </div>
          </div>
        </details>
      </div>

      {!ready && <div style={{ ...card, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Completa inversión diaria, CPA y precio de venta para ver tu simulación.</div>}
      {view}

      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
        <Ic n="bulb" size={12} /> Son estimaciones basadas en las métricas que escribes, no garantías de resultados. Banco y Dropi son cuentas separadas: el dinero de un pedido solo cuenta cuando está entregado, liquidado y disponible, y mover dinero entre cuentas toma los días que indicas.
      </div>
    </div>
  );
}
