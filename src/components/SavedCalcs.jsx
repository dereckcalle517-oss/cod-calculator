import { useState, useEffect } from "react";
import { C } from "../theme";
import { Ic } from "./ui";
import { fmtPct } from "../lib/calc";
import { deleteSimulationFS, getSimulationsFS, saveSimulationFS, useAuth } from "../lib/firebase";


// ─── SAVED CALCS (cálculos guardados por usuario) ─────────────────────────────
export function SavedCalcs({ inputs, currency, R, limit, onLoad }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const LS = "cod_saved_calcs";
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };

  const refresh = async () => {
    if (user) {
      try { setList(await getSimulationsFS(user.uid)); }
      catch (e) { console.error(e); setList([]); setMsg("No se pudieron leer tus cálculos de la nube."); }
      return;
    }
    setList(readLocal());
  };
  useEffect(() => { refresh(); }, [user?.uid]);

  const save = async () => {
    if (list.length >= limit) { setMsg(`Llegaste al límite de ${limit} cálculos. Borra alguno para guardar más.`); return; }
    const sim = {
      name: name.trim() || `Cálculo ${new Date().toLocaleDateString("es-ES")}`,
      date: new Date().toLocaleDateString("es-ES"),
      currency: currency.code,
      inputs: { ...inputs },
      results: { gananciaNet: R.gananciaNet || 0, margen: R.margen || 0 },
    };
    setBusy(true); setMsg("");
    try {
      if (user) await saveSimulationFS(user.uid, sim);
      else localStorage.setItem(LS, JSON.stringify([{ id: String(Date.now()), ...sim }, ...readLocal()]));
      setName(""); setMsg("Cálculo guardado");
      await refresh();
    } catch (e) { console.error(e); setMsg("Error al guardar: " + (e.code || e.message)); }
    setBusy(false);
  };

  const remove = async (id) => {
    try {
      if (user) await deleteSimulationFS(user.uid, id);
      else localStorage.setItem(LS, JSON.stringify(readLocal().filter(s => s.id !== id)));
      await refresh();
    } catch (e) { console.error(e); setMsg("Error al borrar: " + (e.code || e.message)); }
  };

  return (
    <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}><Ic n="💾" /> Mis cálculos</div>
        <div style={{ fontSize: 10, color: C.textMuted }}>{list.length}/{limit}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} placeholder="Nombre (ej: Perfume X)"
          style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
        <button onClick={save} disabled={busy}
          style={{ background: C.green, border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: busy ? 0.6 : 1 }}>Guardar</button>
      </div>
      {!user && <div style={{ fontSize: 10, color: C.amber, marginTop: 6 }}>Inicia sesión para guardarlos en tu cuenta y verlos desde cualquier dispositivo. Ahora se guardan solo en este navegador.</div>}
      {msg && <div style={{ fontSize: 11, color: msg === "Cálculo guardado" ? C.green : C.amber, marginTop: 6 }}>{msg}</div>}
      <div style={{ maxHeight: 230, overflowY: "auto", marginTop: 8 }}>
        {list.length === 0 && <div style={{ fontSize: 11, color: C.textMuted, padding: "6px 2px" }}>Aún no tienes cálculos guardados.</div>}
        {list.map(s => (
          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontSize: 9, color: (s.results?.gananciaNet ?? 0) >= 0 ? C.green : C.red }}>
                {(s.results?.gananciaNet ?? 0) >= 0 ? "+" : "−"}{s.currency || "USD"} {Math.abs(Math.round(s.results?.gananciaNet ?? 0)).toLocaleString("es-ES")} · {fmtPct(s.results?.margen)} · {s.date}
              </div>
            </div>
            <button onClick={() => onLoad(s.inputs, s.currency)} title="Cargar" style={{ background: `${C.accent}15`, border: "none", borderRadius: 6, padding: "4px 8px", color: C.accent, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Abrir</button>
            <button onClick={() => remove(s.id)} title="Borrar" style={{ background: `${C.red}15`, border: "none", borderRadius: 6, padding: "4px 7px", color: C.red, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}><Ic n="🗑" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
