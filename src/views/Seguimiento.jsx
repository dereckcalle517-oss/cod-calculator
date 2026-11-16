import { useState, useEffect } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { fmtNum } from "../lib/calc";
import { MONTHS_ES, todayISO } from "../lib/dates";
import { useAuth } from "../lib/firebase";
import { openPlans } from "../lib/nav";
import { DayForm, MissingDays, ProductForm, RealForm, TRK_CONFIRM_AFTER, TRK_FREE_DAYS, TRK_FREE_PRODUCTS, TRK_TONE, TrkField, TrkLock, TrkStat, trkBtn2, trkCard, trkDayDiff, trkFmt, trkInp, trkLabel, trkLight, trkMonthStats, trkRecs, trkRows, trkSigned, trkSum, trkVisible, useTracking } from "../lib/tracking";


export function SeguimientoView() {
  const { isPro } = useAuth();
  const t = useTracking();
  const today = todayISO();
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState("view");
  const [date, setDate] = useState(today);
  const [realFor, setRealFor] = useState(null);
  const p = t.products.find(x => x.id === sel) || t.products[0] || null;
  useEffect(() => { setRealFor(null); setDate(todayISO()); }, [p && p.id]);
  const canAdd = isPro || t.products.length < TRK_FREE_PRODUCTS;
  const startNew = () => { if (!canAdd) return openPlans(); setMode("new"); };
  const wrap = { maxWidth: 1000, margin: "0 auto", padding: "28px 16px 60px" };
  const head = (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>Seguimiento</h1>
      <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.5 }}>Anota tu CPA y tus pedidos cada día. Cuadre calcula tu ganancia y te avisa cuando algo se sale de rumbo.</div>
    </div>
  );
  if (!t.loaded) return <div style={wrap}>{head}<div style={{ fontSize: 13, color: C.textMuted }}>Cargando tus productos...</div></div>;
  if (mode === "new" || (!t.products.length && !t.error)) {
    return (
      <div style={wrap}>{head}
        {!t.products.length && <div style={{ ...trkCard, marginBottom: 16, fontSize: 13.5, color: C.textDim, lineHeight: 1.6 }}>Empieza guardando un producto con sus costos y tus tasas. Después solo anotas el CPA y los pedidos de cada día.</div>}
        {t.error && <div role="alert" style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{t.error}</div>}
        <ProductForm onCancel={t.products.length ? () => setMode("view") : null}
          onSave={async (v) => { const id = await t.saveProduct(v); if (id) { setSel(id); setMode("view"); } }} />
      </div>
    );
  }
  if (!p) return <div style={wrap}>{head}<div role="alert" style={{ fontSize: 13, color: C.red }}>{t.error}</div></div>;
  if (mode === "edit") {
    return (
      <div style={wrap}>{head}
        {t.error && <div role="alert" style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{t.error}</div>}
        <ProductForm initial={p} onCancel={() => setMode("view")}
          onSave={async (v) => { const id = await t.saveProduct(v, p.id); if (id) setMode("view"); }}
          onDelete={async () => { if (await t.deleteProduct(p.id)) { setSel(null); setMode("view"); } }} />
      </div>
    );
  }
  const fmt = trkFmt(p);
  const all = trkRows(p);
  const rows = trkVisible(all, isPro, today);
  const hidden = all.length - rows.length;
  const light = trkLight(rows);
  const recs = trkRecs(p, rows, fmt, today);
  const shownRecs = isPro ? recs : recs.slice(0, 1);
  const wk = trkSum(rows.filter(r => trkDayDiff(today, r.date) < 7).map(r => r.c));
  const tod = rows.find(r => r.date === today);
  const ms = trkMonthStats(rows, today);
  const chart = (() => { let acc = 0; return rows.map(r => { acc += r.c.ganancia; return { f: trkLabel(r.date), g: +acc.toFixed(2) }; }); })();
  const sorted = [...rows].reverse();
  return (
    <div style={wrap}>{head}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {t.products.map(x => (
          <button key={x.id} onClick={() => setSel(x.id)} style={{ ...trkBtn2, padding: "8px 14px", ...(x.id === p.id ? { background: C.accentDim, color: C.accent, borderColor: `${C.accent}55` } : {}) }}>{x.name}</button>
        ))}
        <button onClick={startNew} style={{ ...trkBtn2, padding: "8px 14px" }}>{canAdd ? "+ Producto" : <><Ic n="lock" size={12} /> Más productos (PRO)</>}</button>
      </div>
      {t.error && <div role="alert" style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{t.error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 14 }}>
        <div style={{ ...trkCard, display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Registrar un día</div>
            <button onClick={() => setMode("edit")} style={{ ...trkBtn2, padding: "6px 12px", fontSize: 12 }}>Editar producto</button>
          </div>
          <TrkField label="Fecha"><input type="date" style={trkInp} value={date} max={today} min={isPro ? undefined : (() => { const d = new Date(); d.setDate(d.getDate() - (TRK_FREE_DAYS - 1)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()} onChange={(e) => e.target.value && setDate(e.target.value > today ? today : e.target.value)} /></TrkField>
          <DayForm p={p} date={date} />
        </div>
        <div style={{ ...trkCard, display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Cómo vas</div>
          {light ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: light.color, flexShrink: 0 }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: light.color }}>{light.label}</span>
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{light.text}</div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>CPA {fmt(wk.cpaAvg)} · máximo {fmt(wk.cpaMax)} (últimos 7 días)</div>
            </>
          ) : <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>Registra tu primer día y aquí verás si vas en verde, en amarillo o en rojo.</div>}
        </div>
      </div>
      <MissingDays p={p} today={today} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
        <TrkStat label="Hoy" value={tod ? trkSigned(fmt, tod.c.ganancia) : "—"} color={tod ? (tod.c.ganancia >= 0 ? C.green : C.red) : C.textMuted} sub={tod ? (tod.c.real ? "confirmado" : "estimado") : "Aún sin registrar"} />
        <TrkStat label="Últimos 7 días" value={trkSigned(fmt, wk.ganancia)} color={wk.ganancia >= 0 ? C.green : C.red} sub={`${fmtNum(wk.pedidos)} pedidos`} />
        <TrkStat label={`Acumulado de ${MONTHS_ES[+today.slice(5, 7) - 1].toLowerCase()}`} value={trkSigned(fmt, ms.m.ganancia)} color={ms.m.ganancia >= 0 ? C.green : C.red} sub={`${ms.n} ${ms.n === 1 ? "día registrado" : "días registrados"}`} />
        {isPro
          ? <TrkStat label="Proyección del mes" value={ms.n ? trkSigned(fmt, ms.proj) : "—"} color={ms.proj >= 0 ? C.text : C.red} sub={ms.n ? `Si sigues al ritmo de tus ${ms.n} días` : "Necesita al menos un día"} />
          : <button onClick={openPlans} style={{ ...trkCard, padding: 16, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text, borderColor: `${C.gold}33` }}><div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>Proyección del mes</div><div style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}><Ic n="lock" size={13} /> Solo PRO</div></button>}
      </div>
      <div style={{ ...trkCard, marginBottom: 14, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Recomendaciones</div>
        {!rows.length && <div style={{ fontSize: 13, color: C.textDim }}>Aparecerán cuando registres tus primeros días.</div>}
        {shownRecs.map((r, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${TRK_TONE[r.tone]}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55 }}>{r.text}</div>
            {r.steps && <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{r.steps.map((x, k) => <li key={k}>{x}</li>)}</ul>}
            {r.action === "edit" && <button onClick={() => setMode("edit")} style={{ ...trkBtn2, padding: "6px 12px", fontSize: 12, marginTop: 8 }}>Actualizar tasas del producto</button>}
          </div>
        ))}
        {!isPro && recs.length > 1 && <TrkLock text={`Tienes ${recs.length - 1} ${recs.length - 1 === 1 ? "recomendación más" : "recomendaciones más"}. Con PRO las ves todas.`} />}
      </div>
      {isPro ? (
        chart.length > 1 && (
          <div style={{ ...trkCard, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Ganancia acumulada</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="f" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => [trkSigned(fmt, v), "Acumulado"]} />
                  <Area type="monotone" dataKey="g" stroke={C.accent} fill={C.accentDim} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      ) : <div style={{ marginBottom: 14 }}><TrkLock text="Gráfica de ganancia acumulada, historial completo, desglose de CPA por día y confirmación de resultados reales." /></div>}
      <div style={{ ...trkCard, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", fontSize: 15, fontWeight: 700 }}>Historial</div>
        {!sorted.length && <div style={{ padding: "0 18px 18px", fontSize: 13, color: C.textDim }}>Todavía no hay días registrados.</div>}
        {sorted.map(r => {
          const pend = !r.c.real && trkDayDiff(today, r.date) >= TRK_CONFIRM_AFTER;
          return (
            <div key={r.date} style={{ borderTop: `1px solid ${C.border}`, padding: "14px 18px", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>{trkLabel(r.date)}</b>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: r.c.real ? C.green : C.textDim, background: r.c.real ? `${C.green}18` : C.accentDim }}>{r.c.real ? "confirmado" : "estimado"}</span>
                </div>
                <b style={{ fontSize: 15, color: r.c.ganancia >= 0 ? C.green : C.red }}>{trkSigned(fmt, r.c.ganancia)}</b>
              </div>
              <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.55 }}>
                {fmtNum(r.c.pedidos)} pedidos · CPA {fmt(r.c.cpa)} · ads {fmt(r.c.ads)}
                {isPro && <> · entregados {r.c.ent.toFixed(r.c.real ? 0 : 1)} · costo por entregado {fmt(r.c.cpaReal)} · CPA máx. {fmt(r.c.cpaMax)}</>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isPro
                  ? <button onClick={() => setRealFor(realFor === r.date ? null : r.date)} style={{ ...trkBtn2, padding: "5px 11px", fontSize: 12, ...(pend ? { color: C.amber, borderColor: `${C.amber}55` } : {}) }}>{r.c.real ? "Editar resultado real" : "Confirmar resultado real"}</button>
                  : <button onClick={openPlans} style={{ ...trkBtn2, padding: "5px 11px", fontSize: 12 }}><Ic n="lock" size={11} /> Confirmar resultado real</button>}
                <button onClick={() => { setDate(r.date); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ ...trkBtn2, padding: "5px 11px", fontSize: 12 }}>Corregir CPA/pedidos</button>
                <button onClick={() => { if (window.confirm("¿Borrar este día?")) t.deleteDay(p.id, r.date); }} style={{ ...trkBtn2, padding: "5px 11px", fontSize: 12 }}>Borrar</button>
              </div>
              {realFor === r.date && <RealForm p={p} date={r.date} d={r.d} onDone={() => setRealFor(null)} />}
            </div>
          );
        })}
        {hidden > 0 && <div style={{ borderTop: `1px solid ${C.border}`, padding: 14 }}><TrkLock text={`Hay ${hidden} ${hidden === 1 ? "día más antiguo" : "días más antiguos"}. El plan gratis muestra los últimos ${TRK_FREE_DAYS}.`} /></div>}
      </div>
    </div>
  );
}
