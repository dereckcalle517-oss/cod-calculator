import { useState, useMemo, useEffect, createContext, useContext } from "react";
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc, deleteField, FieldPath } from "firebase/firestore";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { CURRENCIES, makeFmt } from "./calc";
import { MONTHS_ES, monthKey, todayISO, uid8 } from "./dates";
import { db, useAuth } from "./firebase";
import { navTo, openPlans } from "./nav";


// ─── SEGUIMIENTO (productos y registro diario) ─────────────────────────────
export const TRK_FREE_PRODUCTS = 1;


export const TRK_FREE_DAYS = 7;


export const TRK_CONFIRM_AFTER = 7;


export const TrkCtx = createContext(null);


export const TRK_EMPTY = { products: [], loaded: true, error: "", saveProduct: async () => {}, saveDay: async () => {}, deleteDay: async () => {}, deleteProduct: async () => {} };


export const useTracking = () => useContext(TrkCtx) || TRK_EMPTY;


export const trkNum = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : NaN; };


export const trkDayDiff = (a, b) => Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);


export const trkLabel = (iso) => { const p = iso.split("-"); return `${+p[2]} ${MONTHS_ES[+p[1] - 1].slice(0, 3).toLowerCase()}`; };


export const trkFmt = (p) => makeFmt(((CURRENCIES.find(c => c.code === p.cur) || CURRENCIES[0]).symbol));


export const trkSigned = (fmt, v) => (v <= -0.005 ? "−" : "") + fmt(v);


export const trkSnap = (p) => ({ costo: p.costo, precio: p.precio, envio: p.envio, c: p.pctConfirmados, e: p.pctEntregados, comision: p.comision ?? 2.5, recupera: p.recupera !== false });


export function calcDay(p, d) {
  const s = d.snap || {};
  const costo = s.costo ?? p.costo, precio = s.precio ?? p.precio, envio = s.envio ?? p.envio;
  const pc = s.c ?? p.pctConfirmados, pe = s.e ?? p.pctEntregados;
  const comision = s.comision ?? p.comision ?? 2.5, recupera = s.recupera ?? p.recupera ?? true;
  const pedidos = Number(d.pedidos) || 0, cpa = Number(d.cpa) || 0;
  const real = d.real && Number.isFinite(d.real.ent) && Number.isFinite(d.real.conf) ? d.real : null;
  const conf = real ? real.conf : pedidos * pc / 100;
  const ent = real ? real.ent : conf * pe / 100;
  const dev = Math.max(0, conf - ent);
  const ing = ent * precio, dropi = ent * precio * comision / 100;
  const flete = ent * envio + dev * envio * 0.6;
  const prod = recupera ? ent * costo : (ent + dev) * costo;
  const ads = pedidos * cpa;
  const ganancia = ing - ads - flete - prod - dropi;
  return { pedidos, cpa, conf, ent, dev, ing, dropi, flete, prod, ads, ganancia, real: !!real,
    cpaReal: ent > 0 ? ads / ent : 0,
    cpaMax: pedidos > 0 ? Math.max(0, (ing - flete - prod - dropi) / pedidos) : 0,
    margen: ing > 0 ? (ganancia / ing) * 100 : 0 };
}


export function trkSum(list) {
  const t = { pedidos: 0, conf: 0, ent: 0, dev: 0, ing: 0, dropi: 0, flete: 0, prod: 0, ads: 0, ganancia: 0 };
  list.forEach(x => Object.keys(t).forEach(k => { t[k] += x[k]; }));
  t.cpaReal = t.ent > 0 ? t.ads / t.ent : 0;
  t.cpaAvg = t.pedidos > 0 ? t.ads / t.pedidos : 0;
  t.cpaMax = t.pedidos > 0 ? Math.max(0, (t.ing - t.flete - t.prod - t.dropi) / t.pedidos) : 0;
  t.margen = t.ing > 0 ? (t.ganancia / t.ing) * 100 : 0;
  return t;
}


