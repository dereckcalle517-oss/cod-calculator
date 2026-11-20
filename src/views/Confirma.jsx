import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C } from "../theme";
import { Ic } from "../components/ui";
import { useAuth } from "../lib/firebase";
import { navTo } from "../lib/nav";
import { EST, botDownload, botFetch } from "../lib/botApi";

// ─── CUADRE CONFIRMA ─────────────────────────────────────────────────────────
// Panel del asistente de WhatsApp: pedidos, chats, información de la tienda y ajustes.
// Los datos vienen del motor del bot (lib/botApi.js); aquí no se guarda nada en Firestore.

const FILTERS = [
  { key: "coordinando", label: "Coordinando", states: [EST.wait, EST.rec], color: C.accent, icon: "message" },
  { key: "confirmados", label: "Confirmados", states: [EST.ok], color: C.green, icon: "checkCircle" },
  { key: "sinrespuesta", label: "Sin responder", states: [EST.reconf], color: C.amber, icon: "calendar" },
  { key: "listos", label: "Listos para despachar", states: [EST.go], color: C.green, icon: "truck" },
  { key: "dropi", label: "Subidos a Dropi", states: [EST.dropi], color: C.cyan, icon: "box" },
  { key: "cancelados", label: "Cancelados", states: [EST.bad], color: C.red, icon: "x" },
];
const toneOf = (estado) => (FILTERS.find(f => f.states.includes(estado)) || FILTERS[0]).color;

const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
const btn = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 40, padding: "0 14px", borderRadius: 10, border: "none", background: C.text, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
const btn2 = { ...btn, background: "transparent", color: C.text, border: `1px solid ${C.borderBright}` };
const inp = { width: "100%", boxSizing: "border-box", minHeight: 42, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 6 };
const h2 = { fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em" };

const fmtAgo = (ts) => {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
const fmtTime = (ts) => new Date(ts).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const initials = (n) => (String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();

function Badge({ estado }) {
  const c = toneOf(estado);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 99, background: `${c}1F`, color: c, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{estado}</span>;
}

function Avatar({ name, size = 38 }) {
  return <span style={{ width: size, height: size, borderRadius: 10, background: C.accentDim, color: C.accent, fontWeight: 700, fontSize: size * 0.34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(name)}</span>;
}

function Toast({ msg, onClose }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClose, 6000); return () => clearTimeout(t); }, [msg, onClose]);
  if (!msg) return null;
  const err = msg.type === "error";
  return (
    <div role={err ? "alert" : "status"} style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14, borderColor: err ? `${C.red}66` : `${C.green}55`, background: err ? C.redGlow : C.greenGlow }}>
      <span style={{ color: err ? C.red : C.green, marginTop: 1 }}><Ic n={err ? "alert" : "checkCircle"} size={17} /></span>
      <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5, overflowWrap: "anywhere" }}>{msg.text}</span>
      <button onClick={onClose} aria-label="Cerrar aviso" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 2 }}><Ic n="x" size={15} /></button>
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────────────────
export function ConfirmaView() {
  const { user } = useAuth();
  const [bot, setBot] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pedidos");
  const [chat, setChat] = useState(null); // teléfono del chat abierto
  const [msg, setMsg] = useState(null);
  const notify = useCallback((text, type = "ok") => setMsg({ text, type }), []);
  const closeMsg = useCallback(() => setMsg(null), []);

  const loadBot = useCallback(async () => {
    try { setBot(await botFetch(user, "/bot")); setError(""); }
    catch (e) { setError(e.message); }
  }, [user]);
  useEffect(() => { loadBot(); }, [loadBot]);

  const wrap = { maxWidth: 1100, margin: "0 auto", padding: "26px 16px 70px" };
  const tabs = [
    ...(bot?.exists ? [{ id: "pedidos", label: "Pedidos", icon: "box" }, { id: "info", label: "Info tienda", icon: "file" }, { id: "ajustes", label: "Ajustes", icon: "settings" }] : []),
    ...(bot?.isAdmin ? [{ id: "admin", label: "Administrar", icon: "key" }] : []),
  ];

  if (error && !bot) return <div style={wrap}><Header /><div role="alert" style={{ ...card, color: C.red, fontSize: 14 }}>{error}</div></div>;
  if (!bot) return <div style={wrap}><Header /><div style={{ fontSize: 13, color: C.textMuted }}>Cargando tu asistente...</div></div>;
  if (!bot.exists && !bot.isAdmin) return <div style={wrap}><Header /><NoAccess /></div>;

  return (
    <div style={wrap}>
      <style>{CSS}</style>
      <Header bot={bot.exists ? bot : null} />
      <Toast msg={msg} onClose={closeMsg} />
      {!chat && (
        <div className="cf-tabs" role="tablist">
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={"cf-tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              <Ic n={t.icon} size={15} /> {t.label}
              {t.id === "pedidos" && bot.attention > 0 && <span className="cf-dot">{bot.attention}</span>}
              {t.id === "info" && bot.infoPending > 0 && <span className="cf-dot amber">{bot.infoPending}</span>}
            </button>
          ))}
        </div>
      )}
      {chat ? <Chat user={user} phone={chat} onBack={() => { setChat(null); loadBot(); }} notify={notify} />
        : !bot.exists ? <Admin user={user} notify={notify} onChanged={loadBot} />
        : tab === "pedidos" ? <Pedidos user={user} bot={bot} onOpenChat={setChat} notify={notify} onChanged={loadBot} />
        : tab === "info" ? <InfoTienda user={user} notify={notify} onSaved={loadBot} />
        : tab === "ajustes" ? <Ajustes user={user} bot={bot} notify={notify} onSaved={setBot} />
        : <Admin user={user} notify={notify} onChanged={loadBot} />}
    </div>
  );
}

