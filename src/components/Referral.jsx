import { useState, useEffect } from "react";
import { C } from "../theme";
import { useAuth } from "../lib/firebase";
import { refApi, refUrlFor } from "../lib/referral";


// ─── REFERIDOS ─────────────────────────────────────────────────────
export function ReferralPanel({ panel, btnMain, btnGhost, inp }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const load = () => refApi(user, "status").then(x => { setD(x); setErr(""); if (x.code) { try { localStorage.setItem("nx_my_ref", x.code); } catch {} } }).catch(() => setErr("No pudimos cargar tus referidos. Intenta de nuevo."));
  useEffect(() => { if (user) load(); }, [user && user.uid]);
  const link = d && d.code ? refUrlFor(d.code) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const redeem = async () => {
    setBusy(true); setErr(""); setOkMsg("");
    try { const r = await refApi(user, "redeem"); setOkMsg(`Listo, activamos ${r.days} días de PRO.`); await load(); }
    catch { setErr("No se pudieron activar los días. Intenta de nuevo."); }
    setBusy(false);
  };
  const tile = (v, l) => (<div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div></div>);
  return (<>
    <div style={panel}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Gana 15 días de PRO por cada amigo que se suscriba</div>
      <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.65, marginBottom: 18 }}>Comparte tu enlace. Cuando tu amigo se suscribe y pasan sus 3 días de garantía, se guardan 15 días de PRO en tu cuenta. Puedes guardar hasta 30 días y activarlos cuando quieras.</div>
      {!d && !err && <div style={{ fontSize: 13, color: C.textMuted }}>Cargando…</div>}
      {err && <div style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{err}</div>}
      {d && (<>
        <label style={{ fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6, display: "block" }} htmlFor="reflink">Tu enlace personal</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input id="reflink" readOnly value={link} onFocus={e => e.target.select()} style={{ ...inp, flex: "1 1 240px", width: "auto" }} />
          <button onClick={copy} style={btnMain}>{copied ? "Copiado" : "Copiar enlace"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Calcula tu CPA real en contraentrega con Cuadre: ${link}`)}`} target="_blank" rel="noreferrer" style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Compartir por WhatsApp</a>
        </div>
      </>)}
    </div>
    {d && (
      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
          {tile(d.registered, "Se registraron")}{tile(d.paid, "Se suscribieron")}{tile(`${d.bank} de ${d.cap}`, "Días guardados")}
        </div>
        {d.pending > 0 && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>{d.pending} {d.pending === 1 ? "referido está" : "referidos están"} en su periodo de garantía de 3 días. Te acreditamos al terminar.</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={redeem} disabled={!d.canRedeem || busy} style={{ ...btnMain, background: C.gold, opacity: d.canRedeem && !busy ? 1 : 0.4, cursor: d.canRedeem && !busy ? "pointer" : "not-allowed" }}>{busy ? "Activando…" : `Activar ${d.bank} días de PRO`}</button>
          {d.bank > 0 && d.blocked && <span style={{ fontSize: 12, color: C.amber }}>Disponible cuando termine tu suscripción actual.</span>}
          {okMsg && <span style={{ fontSize: 12, color: C.green }}>{okMsg}</span>}
        </div>
      </div>
    )}
  </>);
}