export const trkRows = (p) => Object.entries(p.days || {}).map(([date, d]) => ({ date, d, c: calcDay(p, d) })).sort((a, b) => (a.date < b.date ? -1 : 1));


export const trkVisible = (rows, isPro, today) => (isPro ? rows : rows.filter(r => trkDayDiff(today, r.date) < TRK_FREE_DAYS));


export function trkLight(rows) {
  if (!rows.length) return null;
  const a = trkSum(rows.slice(-3).map(r => r.c));
  if (!(a.ent > 0)) return { id: "red", color: C.red, label: "Sin entregas", text: "Con tus tasas, estos días no dejan pedidos entregados." };
  if (a.cpaAvg > a.cpaMax) return { id: "red", color: C.red, label: "En rojo", text: "Tu CPA supera tu máximo: pierdes dinero por pedido." };
  if (a.cpaAvg > a.cpaMax * 0.85) return { id: "amber", color: C.amber, label: "Cuidado", text: "Estás cerca del límite. Un pequeño aumento del CPA te deja sin ganancia." };
  return { id: "green", color: C.green, label: "En verde", text: "Tu CPA está por debajo de tu máximo." };
}


export function trkRecs(p, rows, fmt, today) {
  const recs = [];
  if (!rows.length) return recs;
  const a = trkSum(rows.slice(-3).map(r => r.c));
  const perDay = a.pedidos / Math.max(1, rows.slice(-3).length);
  const lowerSteps = [
    "Pausa los anuncios que más gastan y menos pedidos traen; deja solo los mejores.",
    "Sube 2 o 3 creativos nuevos con otro gancho (problema, resultado, testimonio) y compáralos con los actuales.",
    "Haz la oferta más atractiva: combo 2x1, segundo con descuento, regalo o envío gratis. Más conversión baja el CPA.",
    "Revisa la página: foto principal, precio y botón de comprar visibles sin bajar, y reseñas arriba.",
  ];
  if (a.ent > 0 && a.cpaAvg > a.cpaMax) {
    const target = a.cpaMax * 0.9;
    recs.push({ tone: "red", title: "Estás perdiendo dinero por pedido", text: `Tu CPA de los últimos días es ${fmt(a.cpaAvg)} y tu máximo es ${fmt(a.cpaMax)}. Si lo bajas a ${fmt(target)}, ganarías unos ${fmt((a.cpaMax - target) * perDay)} más al día con tu volumen actual. Cómo bajarlo:`, steps: lowerSteps });
  } else if (a.ent > 0 && a.cpaAvg > a.cpaMax * 0.85) {
    recs.push({ tone: "amber", title: "Estás cerca de tu límite", text: `Tu CPA (${fmt(a.cpaAvg)}) está a ${fmt(a.cpaMax - a.cpaAvg)} de tu máximo (${fmt(a.cpaMax)}). Un pequeño aumento y dejas de ganar. Prepara creativos nuevos antes de que suba.`, steps: lowerSteps.slice(1, 3) });
  }
  const recent = rows.slice(-3), before = rows.slice(-10, -3);
  if (recent.length >= 2 && before.length >= 3) {
    const avg = (xs) => xs.reduce((s, r) => s + (r.d.cpa || 0), 0) / xs.length;
    const up = avg(before) > 0 ? (avg(recent) / avg(before) - 1) * 100 : 0;
    if (up >= 20) recs.push({ tone: "amber", title: `Tu CPA subió ${Math.round(up)}% en los últimos días`, text: `Pasó de ${fmt(avg(before))} a ${fmt(avg(recent))}. Casi siempre es fatiga: tu audiencia ya vio mucho tus anuncios. Qué hacer:`, steps: ["Sube 2 o 3 creativos nuevos con un ángulo distinto al que ya cansó.", "Prueba una oferta nueva (combo, regalo, envío gratis) para renovar el interés.", "Si el anuncio lleva muchos días, duplícalo con otra audiencia en vez de subirle presupuesto."] });
  }
  const reals = rows.filter(r => r.c.real);
  if (reals.length >= 2) {
    const t = trkSum(reals.map(r => r.c));
    const rc = t.pedidos > 0 ? (t.conf / t.pedidos) * 100 : 0, re = t.conf > 0 ? (t.ent / t.conf) * 100 : 0;
    if (re < p.pctEntregados - 8) recs.push({ tone: "amber", title: `Tu entrega real es ${re.toFixed(0)}%, no ${p.pctEntregados}%`, text: "Tus pedidos confirmados se entregan menos de lo que supones. Actualiza la tasa del producto y mejora la entrega:", steps: ["Confirma por WhatsApp o llamada antes de despachar.", "Avisa al cliente el día de entrega y el valor a pagar.", "Evita ciudades o zonas donde más te devuelven."], action: "edit" });
    if (rc < p.pctConfirmados - 8) recs.push({ tone: "amber", title: `Tu confirmación real es ${rc.toFixed(0)}%, no ${p.pctConfirmados}%`, text: "Se te confirman menos pedidos de los que supones. Actualiza la tasa del producto y mejora la confirmación:", steps: ["Escríbele al cliente en los primeros minutos tras el pedido.", "Usa un mensaje corto con el producto, el precio y la fecha de entrega.", "Haz una llamada a quien no responde el mensaje."], action: "edit" });
  }
  const w = trkSum(rows.slice(-7).map(r => r.c));
  if (w.ent > 0 && w.cpaAvg <= w.cpaMax && w.margen < 15) {
    const delta = Math.max(1, Math.round(p.precio * 0.05));
    const extra = delta * (w.ent / Math.max(1, w.pedidos)) * (1 - (p.comision ?? 2.5) / 100);
    recs.push({ tone: "info", title: "Tu CPA está bien, pero el margen es justo", text: `Tu margen de la semana es ${w.margen.toFixed(1)}%. Si subes el precio ${fmt(delta)}, tu CPA máximo sube a ${fmt(w.cpaMax + extra)} y tienes más espacio para escalar. Otras formas de dejar más por pedido:`, steps: ["Ofrece un combo (2 unidades con descuento) para subir el ticket promedio.", "Añade un upsell en la confirmación: un producto complementario.", "Negocia el costo del producto o el envío si ya tienes volumen."] });
  }
  const pend = rows.filter(r => !r.c.real && trkDayDiff(today, r.date) >= TRK_CONFIRM_AFTER);
  if (pend.length) recs.push({ tone: "info", title: `${pend.length} ${pend.length === 1 ? "día espera" : "días esperan"} tu resultado real`, text: "Ya pasó el tiempo de entrega. Confirma cuántos pedidos se entregaron para que tus números sean reales.", action: "confirm" });
  if (!recs.length) recs.push({ tone: "green", title: "Vas bien", text: `Tu CPA (${fmt(w.cpaAvg)}) está por debajo de tu máximo (${fmt(w.cpaMax)}). Sigue registrando cada día.` });
  const order = { red: 0, amber: 1, info: 2, green: 3 };
  return recs.sort((x, y) => order[x.tone] - order[y.tone]);
}