function Header({ bot }) {
  const live = bot && bot.enabled && bot.status?.phoneConnected;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>Confirma</h1>
        <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.5 }}>Tu asistente de WhatsApp confirma tus pedidos contra entrega.</div>
      </div>
      {bot && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 99, border: `1px solid ${C.border}`, background: C.card, fontSize: 12.5, fontWeight: 600, color: live ? C.green : C.amber }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: live ? C.green : C.amber }} />
          {live ? `Activo · ${bot.settings.agentName} atiende ${bot.settings.storeName}` : bot.enabled ? "Falta conectar tu WhatsApp" : "Asistente en pausa"}
        </span>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{ ...card, padding: 26, textAlign: "center", maxWidth: 560, margin: "20px auto" }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: C.accentDim, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Ic n="bot" size={24} /></div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Todavía no tienes Cuadre Confirma</div>
      <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.6, marginBottom: 18 }}>Es un asistente con IA que confirma por WhatsApp tus pedidos contra entrega, pide la ubicación y reconfirma antes del despacho. Estamos abriendo cupos de a poco.</div>
      <button style={btn} onClick={() => navTo("bot")}><Ic n="rocket" size={15} /> Quiero acceso</button>
    </div>
  );
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────
function Pedidos({ user, bot, onOpenChat, notify, onChanged }) {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try { setOrders((await botFetch(user, "/bot/orders")).orders); }
    catch (e) { notify(e.message, "error"); }
  }, [user, notify]);
  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 20000); return () => clearInterval(t); }, [load]);

  if (!orders) return <div style={{ fontSize: 13, color: C.textMuted }}>Cargando pedidos...</div>;
  const count = (f) => orders.filter(o => f.states.includes(o.estado)).length;
  const active = FILTERS.find(f => f.key === filter);
  const term = q.trim().toLowerCase();
  const shown = orders.filter(o => (!active || active.states.includes(o.estado)) && (!term || `${o.nombre} ${o.phone} ${o.producto} ${o.dir} ${o.notas}`.toLowerCase().includes(term)));
  const attention = orders.filter(o => o.atencion);
  const ready = orders.filter(o => o.estado === EST.go);
  const listText = ready.map((o, i) => `${i + 1}. ${o.nombre} – ${o.phone} – ${o.producto} – ${o.dir} – ${o.total}${o.notas ? " – Nota: " + o.notas : ""}${o.loc?.url ? " – " + o.loc.url : ""}`).join("\n");
  const pick = (k) => { setFilter(filter === k ? "" : k); setTimeout(() => listRef.current?.scrollIntoView({ block: "start" }), 0); };

  const act = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { notify(e.message, "error"); } setBusy(""); };
  const copy = () => act("copy", async () => { await navigator.clipboard.writeText(listText); notify("Lista copiada. Pégala en tu proveedor."); });
  const csv = () => act("csv", () => botDownload(user, "/bot/export.csv", `despacho-${new Date().toISOString().slice(0, 10)}.csv`));
  const dropi = () => act("dropi", async () => { const r = await botFetch(user, "/bot/dropi-all", { method: "POST" }); notify(`${r.count} pedido(s) marcados como subidos a Dropi.`); await load(); onChanged(); });

  return (
    <div>
      <div className="cf-kpis">
        {FILTERS.map(f => (
          <button key={f.key} className={"cf-kpi" + (filter === f.key ? " on" : "")} style={{ "--c": f.color }} onClick={() => pick(f.key)} aria-pressed={filter === f.key}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: `${f.color}1F`, color: f.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={f.icon} size={15} /></span>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>{count(f)}</span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: "left" }}>{f.label}</span>
            <span style={{ fontSize: 11, color: filter === f.key ? C.text : f.color, fontWeight: 600 }}>{filter === f.key ? "Mostrando · tocar para quitar" : "Ver pedidos →"}</span>
          </button>
        ))}
      </div>

      {attention.length > 0 && (
        <div style={{ ...card, borderColor: `${C.amber}55`, background: `linear-gradient(180deg, ${C.amberGlow}, ${C.card} 70%)`, marginBottom: 14 }}>
          <div style={{ ...h2, marginBottom: 10 }}><span style={{ color: C.amber }}><Ic n="alert" size={16} /></span> Necesitan tu atención</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attention.map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 10, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                <Avatar name={o.nombre} size={34} />
                <div style={{ flex: "1 1 180px", minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{o.nombre || o.phone}</div><div style={{ fontSize: 12.5, color: C.textDim }}>{o.atencion}</div></div>
                <button style={btn} onClick={() => onOpenChat(o.phone)}><Ic n="message" size={14} /> Responder</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={h2}><span style={{ color: C.green }}><Ic n="truck" size={16} /></span> Para subir a Dropi hoy</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green, background: C.greenGlow, borderRadius: 99, padding: "3px 10px" }}>{ready.length} listo{ready.length === 1 ? "" : "s"}</span>
        </div>
        {ready.length ? (<>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.6, color: C.textDim, maxHeight: 240, overflow: "auto", fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" }}>{listText}</pre>
          <div className="cf-actions">
            <button style={btn} onClick={copy} disabled={!!busy}><Ic n="clipboard" size={14} /> Copiar lista</button>
            <button style={btn2} onClick={csv} disabled={!!busy}><Ic n="download" size={14} /> {busy === "csv" ? "Descargando..." : "Descargar Excel"}</button>
            <button style={btn2} onClick={dropi} disabled={!!busy}><Ic n="checkCircle" size={14} /> {busy === "dropi" ? "Marcando..." : "Marcar como subidos"}</button>
          </div>
        </>) : <div style={{ fontSize: 13.5, color: C.textMuted }}>Nada para despachar todavía. Los confirmados se reconfirman solos a las {bot.settings.reconfTime}.</div>}
      </div>

      <div ref={listRef} style={{ ...card, scrollMarginTop: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={h2}><Ic n="box" size={16} /> {active ? active.label : "Todos los pedidos"} <span style={{ color: C.textMuted, fontWeight: 600 }}>· {shown.length}</span></div>
          {active && <button style={{ ...btn2, minHeight: 34 }} onClick={() => setFilter("")}><Ic n="x" size={13} /> Quitar filtro</button>}
        </div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, pointerEvents: "none" }}><Ic n="search" size={16} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono, producto o dirección" aria-label="Buscar pedidos" style={{ ...inp, paddingLeft: 38, fontSize: 16 }} />
        </div>
        {shown.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 10px", color: C.textMuted, fontSize: 13.5 }}>
            {orders.length ? "No hay pedidos con ese filtro o búsqueda." : "Todavía no hay pedidos. Cuando un cliente escriba desde tu tienda, aparecerá aquí."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map(o => (
              <div key={o.id} className={"cf-order" + (o.atencion ? " attn" : "")} onClick={(e) => { if (!e.target.closest("a,button")) onOpenChat(o.phone); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
                  <Avatar name={o.nombre} />
                  <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, overflowWrap: "anywhere" }}>{o.nombre || o.phone}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{o.phone} · {fmtAgo(o.createdAt)}</div>
                  </div>
                  <span className="cf-m"><Badge estado={o.estado} /></span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>{o.producto}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{o.total}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.textDim, overflowWrap: "anywhere" }}>{o.dir}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {o.loc?.url
                      ? <a href={o.loc.url} target="_blank" rel="noopener noreferrer" className="cf-tag" style={o.loc.match === "no" ? { color: C.amber, borderColor: `${C.amber}55` } : { color: C.green, borderColor: `${C.green}44` }}>📍 {o.loc.city || "Ver mapa"}{o.loc.match === "no" ? " · no coincide" : ""}</a>
                      : <span className="cf-tag">📍 Sin ubicación</span>}
                    {o.notas && <span className="cf-tag">📝 {o.notas}</span>}
                    {o.atencion && <span className="cf-tag" style={{ color: C.amber, borderColor: `${C.amber}55` }}>⚠ {o.atencion}</span>}
                  </div>
                </div>
                <span className="cf-d"><Badge estado={o.estado} /></span>
                <button style={{ ...btn2, minHeight: 36 }} onClick={() => onOpenChat(o.phone)}><Ic n="message" size={14} /> Abrir chat</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: C.textMuted, marginTop: 12 }}>{bot.summary} · Se actualiza solo cada 20 segundos.</div>
    </div>
  );
}

