import { useState, useMemo, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { AppShell } from "../components/Shell";
import { Ic, Rich } from "../components/ui";
import { makeFmt } from "../lib/calc";
import { FIN_CATS, FIN_COLORS, FIN_LS, monthKey, monthLabel, sumBy, todayISO, uid8 } from "../lib/dates";
import { db, useAuth } from "../lib/firebase";


export function useFinance() {
  const { user } = useAuth();
  const [data, setData] = useState({ expenses: [], funds: [], capital: {} });
  const [status, setStatus] = useState("loading");
  const loaded = useRef(false);
  const dirty = useRef(false);
  const latest = useRef(data); latest.current = data;
  const userRef = useRef(user); userRef.current = user;

  useEffect(() => {
    loaded.current = false; dirty.current = false; setStatus("loading");
    (async () => {
      let d = null, failed = false;
      try {
        if (user) { const s = await getDoc(doc(db, "users", user.uid, "finance", "data")); if (s.exists()) d = s.data(); }
        else d = JSON.parse(localStorage.getItem(FIN_LS) || "null");
      } catch (e) { console.error(e); failed = true; }
      setData({ expenses: [], funds: [], capital: {}, ...(d || {}) });
      loaded.current = true; setStatus(failed ? "error" : "saved");
    })();
  }, [user?.uid]);

  const persist = async () => {
    const u = userRef.current;
    try {
      if (u) { const { updatedAt, ...clean } = latest.current; await setDoc(doc(db, "users", u.uid, "finance", "data"), { ...clean, updatedAt: serverTimestamp() }); }
      else localStorage.setItem(FIN_LS, JSON.stringify(latest.current));
      dirty.current = false; setStatus("saved");
    } catch (e) { console.error(e); setStatus("error"); }
  };

  useEffect(() => {
    if (!loaded.current || !dirty.current) return;
    setStatus("saving");
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [data]);
  useEffect(() => () => { if (dirty.current) persist(); }, []);

  const update = (fn) => { dirty.current = true; setData(fn); };
  return { data, update, status, user };
}


export function FinanceCenter({ onBackToCalc, onHome, onBackToFree }) {
  const { data, update, status, user } = useFinance();
  const { expenses, funds, capital } = data;
  const fmt = makeFmt("$");
  const curMonth = todayISO().slice(0, 7);
  const [section, setSection] = useState("resumen");
  const [month, setMonth] = useState(curMonth);
  const [catFilter, setCatFilter] = useState("all");

  const months = useMemo(() => {
    const s = new Set([...expenses.map(e => monthKey(e.date)), ...funds.map(f => monthKey(f.date)), ...Object.keys(capital), curMonth]);
    return [...s].filter(Boolean).sort();
  }, [expenses, funds, capital]);

  const stat = (k) => {
    const g = sumBy(expenses.filter(e => monthKey(e.date) === k));
    const f = sumBy(funds.filter(x => monthKey(x.date) === k));
    const c = Number(capital[k]) || 0;
    const total = c + f;
    return { g, f, c, total, saldo: total - g, pct: total > 0 ? (g / total) * 100 : 0 };
  };
  const cur = stat(month);
  const saldoRatio = cur.total > 0 ? cur.saldo / cur.total : 1;
  const saldoColor = cur.total <= 0 ? C.textDim : saldoRatio < 0.2 ? C.red : saldoRatio < 0.5 ? C.amber : C.green;

  const allCats = useMemo(() => [...new Set([...FIN_CATS, ...expenses.map(e => e.category).filter(Boolean)])], [expenses]);

  // forms
  const [ef, setEf] = useState({ concept: "", date: todayISO(), amount: "", category: FIN_CATS[0] });
  const [ff, setFf] = useState({ concept: "", date: todayISO(), amount: "", notes: "" });
  const addExpense = () => {
    const amount = parseFloat(ef.amount);
    if (!ef.concept.trim() || !ef.date || !(amount > 0)) return;
    update(d => ({ ...d, expenses: [{ id: uid8(), concept: ef.concept.trim(), date: ef.date, amount, category: ef.category.trim() || "Otros" }, ...d.expenses] }));
    setMonth(monthKey(ef.date));
    setEf({ ...ef, concept: "", amount: "" });
  };
  const addFund = () => {
    const amount = parseFloat(ff.amount);
    if (!ff.date || !(amount > 0)) return;
    update(d => ({ ...d, funds: [{ id: uid8(), concept: ff.concept.trim() || "Retiro Dropi", date: ff.date, amount, notes: ff.notes.trim() }, ...d.funds] }));
    setFf({ ...ff, concept: "", amount: "", notes: "" });
  };
  const delExpense = (id) => update(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  const delFund = (id) => update(d => ({ ...d, funds: d.funds.filter(f => f.id !== id) }));
  const setCapital = (k, v) => update(d => ({ ...d, capital: { ...d.capital, [k]: v === "" ? 0 : Number(v) } }));

  const needsSetup = status !== "loading" && !data.setupDone && Object.keys(capital).length === 0 && expenses.length === 0;
  const [setupAmt, setSetupAmt] = useState("");
  const [setupDate, setSetupDate] = useState(todayISO());
  const finishSetup = () => {
    const v = parseFloat(setupAmt);
    if (!(v >= 0) || setupAmt === "" || !setupDate) return;
    const k = monthKey(setupDate);
    update(d => ({ ...d, setupDone: true, capital: { ...d.capital, [k]: v } }));
    setMonth(k);
  };

  // styles
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 10px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", minWidth: 0, colorScheme: "dark" };
  const th = { textAlign: "left", fontSize: 10, color: C.textMuted, padding: "8px 8px", borderBottom: `2px solid ${C.accent}`, whiteSpace: "nowrap" };
  const td = { fontSize: 12, color: C.text, padding: "8px 8px", borderBottom: `1px solid ${C.border}` };
  const btn = (color) => ({ background: color, border: "none", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const kpi = (label, value, color, sub) => (
    <div style={{ ...card, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
  const MonthSelect = ({ all }) => (
    <select value={all ? catFilter : month} onChange={e => all ? setCatFilter(e.target.value) : setMonth(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
      {all && <option value="all">Todos los meses</option>}
      {[...months].reverse().map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
    </select>
  );
  const tooltipStyle = { contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }, labelStyle: { color: C.text }, itemStyle: { color: C.text } };

  const SECTIONS = [
    { id: "resumen", label: "📊 Resumen" },
    { id: "gastos", label: "🧾 Gastos" },
    { id: "categorias", label: "🗂 Por categoría" },
    { id: "historial", label: "📅 Historial" },
    { id: "fondos", label: "💸 Fondos Dropi" },
  ];

  // category aggregation
  const catList = catFilter === "all" ? expenses : expenses.filter(e => monthKey(e.date) === catFilter);
  const catData = Object.entries(catList.reduce((a, e) => { const c = e.category || "Otros"; a[c] = (a[c] || 0) + (Number(e.amount) || 0); return a; }, {}))
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const catTotal = catData.reduce((a, x) => a + x.value, 0);

  const monthExpenses = expenses.filter(e => monthKey(e.date) === month).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const monthFunds = funds.filter(f => monthKey(f.date) === month);
  const histData = months.map(k => ({ k, label: monthLabel(k), ...stat(k) }));

  const statusText = { loading: "Cargando…", saving: "Guardando…", saved: user ? "Guardado en tu cuenta" : "Guardado en este navegador", error: "Error al guardar" }[status];

  return (
    <AppShell active="fin" onHome={onHome} onCalc={onBackToCalc} onFinance={() => {}} onBackToFree={onBackToFree}
      right={<span className="hide-mobile" style={{ fontSize: 11, color: status === "error" ? C.red : C.textMuted }}>{statusText}</span>}>
      <GlobalStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 14px 50px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}><Ic n="💼" /> Control financiero</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Capital, gastos, fondos de Dropi y saldo de tu negocio, mes a mes.</div>
          {!user && <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>Inicia sesión para guardar tus finanzas en tu cuenta. Ahora se guardan solo en este navegador.</div>}
          <div className="show-mobile-only" style={{ fontSize: 10, color: status === "error" ? C.red : C.textMuted, marginTop: 6 }}>{statusText}</div>
        </div>

        {needsSetup && (
          <div style={{ ...card, maxWidth: 480, margin: "30px auto", textAlign: "center", border: `1px solid ${C.gold}40` }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}><Ic n="💰" /></div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Empecemos por tu capital</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, marginBottom: 16 }}>¿Con cuánto dinero cuenta tu negocio hoy? Es tu punto de partida: a partir de ahí se calculan tus gastos, fondos de Dropi y saldo.</div>
            <div style={{ textAlign: "left", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Capital actual ($)</div>
            <input type="number" min={0} step="0.01" placeholder="Ej: 1500" value={setupAmt} onChange={e => setSetupAmt(e.target.value)} onKeyDown={e => e.key === "Enter" && finishSetup()} style={{ ...inp, width: "100%", fontSize: 18, fontWeight: 700, marginBottom: 12 }} />
            <div style={{ textAlign: "left", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Fecha desde la que empiezas a llevar el control</div>
            <input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 16 }} />
            <button onClick={finishSetup} style={{ ...btn(C.gold), width: "100%", color: C.bg, fontWeight: 800, fontSize: 13 }}>Guardar y empezar</button>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10 }}>Podrás cambiarlo cuando quieras en la pestaña “Gastos”.</div>
          </div>
        )}
        <div style={{ display: needsSetup ? "none" : "block" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ padding: "7px 12px", background: section === s.id ? `${C.accent}1F` : C.card, border: `1px solid ${section === s.id ? C.accent : C.border}`, borderRadius: 9, color: section === s.id ? C.text : C.textDim, fontSize: 11, fontWeight: section === s.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}><Rich>{s.label}</Rich></button>
          ))}
        </div>

        {/* RESUMEN */}
        {section === "resumen" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Mes:</div><MonthSelect />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {kpi("Capital total del mes", fmt(cur.total), C.gold, `Capital inicial ${fmt(cur.c)} + Fondos Dropi ${fmt(cur.f)} · edítalo en “Gastos”`)}
              {kpi("Total gastos", fmt(cur.g), C.red, monthLabel(month))}
              {kpi("Saldo restante", `${cur.saldo < 0 ? "−" : ""}${fmt(cur.saldo)}`, saldoColor, cur.total > 0 ? `${((cur.saldo / cur.total) * 100).toFixed(0)}% del capital disponible` : "Define tu capital inicial en Gastos")}
            </div>
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: C.textDim }}>Capital utilizado este mes</span>
                <span style={{ fontWeight: 800, color: saldoColor }}>{cur.pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, cur.pct)}%`, height: "100%", background: saldoColor, borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}><Ic n="⚠" /> Saldo en ROJO = menos del 20% del capital · AMARILLO = entre 20% y 50%</div>
            </div>
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="⚡" /> Gastos recientes — {monthLabel(month)}</div>
              {monthExpenses.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Aún no hay gastos este mes. Ve a la pestaña “Gastos” para agregar el primero.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                    <thead><tr><th style={th}>Descripción</th><th style={th}>Categoría</th><th style={th}>Fecha</th><th style={{ ...th, textAlign: "right" }}>Monto</th></tr></thead>
                    <tbody>{monthExpenses.slice(0, 6).map(e => (
                      <tr key={e.id}><td style={td}>{e.concept}</td><td style={{ ...td, color: C.textDim }}>{e.category}</td><td style={{ ...td, color: C.textDim }}>{e.date}</td><td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(e.amount)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GASTOS */}
        {section === "gastos" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Mes:</div><MonthSelect />
              <div style={{ fontSize: 12, color: C.textDim, marginLeft: "auto" }}>Capital inicial del mes:</div>
              <input type="number" min={0} step="0.01" value={capital[month] ?? ""} onChange={e => setCapital(month, e.target.value)} placeholder="0.00" style={{ ...inp, width: 110 }} />
            </div>
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="➕" /> Registrar gasto</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <input placeholder="Concepto (ej: Fondos TikTok Ads)" value={ef.concept} onChange={e => setEf({ ...ef, concept: e.target.value })} style={{ ...inp, gridColumn: "span 2" }} />
                <input type="date" value={ef.date} onChange={e => setEf({ ...ef, date: e.target.value })} style={inp} />
                <input type="number" min={0} step="0.01" placeholder="Monto" value={ef.amount} onChange={e => setEf({ ...ef, amount: e.target.value })} onKeyDown={e => e.key === "Enter" && addExpense()} style={inp} />
                <input list="fin-cats" placeholder="Categoría" value={ef.category} onChange={e => setEf({ ...ef, category: e.target.value })} style={inp} />
                <datalist id="fin-cats">{allCats.map(c => <option key={c} value={c} />)}</datalist>
                <button onClick={addExpense} style={btn(C.accent)}>Agregar</button>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Gastos de {monthLabel(month)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{fmt(cur.g)}</div>
              </div>
              {monthExpenses.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>No hay gastos registrados en este mes.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                    <thead><tr><th style={th}>#</th><th style={th}>Concepto</th><th style={th}>Fecha</th><th style={{ ...th, textAlign: "right" }}>Monto</th><th style={th}>Categoría</th><th style={th}></th></tr></thead>
                    <tbody>{monthExpenses.map((e, i) => (
                      <tr key={e.id}>
                        <td style={{ ...td, color: C.textMuted }}>{monthExpenses.length - i}</td><td style={td}>{e.concept}</td><td style={{ ...td, color: C.textDim }}>{e.date}</td>
                        <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(e.amount)}</td><td style={{ ...td, color: C.textDim }}>{e.category}</td>
                        <td style={td}><button onClick={() => delExpense(e.id)} title="Borrar" style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}><Ic n="🗑" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIAS */}
        {section === "categorias" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.textDim }}>Ver:</div><MonthSelect all />
            </div>
            {catData.length === 0 ? <div style={{ ...card, fontSize: 12, color: C.textMuted }}>Aún no hay gastos para analizar.</div> : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...card, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                    <thead><tr><th style={th}>Categoría</th><th style={{ ...th, textAlign: "right" }}>Total gastado</th><th style={{ ...th, textAlign: "right" }}>% del total</th></tr></thead>
                    <tbody>
                      {catData.map((c, i) => (
                        <tr key={c.name}>
                          <td style={{ ...td, borderLeft: `3px solid ${FIN_COLORS[i % FIN_COLORS.length]}`, fontWeight: 600 }}>{c.name}</td>
                          <td style={{ ...td, textAlign: "right", color: FIN_COLORS[i % FIN_COLORS.length], fontWeight: 700 }}>{fmt(c.value)}</td>
                          <td style={{ ...td, textAlign: "right", color: C.textDim }}>{catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                      <tr><td style={{ ...td, fontWeight: 800 }}>TOTAL GENERAL</td><td style={{ ...td, textAlign: "right", fontWeight: 800, color: C.accent }}>{fmt(catTotal)}</td><td style={{ ...td, textAlign: "right" }}>100%</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Distribución de gastos por categoría</div>
                  <ResponsiveContainer width="100%" height={Math.max(220, catData.length * 42)}>
                    <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                      <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fill: C.textDim, fontSize: 10 }} />
                      <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>{catData.map((c, i) => <Cell key={c.name} fill={FIN_COLORS[i % FIN_COLORS.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {section === "historial" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead><tr><th style={th}>Mes</th><th style={{ ...th, textAlign: "right" }}>Total gastado</th><th style={{ ...th, textAlign: "right" }}>Fondos Dropi</th><th style={{ ...th, textAlign: "right" }}>Capital</th><th style={{ ...th, textAlign: "right" }}>Saldo</th></tr></thead>
                <tbody>{histData.map(h => (
                  <tr key={h.k}>
                    <td style={{ ...td, fontWeight: 600 }}>{h.label}</td>
                    <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>{fmt(h.g)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>{fmt(h.f)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.amber, fontWeight: 700 }}>{fmt(h.c)}</td>
                    <td style={{ ...td, textAlign: "right", color: C.accent, fontWeight: 700 }}>{h.saldo < 0 ? "−" : ""}{fmt(h.saldo)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Gastos por mes</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={histData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.textDim, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="g" name="Total gastado" fill={C.red} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="f" name="Fondos Dropi" fill={C.green} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FONDOS DROPI */}
        {section === "fondos" && (
          <div>
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}><Ic n="➕" /> Registrar retiro de Dropi</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                <input placeholder="Concepto (opcional)" value={ff.concept} onChange={e => setFf({ ...ff, concept: e.target.value })} style={inp} />
                <input type="date" value={ff.date} onChange={e => setFf({ ...ff, date: e.target.value })} style={inp} />
                <input type="number" min={0} step="0.01" placeholder="Monto retirado" value={ff.amount} onChange={e => setFf({ ...ff, amount: e.target.value })} style={inp} />
                <input placeholder="Notas" value={ff.notes} onChange={e => setFf({ ...ff, notes: e.target.value })} onKeyDown={e => e.key === "Enter" && addFund()} style={inp} />
                <button onClick={addFund} style={btn(C.green)}>Agregar</button>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Historial de fondos recuperados</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{fmt(sumBy(funds))}</div>
              </div>
              {funds.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Aún no registras retiros de Dropi.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                    <thead><tr><th style={{ ...th, borderBottomColor: C.green }}>Concepto</th><th style={{ ...th, borderBottomColor: C.green }}>Fecha</th><th style={{ ...th, borderBottomColor: C.green, textAlign: "right" }}>Monto retirado</th><th style={{ ...th, borderBottomColor: C.green }}>Notas</th><th style={{ ...th, borderBottomColor: C.green }}></th></tr></thead>
                    <tbody>{[...funds].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(f => (
                      <tr key={f.id}>
                        <td style={td}>{f.concept}</td><td style={{ ...td, color: C.textDim }}>{f.date}</td>
                        <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>{fmt(f.amount)}</td><td style={{ ...td, color: C.textDim }}>{f.notes}</td>
                        <td style={td}><button onClick={() => delFund(f.id)} title="Borrar" style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13 }}><Ic n="🗑" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}