export const TRK_TONE = { red: C.red, amber: C.amber, info: C.accent, green: C.green };


export function TrackingProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setProducts([]); setLoaded(false); setError("");
    if (!user) return;
    let alive = true;
    getDocs(collection(db, "users", user.uid, "tracking"))
      .then(snap => { if (!alive) return; setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdMs || 0) - (b.createdMs || 0))); setLoaded(true); })
      .catch(e => { console.error(e); if (alive) { setError("No pudimos cargar tu seguimiento. Recarga la página; si sigue igual, escríbenos."); setLoaded(true); } });
    return () => { alive = false; };
  }, [user && user.uid]);
  const fail = (e) => { console.error(e); setError("No pudimos guardar el cambio. Revisa tu conexión e inténtalo otra vez."); };
  const api = useMemo(() => ({
    products, loaded, error,
    saveProduct: async (v, id) => {
      if (!user) return null;
      setError("");
      const pid = id || uid8();
      try {
        if (id) {
          await setDoc(doc(db, "users", user.uid, "tracking", pid), v, { merge: true });
          setProducts(ps => ps.map(p => (p.id === pid ? { ...p, ...v } : p)));
        } else {
          const full = { ...v, days: {}, createdMs: Date.now() };
          await setDoc(doc(db, "users", user.uid, "tracking", pid), full);
          setProducts(ps => [...ps, { id: pid, ...full }]);
        }
        return pid;
      } catch (e) { fail(e); return null; }
    },
    saveDay: async (pid, date, day) => {
      if (!user) return false;
      setError("");
      try {
        await setDoc(doc(db, "users", user.uid, "tracking", pid), { days: { [date]: day } }, { merge: true });
        setProducts(ps => ps.map(p => (p.id === pid ? { ...p, days: { ...(p.days || {}), [date]: day } } : p)));
        return true;
      } catch (e) { fail(e); return false; }
    },
    deleteDay: async (pid, date) => {
      if (!user) return false;
      setError("");
      try {
        await updateDoc(doc(db, "users", user.uid, "tracking", pid), new FieldPath("days", date), deleteField());
        setProducts(ps => ps.map(p => { if (p.id !== pid) return p; const d = { ...(p.days || {}) }; delete d[date]; return { ...p, days: d }; }));
        return true;
      } catch (e) { fail(e); return false; }
    },
    deleteProduct: async (pid) => {
      if (!user) return false;
      setError("");
      try { await deleteDoc(doc(db, "users", user.uid, "tracking", pid)); setProducts(ps => ps.filter(p => p.id !== pid)); return true; }
      catch (e) { fail(e); return false; }
    },
  }), [products, loaded, error, user && user.uid]);
  return <TrkCtx.Provider value={api}>{children}</TrkCtx.Provider>;
}