// ─── Chat ────────────────────────────────────────────────────────────────────
function Chat({ user, phone, onBack, notify }) {
  const [c, setC] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    try { setC({ ...(await botFetch(user, `/bot/chats/${phone}`)), fetchedAt: Date.now() }); }
    catch (e) { notify(e.message, "error"); }
  }, [user, phone, notify]);
  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [c?.messages?.length]);

  const act = async (key, fn, ok) => { setBusy(key); try { await fn(); if (ok) notify(ok); await load(); } catch (e) { notify(e.message, "error"); } setBusy(""); };
  const send = (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; act("send", async () => { await botFetch(user, `/bot/chats/${phone}/send`, { method: "POST", body: { text: t } }); setText(""); }); };
  const paused = c && c.pausedUntil > c.fetchedAt;
  const o = c?.order;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.textDim, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 12 }}><Ic n="arrowLeft" size={16} /> Volver a pedidos</button>
      {!c ? <div style={{ fontSize: 13, color: C.textMuted }}>Cargando conversación...</div> : (<>
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <Avatar name={o?.nombre || c.profileName} size={44} />
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 17, fontWeight: 700 }}>{o?.nombre || c.profileName || phone}</span>{o && <Badge estado={o.estado} />}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted }}>{phone}{c.profileName ? ` · WhatsApp: ${c.profileName}` : ""}</div>
            </div>
          </div>
          {o && (
            <div className="cf-kv">
              <div><span>Pedido</span>{o.producto} · <b>{o.total}</b></div>
              <div><span>Entrega</span>{o.dir}</div>
              <div><span>Ubicación y notas</span>{o.loc?.url ? <a href={o.loc.url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>{o.loc.city || "Ver mapa"}</a> : "Sin ubicación"}{o.notas ? ` · ${o.notas}` : ""}</div>
            </div>
          )}
          <div className="cf-actions" style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: paused ? C.amber : C.green, padding: "0 4px" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: paused ? C.amber : C.green }} />{paused ? `Bot en pausa hasta ${new Date(c.pausedUntil).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}` : "Bot respondiendo"}</span>
            <button style={btn2} disabled={!!busy} onClick={() => act("pause", () => botFetch(user, `/bot/chats/${phone}/${paused ? "resume" : "pause"}`, { method: "POST" }))}>{paused ? "Reanudar bot" : "Pausar bot 12 h"}</button>
            {o && o.estado !== EST.bad && o.estado !== EST.go && <button style={btn2} disabled={!!busy} onClick={() => act("listo", () => botFetch(user, `/bot/orders/${o.id}/listo`, { method: "POST" }), "Pedido marcado como listo para despachar.")}><Ic n="truck" size={14} /> Marcar listo</button>}
            {o && o.estado !== EST.bad && <button style={{ ...btn2, color: C.red, borderColor: `${C.red}55` }} disabled={!!busy} onClick={() => { if (confirm("¿Cancelar este pedido?")) act("cancel", () => botFetch(user, `/bot/orders/${o.id}/cancelar`, { method: "POST" }), "Pedido cancelado."); }}><Ic n="x" size={14} /> Cancelar pedido</button>}
          </div>
        </div>
        <div style={card}>
          <div ref={boxRef} style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "58vh", minHeight: 200, overflowY: "auto", padding: 12, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
            {c.messages.length === 0 && <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Sin mensajes.</div>}
            {c.messages.map((m, i) => {
              const mine = m.from !== "cliente";
              const color = m.from === "dueño" ? C.green : C.accent;
              return (
                <div key={i} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", background: mine ? `${color}1A` : C.card, border: `1px solid ${mine ? `${color}44` : C.border}`, borderRadius: 12, padding: "8px 12px 6px", fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {mine && <div style={{ fontSize: 10.5, fontWeight: 700, color, marginBottom: 2 }}>{m.from === "dueño" ? "Tú" : "Bot"}</div>}
                  {m.text}
                  <div style={{ fontSize: 10.5, color: C.textMuted, textAlign: "right", marginTop: 3 }}>{fmtTime(m.at)}</div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Escribe tu respuesta…" aria-label="Tu respuesta" style={{ ...inp, resize: "vertical", fontSize: 16 }} />
            <button type="submit" style={{ ...btn, minHeight: 46 }} disabled={busy === "send" || !text.trim()}><Ic n="mail" size={15} /> {busy === "send" ? "..." : "Enviar"}</button>
          </form>
          <div style={{ fontSize: 12, color: c.within24h ? C.textMuted : C.amber, marginTop: 8 }}>{c.within24h ? "Al enviar, el bot se pausa 12 h en este chat para no interrumpirte." : "Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp no deja enviar texto libre hasta que vuelva a escribir."}</div>
        </div>
      </>)}
    </div>
  );
}

