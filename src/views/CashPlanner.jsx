import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { C } from "../theme";
import { useTracking, trkRows, trkSum } from "../lib/tracking";
import { HORIZON, startOfToday, addDays, capitalNeeded, maxSafeAds, scenario } from "../lib/cashflow";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const fmtDate = (d) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
const short = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const PLATAFORMAS = ["TikTok Ads", "Meta Ads", "Google Ads", "Otra"];
const EJEMPLO = { banco: "1000", dropi: "300", adsDia: "30", cpa: "2.5", precio: "35.99", costo: "8", envio: "6" };

function PlanField({ k, label, hint, value, auto: a, plan, set, inp }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>{label}</span>
      <input style={inp} inputMode="decimal" value={plan[k] ?? ""} onChange={set(k)} placeholder={String(value)} />
      {(hint || a) && <span style={{ display: "block", fontSize: 10.5, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{a ? "De tu Seguimiento. " : ""}{hint}</span>}
    </label>
  );
}

export function CashPlanner({ data, update, saldo, fmt }) {
  const { products } = useTracking();
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
  // El motor usa el plazo más lento: así la recomendación es prudente
  const lag = i.entMax;
  const ready = i.adsDia > 0 && i.cpa > 0 && i.precio > 0;
  const key = JSON.stringify(i);

  const defEsc = [0.67, 1, 1.67, 2.67].map(m => Math.max(1, Math.round(i.adsDia * m)));
  const escNames = ["Conservador", "Actual", "Crecimiento", "Agresivo"];
  const escAds = defEsc.map((d, k) => { const v = num(plan["esc" + k]); return Number.isFinite(v) && v > 0 ? v : d; });

  const R = useMemo(() => {
    if (!ready) return null;
    return { main: scenario(i, i.adsDia, lag), safe: maxSafeAds(i, lag), sc: escAds.map(a => scenario(i, a, lag)) };
  }, [key, JSON.stringify(escAds), ready]);
  const today = startOfToday();

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box", colorScheme: "dark" };
  const fp = { plan, set, inp };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 };
  const hero = (label, value, color, sub) => (
    <div style={{ ...card, borderTop: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "clamp(24px,3.4vw,32px)", fontWeight: 700, color, letterSpacing: "-0.03em", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
  const chip = (id, label, on, onClick) => (
    <button key={id} onClick={onClick} style={{ background: on ? C.accentDim : "transparent", border: `1px solid ${on ? C.accent + "66" : C.border}`, color: on ? C.accent : C.textDim, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
  );
  const more = (title, children) => (
    <div style={card}><details><summary style={{ fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{title}</summary><div style={{ marginTop: 14 }}>{children}</div></details></div>
  );
  const ejemplo = () => update(d => ({ ...d, plan: { ...(d.plan || {}), ...EJEMPLO } }));

  let view = null;
  if (R) {
    const { main, safe, sc } = R;
    const s = main.s, need = main.need;
    const ok = s.failDay === null;
    const loses = s.perDay < 0;
    const color = ok ? (loses ? C.amber : C.green) : C.red;
    const dropiRec = need.dropi, bancoRec = need.banco;
    const dropiFalta = Math.max(0, dropiRec - i.dropi);
    // lo que pases a Dropi sale del banco: el faltante del banco se mide después de ese traspaso
    const bancoFalta = Math.max(0, bancoRec - (i.banco - dropiFalta));
    const totalFalta = Math.max(0, need.total - i.banco - i.dropi);
    const retirable = ok ? Math.max(0, i.dropi - dropiRec) : 0;
    const lastAd = s.failDay !== null && s.failDay > 0 ? addDays(today, s.failDay - 1) : null;
    const failWho = s.failWhy === "dropi" ? "en Dropi (para los envíos)" : "en tu banco (para los ads)";
    const days = ok ? "sin límite" : s.failDay === 0 ? "ningún día" : `${s.failDay} ${s.failDay === 1 ? "día" : "días"}`;
    const shipDay = (i.envioModo === "devolucion" ? s.dev : s.conf) * i.envio;
    const dropiDias = shipDay > 0 ? Math.round(dropiRec / shipDay) : 0;
    const bancoDias = i.adsDia + i.otros > 0 ? Math.round(bancoRec / (i.adsDia + i.otros)) : 0;
    const dd = (n) => `${n} ${n === 1 ? "día" : "días"}`;
    const first = s.firstRecovery !== null ? fmtDate(addDays(today, s.firstRecovery)) : null;

    const nextUp = sc.filter(x => x.ads > i.adsDia + 0.01).sort((a, b) => a.ads - b.ads)[0];
    const growNow = !!nextUp && ok && !loses && nextUp.need.total <= i.banco + i.dropi && nextUp.risk !== "alto";
    let growDate = null;
    if (nextUp && ok && !loses && !growNow) { const hit = s.rows.find(r => r.bank + r.wallet >= nextUp.need.total); if (hit) growDate = hit.date; }

    // Qué hacer: máximo 3 líneas, lo urgente primero
    const todo = [];
    if (!ok) todo.push({ c: C.red, t: `Baja tu inversión a ${fmt(safe)} al día o menos para no quedarte sin dinero.` });
    if (totalFalta > 0.005) todo.push({ c: C.red, t: `Para sostener ${fmt(i.adsDia)} al día te faltan ${fmt(totalFalta)} en total (banco + Dropi).` });
    else if (dropiFalta > 0) todo.push({ c: C.red, t: `Pasa ${fmt(dropiFalta)} de tu banco a Dropi para cubrir los envíos.` });
    if (loses) todo.push({ c: C.red, t: `Tu campaña pierde ${fmt(-s.perDay)} al día. Baja el CPA o sube el precio antes de invertir más.` });
    if (retirable > 0) todo.push({ c: C.green, t: `Puedes sacar ${fmt(retirable)} de Dropi a tu banco sin problema.` });
    if (growNow) todo.push({ c: C.green, t: `Ya puedes subir a ${fmt(nextUp.ads)} al día.` });
    else if (growDate) todo.push({ c: C.accent, t: `Podrás subir a ${fmt(nextUp.ads)} al día cerca del ${fmtDate(growDate)}.` });
    if (!todo.length) todo.push({ c: C.green, t: "Todo en orden: sigue registrando tus números y vuelve a revisar cada semana." });
    const recover = s.paybackDay === 0 ? "" : s.paybackDay !== null ? `Recuperas el dinero que pusiste cerca del ${fmtDate(addDays(today, s.paybackDay))}.` : `No alcanzas a recuperar lo invertido en ${HORIZON} días con estos números.`;

    const chartA = s.rows.slice(0, 30).map(r => ({ f: short(r.date), Banco: +r.bank.toFixed(2), Dropi: +r.wallet.toFixed(2) }));
    const chartB = s.rows.slice(0, 30).map(r => ({ f: short(r.date), "Gasto en ads": +r.ads.toFixed(2), "Dinero en pedidos sin cobrar": +r.committed.toFixed(2), "Dinero ya recuperado": +r.recovered.toFixed(2), "Todo tu dinero": +r.total.toFixed(2) }));
    const tt = { contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }, formatter: (v) => fmt(v) };
    const axis = { tick: { fill: C.textMuted, fontSize: 10 }, axisLine: false, tickLine: false };
    const riskC = { bajo: C.green, medio: C.amber, alto: C.red };
    const riskT = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
    const th = (h, left) => <th key={h} style={{ textAlign: left ? "left" : "right", padding: "6px 8px", color: C.textMuted, fontWeight: 600, borderBottom: `2px solid ${C.accent}`, whiteSpace: "nowrap" }}>{h}</th>;

    view = (
      <>
        <div style={{ ...card, borderColor: `${color}55` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: color, flexShrink: 0 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{ok ? `Puedes invertir hasta ${fmt(safe)} al día` : `Con tu dinero actual solo aguantas ${days}`}</div>
          </div>
          <div style={{ fontSize: 14.5, color: C.textDim, lineHeight: 1.65 }}>
            {ok
              ? <>Con {fmt(i.banco)} en el banco y {fmt(i.dropi)} en Dropi, tu inversión de {fmt(i.adsDia)} al día se puede sostener {days}.{first ? ` Tus primeras ventas te pagan el ${first}, y hasta entonces solo sale dinero.` : ""} Para aguantar ese tiempo deja <b style={{ color: C.text }}>{fmt(bancoRec)}</b> en tu banco (ads de unos {dd(bancoDias)}) y <b style={{ color: C.text }}>{fmt(dropiRec)}</b> en Dropi (envíos de {dd(dropiDias)}). Los envíos se pagan desde Dropi, no desde el banco.</>
              : <>Invirtiendo {fmt(i.adsDia)} al día se te acaba el dinero {failWho}{lastAd ? ` después del ${fmtDate(lastAd)}` : " desde el primer día"}. Lo máximo que aguanta hoy tu dinero es {fmt(safe)} al día. Para sostener {fmt(i.adsDia)} necesitas {fmt(bancoRec)} en el banco y {fmt(dropiRec)} en Dropi.</>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {hero("Invierte hasta", `${fmt(safe)}/día`, C.accent, safe >= i.adsDia ? `Hoy inviertes ${fmt(i.adsDia)}: vas bien.` : `Hoy inviertes ${fmt(i.adsDia)}: es mucho.`)}
          {hero("Deja en tu banco", fmt(bancoRec), bancoFalta > 0.005 ? C.red : C.green, bancoFalta > 0.005 ? `Ads de unos ${dd(bancoDias)}. Tras pasar a Dropi te faltarían ${fmt(bancoFalta)}.` : `Ads de unos ${dd(bancoDias)}. Te alcanza.`)}
          {hero("Deja en Dropi", fmt(dropiRec), dropiFalta > 0 ? C.red : C.amber, dropiFalta > 0 ? `Envíos de ${dd(dropiDias)}, hasta tu primer cobro. Pasa ${fmt(dropiFalta)} desde tu banco.` : `Envíos de ${dd(dropiDias)}, hasta tu primer cobro. Ya lo tienes.`)}
          {hero("Te alcanza para", ok ? "Sin límite" : days, ok ? C.green : C.red, ok ? "Mientras mantengas estos números." : "Antes de quedarte sin dinero.")}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Qué hacer ahora</div>
          <div style={{ display: "grid", gap: 10 }}>
            {todo.slice(0, 3).map((x, k) => <div key={k} style={{ borderLeft: `3px solid ${x.c}`, paddingLeft: 12, fontSize: 14, color: C.textDim, lineHeight: 1.55 }}>{x.t}</div>)}
          </div>
          {recover && <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55, marginTop: 12 }}>{recover}</div>}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Tu dinero en los próximos 30 días</div>
          <div style={{ width: "100%", height: 230 }}>
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
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>Si una línea toca cero, ese día no podrías pagar.</div>
        </div>

        {more("¿Y si invierto más o menos?", (
          <>
            <div style={{ fontSize: 12.5, color: C.textDim, marginBottom: 12 }}>Cambia los montos de arriba para probar otros presupuestos.</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600, fontSize: 13 }}>
                <thead><tr>
                  <th style={{ padding: "6px 8px" }}></th>
                  {escNames.map((n, k) => <th key={n} style={{ textAlign: "right", padding: "6px 8px", color: C.textDim }}>{n}<div><input aria-label={`Presupuesto ${n}`} value={plan["esc" + k] ?? ""} placeholder={String(defEsc[k])} onChange={set("esc" + k)} inputMode="decimal" style={{ ...inp, width: 78, textAlign: "right", marginTop: 4, padding: "6px 8px", fontSize: 12 }} /></div></th>)}
                </tr></thead>
                <tbody>
                  {[
                    ["Ganancia en 30 días", x => sg(x.neta30), x => (x.neta30 >= 0 ? C.green : C.red)],
                    ["Banco que necesitas", x => fmt(x.need.banco)],
                    ["Dropi que necesitas", x => fmt(x.need.dropi)],
                    ["Días que aguanta", x => (x.autonomia === null ? "Sin límite" : `${x.autonomia} ${x.autonomia === 1 ? "día" : "días"}`), x => (x.autonomia === null ? C.green : C.red)],
                    ["Riesgo de quedarte sin dinero", x => riskT[x.risk], x => riskC[x.risk]],
                    ["Pedidos en 30 días", x => Math.round(x.pedidos30)],
                    ["Entregas en 30 días", x => Math.round(x.entregas30)],
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

        {more("Día por día", (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780, fontSize: 12 }}>
              <thead><tr>{th("Día", true)}{th("Ads")}{th("Envíos pagados")}{th("Te pagan")}{th("Banco → Dropi")}{th("Dropi → banco")}{th("Banco")}{th("Dropi")}{th("Por cobrar")}</tr></thead>
              <tbody>
                {s.rows.map(r => (
                  <tr key={r.t} style={{ borderTop: `1px solid ${C.border}`, background: r.t === s.firstRecovery ? `${C.green}12` : "transparent" }}>
                    <td style={{ padding: "6px 8px", color: C.textDim, whiteSpace: "nowrap" }}>{fmtDate(r.date)}{r.t === s.firstRecovery ? " · primer pago" : ""}</td>
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
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>Banco y Dropi son saldos al cierre del día. "Por cobrar" es dinero de pedidos ya entregados que todavía no puedes retirar.</div>
          </div>
        ))}

        {more("Más detalle", (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 16 }}>
              {[["Pedidos al día", s.orders.toFixed(1)], ["Entregas al día", s.ent.toFixed(1)], ["Ventas en 30 días", fmt(s.ingresosDia * 30)], ["Ganancia en 30 días", sg(s.perDay * 30)]].map(([l, v]) => (
                <div key={l} style={{ background: C.surface, borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11.5, color: C.textMuted }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ width: "100%", height: 230 }}>
              <ResponsiveContainer>
                <LineChart data={chartB} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="f" {...axis} interval={4} /><YAxis {...axis} width={52} />
                  <Tooltip {...tt} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gasto en ads" stroke={C.red} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Dinero en pedidos sin cobrar" stroke={C.amber} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Dinero ya recuperado" stroke={C.green} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Todo tu dinero" stroke={C.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>"Todo tu dinero" suma banco, Dropi y lo que te deben de pedidos entregados. Si baja, estás financiando la operación; si sube, estás ganando.</div>
          </>
        ))}
      </>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>¿Cuánto puedo invertir en ads?</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55, marginTop: 3 }}>Escribe tus números y te digo cuánto invertir y cuánto dejar en tu banco y en Dropi.</div>
          </div>
          <button onClick={ejemplo} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 13px", color: C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Ver con un ejemplo</button>
        </div>
        <div style={grid}>
          <PlanField {...fp} k="banco" label="Dinero en tu banco" value={i.banco} hint="Por defecto, el saldo de Control financiero." />
          <PlanField {...fp} k="dropi" label="Dinero en Dropi" value={i.dropi} />
          <PlanField {...fp} k="adsDia" label="Inviertes al día en ads" value={i.adsDia} auto={isAuto("adsDia")} />
          <PlanField {...fp} k="cpa" label="Cuánto cuesta cada pedido (CPA)" value={i.cpa} auto={isAuto("cpa")} />
          <PlanField {...fp} k="precio" label="Precio de venta" value={i.precio} auto={isAuto("precio")} />
          <PlanField {...fp} k="costo" label="Costo del producto" value={i.costo} auto={isAuto("costo")} />
          <PlanField {...fp} k="envio" label="Costo de envío" value={i.envio} auto={isAuto("envio")} />
        </div>
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginTop: 14 }}>
          Supongo que {i.pctConf}% de los pedidos se confirman, {i.pctEnt}% de esos se entregan y tardan {i.entMax} días (sin domingos). Si no es tu caso, ajústalo abajo.
        </div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 13, color: C.textDim, cursor: "pointer", fontWeight: 600 }}>Ajustar supuestos</summary>
          <div style={{ ...grid, marginTop: 14 }}>
            <PlanField {...fp} k="pctConf" label="Pedidos que se confirman (%)" value={i.pctConf} auto={isAuto("pctConf")} />
            <PlanField {...fp} k="pctEnt" label="Confirmados que se entregan (%)" value={i.pctEnt} auto={isAuto("pctEnt")} />
            <PlanField {...fp} k="entMax" label="Días de entrega" value={i.entMax} hint="Sin contar domingos." />
            <PlanField {...fp} k="retiro" label="Días hasta que puedes retirar" value={i.retiro} hint="Después de la entrega." />
            <PlanField {...fp} k="transfer" label="Días de Dropi al banco" value={i.transfer} hint="0 si es inmediato." />
            <PlanField {...fp} k="deposito" label="Días del banco a Dropi" value={i.deposito} hint="0 si es inmediato." />
            <PlanField {...fp} k="retiroCada" label="Retiras de Dropi cada (días)" value={i.retiroCada} />
            <PlanField {...fp} k="comision" label="Comisión de plataforma (%)" value={i.comision} auto={isAuto("comision")} hint="0 si no aplica." />
            <PlanField {...fp} k="otros" label="Otros gastos al día" value={i.otros} hint="Herramientas, etc." />
            <PlanField {...fp} k="enCamino" label="Pedidos en camino ahora" value={i.enCamino} />
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, color: C.textDim, marginBottom: 5, fontWeight: 600 }}>Plataforma de ads</span>
              <select style={inp} value={plan.plataforma || PLATAFORMAS[0]} onChange={set("plataforma")}>{PLATAFORMAS.map(p => <option key={p}>{p}</option>)}</select>
            </label>
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>¿Cuándo cobra Dropi el envío?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip("d", "Al despachar", i.envioModo === "despacho", () => setRaw("envioModo", "despacho"))}
                {chip("v", "Solo si se devuelve", i.envioModo === "devolucion", () => setRaw("envioModo", "devolucion"))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6 }}>¿Cuándo pagas el costo del producto?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {chip("l", "Se descuenta al cobrar (Dropi)", i.costoModo === "liquidar", () => setRaw("costoModo", "liquidar"))}
                {chip("p", "Lo pago al despachar", i.costoModo === "despacho", () => setRaw("costoModo", "despacho"))}
              </div>
            </div>
          </div>
        </details>
      </div>

      {!ready && <div style={{ ...card, fontSize: 14, color: C.textDim, lineHeight: 1.6 }}>Escribe cuánto inviertes al día, tu CPA y tu precio de venta para ver tu resultado. O pulsa "Ver con un ejemplo".</div>}
      {view}

      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.6 }}>
        Son estimaciones basadas en los números que escribes, no garantías de resultados.
      </div>
    </div>
  );
}