export const trkInp = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", colorScheme: "dark" };


export const trkBtn = { background: C.text, border: "none", borderRadius: 10, padding: "11px 18px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };


export const trkBtn2 = { background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", color: C.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };


export const trkCard = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 };


export function TrkField({ label, hint, children }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11, color: C.textMuted, marginTop: 5, lineHeight: 1.45 }}>{hint}</span>}
    </label>
  );
}


export function TrkLock({ text }) {
  return (
    <div style={{ ...trkCard, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderColor: `${C.gold}33`, background: `${C.gold}08` }}>
      <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5, flex: "1 1 220px" }}><span style={{ color: C.gold, fontWeight: 700 }}><Ic n="lock" size={13} /> Solo PRO.</span> {text}</div>
      <button onClick={openPlans} style={{ ...trkBtn, background: C.gold }}>Ver planes</button>
    </div>
  );
}


export function ProductForm({ initial, onSave, onCancel, onDelete }) {
  const { profile } = useAuth();
  const pr = (profile && profile.prefs) || {};
  const [f, setF] = useState(() => ({
    name: (initial && initial.name) || "", cur: (initial && initial.cur) || pr.currency || "USD",
    precio: initial ? initial.precio : "", costo: initial ? initial.costo : "", envio: initial ? initial.envio : (pr.envio ?? ""),
    c: initial ? initial.pctConfirmados : (pr.pctConfirmados ?? 75), e: initial ? initial.pctEntregados : (pr.pctEntregados ?? 65),
    comision: initial ? (initial.comision ?? 2.5) : 2.5, recupera: initial ? initial.recupera !== false : true,
  }));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const v = { name: f.name.trim(), cur: f.cur, precio: trkNum(f.precio), costo: trkNum(f.costo), envio: trkNum(f.envio), pctConfirmados: trkNum(f.c), pctEntregados: trkNum(f.e), comision: trkNum(f.comision), recupera: !!f.recupera };
    if (!v.name) return setErr("Ponle un nombre al producto.");
    if (!(v.precio > 0)) return setErr("El precio de venta debe ser mayor que 0.");
    if (![v.costo, v.envio, v.comision].every(n => n >= 0)) return setErr("Costo, envío y comisión deben ser números de 0 o más.");
    if (![v.pctConfirmados, v.pctEntregados].every(n => n >= 0 && n <= 100)) return setErr("Las tasas van de 0 a 100.");
    setErr(""); setSaving(true); await onSave(v); setSaving(false);
  };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 };
  return (
    <form onSubmit={submit} style={{ ...trkCard, padding: 22, display: "grid", gap: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{initial ? "Editar producto" : "Nuevo producto"}</div>
      <div style={grid}>
        <TrkField label="Nombre del producto"><input style={trkInp} value={f.name} onChange={set("name")} placeholder="Ej: Decant Club de Nuit" maxLength={60} /></TrkField>
        <TrkField label="Moneda"><select style={trkInp} value={f.cur} onChange={set("cur")}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></TrkField>
      </div>
      <div style={grid}>
        <TrkField label="Precio de venta"><input style={trkInp} inputMode="decimal" value={f.precio} onChange={set("precio")} placeholder="35.99" /></TrkField>
        <TrkField label="Costo del producto"><input style={trkInp} inputMode="decimal" value={f.costo} onChange={set("costo")} placeholder="8" /></TrkField>
        <TrkField label="Costo de envío"><input style={trkInp} inputMode="decimal" value={f.envio} onChange={set("envio")} placeholder="5" /></TrkField>
      </div>
      <div style={grid}>
        <TrkField label="Pedidos confirmados (%)" hint="De cada 100 pedidos, cuántos confirma el cliente."><input style={trkInp} inputMode="decimal" value={f.c} onChange={set("c")} /></TrkField>
        <TrkField label="Confirmados que se entregan (%)" hint="De los confirmados, cuántos recibe y paga."><input style={trkInp} inputMode="decimal" value={f.e} onChange={set("e")} /></TrkField>
        <TrkField label="Comisión de plataforma (%)" hint="Dropi u otra. Déjalo en 0 si no aplica."><input style={trkInp} inputMode="decimal" value={f.comision} onChange={set("comision")} /></TrkField>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.textDim, cursor: "pointer" }}>
        <input type="checkbox" checked={f.recupera} onChange={(e) => setF({ ...f, recupera: e.target.checked })} /> Recupero el producto cuando lo devuelven
      </label>
      {initial && <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Los días ya registrados conservan los valores con los que se guardaron. El cambio aplica a los días nuevos.</div>}
      {err && <div role="alert" style={{ fontSize: 13, color: C.red }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={saving} style={{ ...trkBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Guardando..." : "Guardar producto"}</button>
        {onCancel && <button type="button" onClick={onCancel} style={trkBtn2}>Cancelar</button>}
        {initial && onDelete && (confirmDel
          ? <button type="button" onClick={onDelete} style={{ ...trkBtn2, color: C.red, borderColor: `${C.red}55`, marginLeft: "auto" }}>Sí, eliminar producto y su historial</button>
          : <button type="button" onClick={() => setConfirmDel(true)} style={{ ...trkBtn2, marginLeft: "auto" }}>Eliminar</button>)}
      </div>
    </form>
  );
}


export function trkLast(p, date) {
  const ds = Object.keys(p.days || {}).filter(k => k < date).sort();
  return ds.length ? p.days[ds[ds.length - 1]] : null;
}


export function TrkStep({ onMinus, onPlus, label }) {
  const b = { width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 18, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 };
  return (<><button type="button" aria-label={`Menos ${label}`} onClick={onMinus} style={b}>−</button><button type="button" aria-label={`Más ${label}`} onClick={onPlus} style={b}>+</button></>);
}


export function DayForm({ p, date, onSaved }) {
  const t = useTracking();
  const existing = (p.days || {})[date];
  const last = existing ? null : trkLast(p, date);
  const [cpa, setCpa] = useState("");
  const [ped, setPed] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    const e = (p.days || {})[date], l = e ? null : trkLast(p, date);
    setCpa(e ? String(e.cpa) : l ? String(l.cpa) : ""); setPed(e ? String(e.pedidos) : l ? String(l.pedidos) : "");
    setSaved(null); setErr("");
  }, [p.id, date]);
  const fmt = trkFmt(p);
  const nC = trkNum(cpa), nP = trkNum(ped);
  const valid = cpa !== "" && ped !== "" && nC >= 0 && nP >= 0;
  const preview = valid ? calcDay(p, { ...(existing || { snap: trkSnap(p) }), cpa: nC, pedidos: nP }) : null;
  const bump = (set, cur, d, dec) => () => { const n = trkNum(cur); const v = Math.max(0, (Number.isFinite(n) ? n : 0) + d); set(dec ? String(+v.toFixed(2)) : String(Math.round(v))); setSaved(null); };
  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return setErr("Escribe el CPA y los pedidos del día (puede ser 0).");
    setErr(""); setBusy(true);
    const day = { ...(existing || { snap: trkSnap(p) }), cpa: nC, pedidos: nP, updatedMs: Date.now() };
    const done = await t.saveDay(p.id, date, day);
    setBusy(false);
    if (done) { setSaved(calcDay(p, day)); onSaved && onSaved(); }
  };
  const mk = (() => { if (!saved) return null; const q = { ...p, days: { ...(p.days || {}) } }; const rs = trkRows(q); const ms = trkMonthStats(rs, todayISO()); return { ms, light: trkLight(rs) }; })();
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {last && <div style={{ fontSize: 12, color: C.textMuted }}>Te dejé los valores del último día registrado. Ajústalos si cambiaron.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
        <TrkField label="CPA del día">
          <div style={{ display: "flex", gap: 6 }}><input style={trkInp} inputMode="decimal" value={cpa} onChange={(e) => { setCpa(e.target.value); setSaved(null); }} placeholder="4.50" /><TrkStep label="CPA" onMinus={bump(setCpa, cpa, -0.1, true)} onPlus={bump(setCpa, cpa, 0.1, true)} /></div>
        </TrkField>
        <TrkField label="Pedidos del día">
          <div style={{ display: "flex", gap: 6 }}><input style={trkInp} inputMode="numeric" value={ped} onChange={(e) => { setPed(e.target.value); setSaved(null); }} placeholder="12" /><TrkStep label="pedidos" onMinus={bump(setPed, ped, -1)} onPlus={bump(setPed, ped, 1)} /></div>
        </TrkField>
      </div>
      {preview && !saved && (
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>
          Gastaste <b style={{ color: C.text }}>{fmt(preview.ads)}</b> en ads. Con tus tasas, la ganancia estimada es{" "}
          <b style={{ color: preview.ganancia >= 0 ? C.green : C.red }}>{trkSigned(fmt, preview.ganancia)}</b>.
        </div>
      )}
      {err && <div role="alert" style={{ fontSize: 13, color: C.red }}>{err}</div>}
      {t.error && <div role="alert" style={{ fontSize: 13, color: C.red }}>{t.error}</div>}
      <button type="submit" disabled={busy} style={{ ...trkBtn, justifySelf: "start", opacity: busy ? 0.7 : 1 }}>{busy ? "Guardando..." : existing || saved ? "Actualizar día" : "Guardar día"}</button>
      {saved && mk && (
        <div role="status" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "grid", gap: 4 }}>
          <div style={{ fontSize: 13, color: C.green }}><Ic n="check" size={14} /> Guardado</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{trkLabel(date)}: <span style={{ color: saved.ganancia >= 0 ? C.green : C.red }}>{saved.ganancia >= 0 ? "ganaste" : "perdiste"} {fmt(saved.ganancia)}</span> (estimado)</div>
          <div style={{ fontSize: 13, color: C.textDim }}>Vas {trkSigned(fmt, mk.ms.m.ganancia)} este mes{mk.light ? <> · <b style={{ color: mk.light.color }}>{mk.light.label}</b></> : null}</div>
        </div>
      )}
    </form>
  );
}