// ─── Info tienda ─────────────────────────────────────────────────────────────
function InfoTienda({ user, notify, onSaved }) {
  const [info, setInfo] = useState(null);
  const [orig, setOrig] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { botFetch(user, "/bot/info").then(r => { setInfo(r.info); setOrig(r.info); }).catch(e => notify(e.message, "error")); }, [user, notify]);
  const dirty = info !== null && info !== orig;
  useEffect(() => { if (!dirty) return; const h = (e) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  if (info === null) return <div style={{ fontSize: 13, color: C.textMuted }}>Cargando...</div>;
  const pending = (info.match(/\[[^\]]*\]/g) || []).length;
  const save = async () => { setSaving(true); try { await botFetch(user, "/bot/info", { method: "PUT", body: { info } }); setOrig(info); notify("Guardado. Tu asistente ya usa la información nueva."); onSaved(); } catch (e) { notify(e.message, "error"); } setSaving(false); };
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={h2}><Ic n="file" size={16} /> Lo que tu asistente sabe de tu tienda</div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 4, lineHeight: 1.55, maxWidth: 640 }}>La IA responde <b>solo</b> con este texto. Lo que esté entre [corchetes] lo trata como "no sé": le dice al cliente que lo consulta y te avisa en Pedidos.</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "4px 10px", color: pending ? C.amber : C.green, background: pending ? C.amberGlow : C.greenGlow }}>{pending ? `${pending} por completar` : "Todo completo"}</span>
      </div>
      <textarea value={info} onChange={e => setInfo(e.target.value)} spellCheck={false} aria-label="Información de la tienda" style={{ ...inp, minHeight: "55vh", resize: "vertical", fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace", fontSize: 13.5, lineHeight: 1.7 }} />
      <div style={{ position: "sticky", bottom: 12, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: dirty ? C.amber : C.green, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: dirty ? C.amber : C.green }} />{dirty ? "Cambios sin guardar" : "Guardado"}</span>
        <button style={{ ...btn, opacity: dirty ? 1 : 0.5 }} disabled={!dirty || saving} onClick={save}><Ic n="save" size={14} /> {saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </div>
  );
}

// ─── Ajustes ─────────────────────────────────────────────────────────────────
function Ajustes({ user, bot, notify, onSaved }) {
  const [f, setF] = useState(bot.settings);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [events, setEvents] = useState([]);
  useEffect(() => { botFetch(user, "/bot/events").then(r => setEvents(r.events)).catch(() => {}); }, [user]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const r = await botFetch(user, "/bot/settings", { method: "PUT", body: f }); onSaved({ ...bot, ...r }); setF(r.settings); notify("Ajustes guardados."); }
    catch (err) { notify(err.message, "error"); }
    setSaving(false);
  };
  const reconfirm = async () => {
    if (!confirm("¿Enviar ahora la reconfirmación a todos los pedidos confirmados?")) return;
    setSending(true);
    try { const r = await botFetch(user, "/bot/reconfirm", { method: "POST" }); notify(`Reconfirmaciones enviadas: ${r.ok} de ${r.total}.`, r.ok === r.total ? "ok" : "error"); }
    catch (e) { notify(e.message, "error"); }
    setSending(false);
  };
  const s = bot.status || {};
  const tile = (label, ok, yes, no) => (
    <div style={{ padding: 12, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: ok ? C.green : C.amber, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: ok ? C.green : C.amber }} />{ok ? yes : no}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card}>
        <div style={{ ...h2, marginBottom: 12 }}><Ic n="activity" size={16} /> Estado</div>
        <div className="cf-tiles">
          {tile("Asistente", bot.enabled, "Activado", "En pausa")}
          {tile("WhatsApp", s.phoneConnected, "Número conectado", "Sin conectar")}
          {tile("Inteligencia artificial", s.ai, "Disponible", "No disponible")}
          <div style={{ padding: 12, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Uso de IA este mes</div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{bot.usage?.calls || 0} respuestas</div>
          </div>
        </div>
        {!s.phoneConnected && <div style={{ fontSize: 12.5, color: C.textDim, marginTop: 10, lineHeight: 1.5 }}>Para conectar tu número de WhatsApp, escríbenos: lo hacemos contigo en unos minutos.</div>}
      </div>

      <form onSubmit={save} style={card}>
        <div style={{ ...h2, marginBottom: 14 }}><Ic n="sliders" size={16} /> Tu asistente</div>
        <div className="cf-form">
          <label><span style={lbl}>Nombre de tu tienda</span><input style={inp} value={f.storeName} onChange={set("storeName")} maxLength={60} required /></label>
          <label><span style={lbl}>Nombre de la asistente</span><input style={inp} value={f.agentName} onChange={set("agentName")} maxLength={30} required /></label>
          <label><span style={lbl}>Forma de conversar</span>
            <select style={inp} value={f.mode} onChange={set("mode")}>
              <option value="natural">Natural: la IA escribe cada mensaje</option>
              <option value="fijo">Fija: mensajes iguales siempre</option>
            </select></label>
          <label><span style={lbl}>Tiempo de entrega (como lo dirá el bot)</span><input style={inp} value={f.deliveryDays} onChange={set("deliveryDays")} maxLength={80} /></label>
          <label><span style={lbl}>Hora de reconfirmación (cada mañana)</span><input type="time" style={inp} value={f.reconfTime} onChange={set("reconfTime")} required /></label>
          <label><span style={lbl}>Hora del resumen diario</span><input type="time" style={inp} value={f.summaryTime} onChange={set("summaryTime")} required /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>Tu celular para avisos y el resumen diario (con código de país, sin +)</span><input style={inp} value={f.ownerPhone} onChange={set("ownerPhone")} inputMode="numeric" placeholder="593991234567" /></label>
        </div>
        <div style={{ marginTop: 14 }}><button type="submit" style={btn} disabled={saving}><Ic n="save" size={14} /> {saving ? "Guardando..." : "Guardar ajustes"}</button></div>
      </form>

      <div style={card}>
        <div style={{ ...h2, marginBottom: 6 }}><Ic n="calendar" size={16} /> Reconfirmaciones</div>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55, marginBottom: 12 }}>Se envían solas cada mañana a las {bot.settings.reconfTime} a los pedidos confirmados el día anterior. Con este botón las envías ya.</div>
        <button style={btn2} onClick={reconfirm} disabled={sending || !bot.enabled}><Ic n="mail" size={14} /> {sending ? "Enviando..." : "Enviar reconfirmaciones ahora"}</button>
      </div>

      <div style={card}>
        <div style={{ ...h2, marginBottom: 10 }}><Ic n="activity" size={16} /> Actividad reciente</div>
        {events.length ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {events.map((e, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${C.border}` : "none", fontSize: 13 }}><span style={{ color: C.textMuted, whiteSpace: "nowrap", fontSize: 12 }}>{fmtTime(e.at)}</span><span style={{ overflowWrap: "anywhere" }}>{e.text}</span></div>)}
          </div>
        ) : <div style={{ fontSize: 13, color: C.textMuted }}>Sin actividad desde el último reinicio del asistente.</div>}
      </div>
    </div>
  );
}

// ─── Administrar (solo para ADMIN_UIDS en el motor) ──────────────────────────
function Admin({ user, notify, onChanged }) {
  const [bots, setBots] = useState(null);
  const empty = { uid: "", storeName: "", agentName: "Sofía", phoneNumberId: "", wabaId: "", enabled: true };
  const [f, setF] = useState(empty);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { try { setBots((await botFetch(user, "/admin/bots")).bots); } catch (e) { notify(e.message, "error"); } }, [user, notify]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const edit = (b) => setF({ uid: b.id, storeName: b.settings.storeName, agentName: b.settings.agentName, phoneNumberId: b.admin.phoneNumberId, wabaId: b.admin.wabaId, enabled: b.enabled });
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); notify(ok); await load(); onChanged(); } catch (e) { notify(e.message, "error"); } setBusy(""); };
  const uid = f.uid.trim();
  const save = (e) => { e.preventDefault(); if (!uid) return; run("save", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}`, { method: "PUT", body: { storeName: f.storeName, agentName: f.agentName, phoneNumberId: f.phoneNumberId, wabaId: f.wabaId, enabled: f.enabled } }), "Tienda guardada."); };
  const totalCalls = useMemo(() => (bots || []).reduce((s, b) => s + (b.usage?.calls || 0), 0), [bots]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <form onSubmit={save} style={card}>
        <div style={{ ...h2, marginBottom: 6 }}><Ic n="key" size={16} /> Activar o editar una tienda</div>
        <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.55, marginBottom: 14 }}>El UID es el del usuario en Firebase → Authentication. El número y la cuenta de WhatsApp deben estar compartidos con el portafolio de Cuadre en Meta.</div>
        <div className="cf-form">
          <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>UID del usuario (Firebase)</span><input style={inp} value={f.uid} onChange={set("uid")} required /></label>
          <label><span style={lbl}>Nombre de la tienda</span><input style={inp} value={f.storeName} onChange={set("storeName")} /></label>
          <label><span style={lbl}>Nombre de la asistente</span><input style={inp} value={f.agentName} onChange={set("agentName")} /></label>
          <label><span style={lbl}>Phone number ID</span><input style={inp} value={f.phoneNumberId} onChange={set("phoneNumberId")} inputMode="numeric" /></label>
          <label><span style={lbl}>WABA ID (cuenta de WhatsApp)</span><input style={inp} value={f.wabaId} onChange={set("wabaId")} inputMode="numeric" /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}><input type="checkbox" checked={f.enabled} onChange={set("enabled")} style={{ width: 18, height: 18 }} /> Asistente activado</label>
        </div>
        <div className="cf-actions" style={{ marginTop: 14 }}>
          <button type="submit" style={btn} disabled={!!busy || !uid}><Ic n="save" size={14} /> {busy === "save" ? "Guardando..." : "Guardar tienda"}</button>
          <button type="button" style={btn2} disabled={!!busy || !uid || !f.wabaId} onClick={() => run("sub", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}/subscribe`, { method: "POST" }), "Cuenta de WhatsApp conectada a los mensajes.")}><Ic n="repeat" size={14} /> Conectar webhooks</button>
          <button type="button" style={btn2} disabled={!!busy} onClick={() => setF(empty)}>Limpiar</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: "0 1 200px" }}><span style={lbl}>PIN para activar el número</span><input style={inp} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 números" /></label>
          <button type="button" style={btn2} disabled={!!busy || !uid || pin.length !== 6} onClick={() => run("pin", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}/register`, { method: "POST", body: { pin } }), "Número activado en WhatsApp.")}><Ic n="key" size={14} /> Activar número</button>
        </div>
      </form>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={h2}><Ic n="building" size={16} /> Tiendas <span style={{ color: C.textMuted, fontWeight: 600 }}>· {bots ? bots.length : "..."}</span></div>
          <span style={{ fontSize: 12, color: C.textMuted }}>Respuestas de IA este mes: {totalCalls}</span>
        </div>
        {!bots ? <div style={{ fontSize: 13, color: C.textMuted }}>Cargando...</div> : bots.length === 0 ? <div style={{ fontSize: 13, color: C.textMuted }}>Todavía no hay tiendas.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bots.map(b => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 12, borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
                <Avatar name={b.settings.storeName} size={34} />
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.settings.storeName}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, overflowWrap: "anywhere" }}>{b.id} · número {b.admin.phoneNumberId || "sin conectar"} · {b.usage?.calls || 0} respuestas de IA</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: b.enabled ? C.green : C.amber }}>{b.enabled ? "Activa" : "En pausa"}</span>
                <button style={{ ...btn2, minHeight: 34 }} onClick={() => edit(b)}>Editar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.cf-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 16px;padding-bottom:2px}