export function MissingDays({ p, today }) {
  const t = useTracking();
  const days = p.days || {};
  const keys = Object.keys(days).sort();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  if (!keys.length) return null;
  const miss = [];
  for (let i = TRK_FREE_DAYS - 1; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (iso > keys[0] && !days[iso]) miss.push(iso);
  }
  if (!miss.length) return null;
  const base = days[keys[keys.length - 1]];
  const get = (k) => vals[k] || { cpa: String(base.cpa), pedidos: String(base.pedidos) };
  const setV = (k, f, v) => setVals({ ...vals, [k]: { ...get(k), [f]: v } });
  const saveAll = async () => {
    setBusy(true);
    for (const k of miss) {
      const v = get(k), c = trkNum(v.cpa), n = trkNum(v.pedidos);
      if (c >= 0 && n >= 0) await t.saveDay(p.id, k, { snap: trkSnap(p), cpa: c, pedidos: n, updatedMs: Date.now() });
    }
    setBusy(false); setOpen(false);
  };
  return (
    <div style={{ ...trkCard, marginBottom: 14, borderColor: `${C.amber}44` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Te {miss.length === 1 ? "falta 1 día" : `faltan ${miss.length} días`} de la última semana</div>
        <button onClick={() => setOpen(!open)} style={{ ...trkBtn2, padding: "7px 13px", fontSize: 12 }}>{open ? "Cerrar" : "Rellenar días que faltan"}</button>
      </div>
      {open && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>Los puse con los valores del último día registrado. Cámbialos si no fueron iguales.</div>
          {miss.map(k => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr", gap: 8, alignItems: "center" }}>
              <b style={{ fontSize: 13 }}>{trkLabel(k)}</b>
              <input aria-label={`CPA ${k}`} style={trkInp} inputMode="decimal" value={get(k).cpa} onChange={(e) => setV(k, "cpa", e.target.value)} />
              <input aria-label={`Pedidos ${k}`} style={trkInp} inputMode="numeric" value={get(k).pedidos} onChange={(e) => setV(k, "pedidos", e.target.value)} />
            </div>
          ))}
          <button onClick={saveAll} disabled={busy} style={{ ...trkBtn, justifySelf: "start", opacity: busy ? 0.7 : 1 }}>{busy ? "Guardando..." : `Guardar ${miss.length} ${miss.length === 1 ? "día" : "días"}`}</button>
        </div>
      )}
    </div>
  );
}


export function RealForm({ p, date, d, onDone }) {
  const t = useTracking();
  const c = calcDay(p, d);
  const [conf, setConf] = useState(d.real ? String(d.real.conf) : "");
  const [ent, setEnt] = useState(d.real ? String(d.real.ent) : "");
  const [err, setErr] = useState("");
  const save = async () => {
    const a = trkNum(conf), b = trkNum(ent);
    if (!(a >= 0) || !(b >= 0) || conf === "" || ent === "") return setErr("Escribe los dos números.");
    if (a > c.pedidos) return setErr(`No puedes tener más confirmados (${a}) que pedidos (${c.pedidos}).`);
    if (b > a) return setErr("Los entregados no pueden superar a los confirmados.");
    setErr("");
    const ok = await t.saveDay(p.id, date, { ...d, real: { conf: a, ent: b }, realMs: Date.now() });
    if (ok) onDone();
  };
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>De {c.pedidos} pedidos de ese día, ¿cuántos se confirmaron y cuántos se entregaron y pagaron?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <TrkField label="Confirmados"><input style={trkInp} inputMode="numeric" value={conf} onChange={(e) => setConf(e.target.value)} /></TrkField>
        <TrkField label="Entregados"><input style={trkInp} inputMode="numeric" value={ent} onChange={(e) => setEnt(e.target.value)} /></TrkField>
      </div>
      {err && <div role="alert" style={{ fontSize: 12, color: C.red }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={save} style={{ ...trkBtn, padding: "9px 14px" }}>Confirmar resultado</button>
        <button type="button" onClick={onDone} style={{ ...trkBtn2, padding: "9px 14px" }}>Cancelar</button>
      </div>
    </div>
  );
}


export function TrkStat({ label, value, color, sub }) {
  return (
    <div style={{ ...trkCard, padding: 16, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: color || C.text, overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}


export function trkMonthStats(rows, today) {
  const mk = monthKey(today);
  const m = trkSum(rows.filter(r => monthKey(r.date) === mk).map(r => r.c));
  const n = rows.filter(r => monthKey(r.date) === mk).length;
  const dim = new Date(+today.slice(0, 4), +today.slice(5, 7), 0).getDate();
  const proj = n > 0 ? (m.ganancia / n) * dim : 0;
  return { m, n, dim, proj };
}


export function TodayCard() {
  const { isPro } = useAuth();
  const t = useTracking();
  const today = todayISO();
  const [sel, setSel] = useState(null);
  if (!t.loaded) return null;
  if (!t.products.length) {
    return (
      <div style={{ ...trkCard, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Sigue tu ganancia día a día</div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Guarda un producto y anota tu CPA y tus pedidos. Cuadre calcula tu resultado y te avisa si algo anda mal.</div>
        </div>
        <button onClick={() => navTo("track")} style={trkBtn}>Crear mi primer producto</button>
      </div>
    );
  }
  const p = t.products.find(x => x.id === sel) || t.products[0];
  const fmt = trkFmt(p);
  const rows = trkVisible(trkRows(p), isPro, today);
  const tod = rows.find(r => r.date === today);
  const ms = trkMonthStats(rows, today);
  const light = trkLight(rows);
  const top = trkRecs(p, rows, fmt, today)[0];
  return (
    <div style={{ ...trkCard, marginBottom: 20, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Hoy</div>
        {t.products.length > 1
          ? <select aria-label="Producto" value={p.id} onChange={(e) => setSel(e.target.value)} style={{ ...trkInp, width: "auto", padding: "7px 10px", fontSize: 13 }}>{t.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          : <span style={{ fontSize: 13, color: C.textDim }}>{p.name}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>{tod ? "Ya registraste hoy. Puedes actualizarlo:" : "Anota el CPA y los pedidos de hoy"}</div>
          <DayForm p={p} date={today} />
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 12, color: C.textDim }}>Resultado de hoy</div><div style={{ fontSize: 20, fontWeight: 700, color: tod ? (tod.c.ganancia >= 0 ? C.green : C.red) : C.textMuted }}>{tod ? trkSigned(fmt, tod.c.ganancia) : "—"}</div></div>
            <div><div style={{ fontSize: 12, color: C.textDim }}>Acumulado del mes</div><div style={{ fontSize: 20, fontWeight: 700, color: ms.m.ganancia >= 0 ? C.green : C.red }}>{trkSigned(fmt, ms.m.ganancia)}</div></div>
          </div>
          {light && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: light.color }} /><b style={{ color: light.color }}>{light.label}</b><span style={{ color: C.textDim }}>· {light.text}</span></div>}
          {top && <div style={{ borderLeft: `3px solid ${TRK_TONE[top.tone]}`, paddingLeft: 10, fontSize: 13, color: C.textDim, lineHeight: 1.5 }}><b style={{ color: C.text }}>{top.title}.</b> {top.steps ? "Mira qué hacer en Seguimiento." : top.text}</div>}
          <button onClick={() => navTo("track")} style={{ ...trkBtn2, justifySelf: "start", padding: "7px 12px", fontSize: 12 }}>Ver seguimiento completo</button>
        </div>
      </div>
    </div>
  );
}