.cf-tabs::-webkit-scrollbar{display:none}
.cf-tab{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid ${C.border};background:${C.card};color:${C.textDim};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
.cf-tab.on{background:${C.text};color:${C.bg};border-color:${C.text}}
.cf-dot{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:${C.amber};color:#1a1000;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}
.cf-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
@media (min-width:700px){.cf-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (min-width:1100px){.cf-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}}
.cf-kpi{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;border-radius:14px;background:${C.card};border:1px solid ${C.border};color:${C.text};cursor:pointer;font-family:inherit;text-align:left;transition:border-color .15s,transform .15s;min-width:0}
.cf-kpi:hover{border-color:${C.borderBright};transform:translateY(-1px)}
.cf-kpi.on{border-color:var(--c);box-shadow:0 0 0 1px var(--c) inset}
.cf-actions{display:flex;flex-wrap:wrap;gap:8px}
.cf-order{display:grid;grid-template-columns:1fr;gap:10px;padding:12px;border-radius:12px;background:${C.bg};border:1px solid ${C.border};cursor:pointer;transition:border-color .15s,background .15s;min-width:0}
.cf-order:hover{border-color:${C.borderBright};background:${C.surface}}
.cf-order.attn{border-color:${C.amber}66;box-shadow:inset 3px 0 0 ${C.amber}}
.cf-order>button{width:100%}
.cf-d{display:none}
.cf-tag{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:3px 9px;border-radius:8px;border:1px solid ${C.border};color:${C.textDim};font-size:12px;font-weight:600;text-decoration:none;overflow-wrap:anywhere}
@media (min-width:980px){
  .cf-order{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr) auto auto;align-items:center;gap:16px}
  .cf-order>button{width:auto}
  .cf-m{display:none}.cf-d{display:block}
}
.cf-kv{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}
@media (min-width:700px){.cf-kv{grid-template-columns:repeat(3,minmax(0,1fr))}}
.cf-kv>div{background:${C.bg};border:1px solid ${C.border};border-radius:10px;padding:9px 11px;font-size:13px;overflow-wrap:anywhere;min-width:0}
.cf-kv span{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.textMuted};margin-bottom:3px}
.cf-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (min-width:900px){.cf-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
.cf-form{display:grid;grid-template-columns:1fr;gap:12px}
@media (min-width:700px){.cf-form{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.cf-actions>button,.cf-actions>a{flex:1 1 100%}}
`;
