import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/firebase";
import { navTo } from "../lib/nav";
import { EST, botDownload, botFetch } from "../lib/botApi";
import { ICONS } from "../lib/confirmaIcons";
import "./confirma.css";

// ─── CUADRE CONFIRMA ─────────────────────────────────────────────────────────
// Panel del asistente de WhatsApp con el mismo diseño del panel del bot (oscuro y morado).
// Los datos vienen del motor del bot (lib/botApi.js); aquí no se guarda nada en Firestore.
// Los estilos viven en confirma.css, limitados a .cfx para no tocar el resto de Cuadre.

const TONE = { [EST.wait]: "violet", [EST.rec]: "amber", [EST.ok]: "green", [EST.reconf]: "yellow", [EST.go]: "emerald", [EST.dropi]: "blue", [EST.bad]: "red" };
const FILTERS = [
  { key: "coordinando", label: "Coordinando", icon: "message", tone: "violet", states: [EST.wait, EST.rec], hint: "Hablando con el bot" },
  { key: "confirmados", label: "Confirmados", icon: "checkCircle", tone: "green", states: [EST.ok], hint: "Se reconfirman en la mañana" },
  { key: "sinrespuesta", label: "Sin responder", icon: "clock", tone: "yellow", states: [EST.reconf], hint: "Reconfirmación enviada" },
  { key: "listos", label: "Listos para despachar", icon: "truck", tone: "emerald", states: [EST.go], hint: "Subir a Dropi hoy" },
  { key: "dropi", label: "Subidos a Dropi", icon: "upload", tone: "blue", states: [EST.dropi], hint: "Ya en tu proveedor" },
  { key: "cancelados", label: "Cancelados", icon: "x", tone: "red", states: [EST.bad], hint: "No se despachan" },
];

function Icon({ n, size = 18 }) {
  return <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[n] || "" }} />;
}
const Badge = ({ estado }) => <span className={`badge t-${TONE[estado] || "violet"}`}><i />{estado}</span>;
const initials = (n) => (String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("") || "?").toUpperCase();
const fmtTime = (ts) => new Date(ts).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function fmtAgo(ts, now) {
  if (!ts) return "";
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : fmtTime(ts);
}

function Toast({ msg, onClose }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClose, 7000); return () => clearTimeout(t); }, [msg, onClose]);
  if (!msg) return null;
  const err = msg.type === "error";
  return (
    <div className={`toast ${err ? "err" : "ok"}`} role={err ? "alert" : "status"}>
      <span className="tic"><Icon n={err ? "alert" : "checkCircle"} size={20} /></span>
      <div className="tx">{msg.text}</div>
      <button type="button" aria-label="Cerrar aviso" onClick={onClose}><Icon n="close" size={16} /></button>
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────────────────
export function ConfirmaView() {
  const { user } = useAuth();
  const [bot, setBot] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pedidos");
  const [chat, setChat] = useState(null);
  const [msg, setMsg] = useState(null);
  const notify = useCallback((text, type = "ok") => setMsg({ text, type }), []);
  const closeMsg = useCallback(() => setMsg(null), []);

  const loadBot = useCallback(async () => {
    try { setBot(await botFetch(user, "/bot")); setError(""); }
    catch (e) { setError(e.message); }
  }, [user]);
  useEffect(() => { loadBot(); }, [loadBot]);

  const tabs = [
    ...(bot?.exists ? [
      { id: "pedidos", label: "Pedidos", icon: "package", count: bot.attention },
      { id: "info", label: "Info tienda", icon: "file", count: bot.infoPending, soft: true },
      { id: "ajustes", label: "Ajustes", icon: "sliders" },
    ] : []),
    ...(bot?.isAdmin ? [{ id: "admin", label: "Administrar", icon: "key" }] : []),
  ];
  const current = bot && !bot.exists ? "admin" : tab;

  let body;
  if (error && !bot) body = <div className="card" role="alert" style={{ color: "#fca5a5" }}>{error}</div>;
  else if (!bot) body = <div className="empty"><b>Cargando tu asistente...</b></div>;
  else if (!bot.exists && !bot.isAdmin) body = <NoAccess />;
  else if (chat) body = <Chat user={user} phone={chat} onBack={() => { setChat(null); loadBot(); }} notify={notify} />;
  else body = (<>
    <nav className="tabs" role="tablist" aria-label="Secciones de Confirma">
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={current === t.id} className={"tab" + (current === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
          <Icon n={t.icon} size={17} />{t.label}{t.count > 0 && <span className={"cnt" + (t.soft ? " v" : "")}>{t.count}</span>}
        </button>
      ))}
    </nav>
    {current === "pedidos" ? <Pedidos user={user} bot={bot} onOpenChat={setChat} notify={notify} onChanged={loadBot} />
      : current === "info" ? <InfoTienda user={user} notify={notify} onSaved={loadBot} />
      : current === "ajustes" ? <Ajustes user={user} bot={bot} notify={notify} onSaved={setBot} />
      : <Admin user={user} notify={notify} onChanged={loadBot} />}
  </>);

  return (
    <div className="cfx"><div className="wrap">
      {!chat && <Header bot={bot} />}
      {body}
    </div><Toast msg={msg} onClose={closeMsg} /></div>
  );
}

function Header({ bot }) {
  const live = bot?.exists && bot.enabled && bot.status?.phoneConnected;
  const level = !bot?.exists ? null : live ? "ok" : bot.enabled ? "warn" : "off";
  return (
    <div className="phead">
      <div>
        <h1>Confirma</h1>
        <p>{bot?.exists ? `${bot.settings.agentName} confirma los pedidos de ${bot.settings.storeName} por WhatsApp.` : "Tu asistente de WhatsApp confirma tus pedidos contra entrega."}</p>
      </div>
      {bot?.exists && (
        <div className="chiprow">
          <span className="tagline"><span className={`dot ${level}${level === "ok" ? " pulse" : ""}`} />{live ? "Activo" : bot.enabled ? "Falta conectar WhatsApp" : "En pausa"}</span>
          <span className="tagline"><Icon n="sun" size={14} />Reconfirmación {bot.settings.reconfTime}</span>
          <span className="tagline"><Icon n="sparkles" size={14} />{bot.settings.mode === "natural" ? "Modo natural" : "Modo fijo"}</span>
        </div>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <section className="card">
      <div className="empty">
        <div className="eic"><Icon n="bot" size={24} /></div>
        <b>Todavía no tienes Cuadre Confirma</b>
        <p>Es un asistente con IA que confirma por WhatsApp tus pedidos contra entrega, pide la ubicación y reconfirma antes del despacho. Estamos abriendo cupos de a poco.</p>
        <button type="button" className="btn" onClick={() => navTo("bot")}><Icon n="sparkles" size={16} />Quiero acceso</button>
      </div>
    </section>
  );
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────
function Pedidos({ user, bot, onOpenChat, notify, onChanged }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try { setData({ orders: (await botFetch(user, "/bot/orders")).orders, at: Date.now() }); }
    catch (e) { notify(e.message, "error"); }
  }, [user, notify]);
  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 20000); return () => clearInterval(t); }, [load]);

  if (!data) return <div className="empty"><b>Cargando pedidos...</b></div>;
  const { orders, at: now } = data;
  const count = (f) => orders.filter(o => f.states.includes(o.estado)).length;
  const active = FILTERS.find(f => f.key === filter);
  const term = q.trim().toLowerCase();
  const shown = orders.filter(o => (!active || active.states.includes(o.estado)) && (!term || `${o.nombre} ${o.phone} ${o.producto} ${o.dir} ${o.notas}`.toLowerCase().includes(term)));
  const attention = orders.filter(o => o.atencion);
  const ready = orders.filter(o => o.estado === EST.go);
  const today = new Date(now).toDateString();
  const todayCount = orders.filter(o => new Date(o.createdAt).toDateString() === today).length;
  const listText = ready.map((o, i) => `${i + 1}. ${o.nombre} – ${o.phone} – ${o.producto} – ${o.dir} – ${o.total}${o.notas ? " – Nota: " + o.notas : ""}${o.loc?.url ? " – " + o.loc.url : ""}`).join("\n");
  const pick = (k) => { setFilter(filter === k ? "" : k); setTimeout(() => listRef.current?.scrollIntoView({ block: "start" }), 0); };
  const act = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { notify(e.message, "error"); } setBusy(""); };
  const copy = () => act("copy", async () => { await navigator.clipboard.writeText(listText); setCopied(true); setTimeout(() => setCopied(false), 2200); });
  const csv = () => act("csv", () => botDownload(user, "/bot/export.csv", `despacho-${new Date().toISOString().slice(0, 10)}.csv`));
  const dropi = () => act("dropi", async () => { const r = await botFetch(user, "/bot/dropi-all", { method: "POST" }); notify(`${r.count} pedido(s) marcados como subidos a Dropi.`); await load(); onChanged(); });

  return (<>
    <p className="note" style={{ margin: "-6px 0 14px" }}>{todayCount} pedido{todayCount === 1 ? "" : "s"} hoy · {orders.length} en total</p>

    <section className="kpis" aria-label="Resumen por estado">
      {FILTERS.map(f => (
        <button key={f.key} type="button" className={`kpi t-${f.tone}${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => pick(f.key)} style={{ textAlign: "left", cursor: "pointer", font: "inherit" }}>
          <div className="kt"><span className="ki"><Icon n={f.icon} size={17} /></span><span className="kv">{count(f)}</span></div>
          <div><div className="kl">{f.label}</div><div className="kh">{f.key === "confirmados" ? `Se reconfirman a las ${bot.settings.reconfTime}` : f.hint}</div><div className="kgo">{filter === f.key ? "Mostrando · tocar para quitar" : "Ver pedidos →"}</div></div>
        </button>
      ))}
    </section>

    {attention.length > 0 && (
      <section className="card attn-card" aria-label="Necesitan tu atención">
        <div className="card-h"><div><h2><span className="ibox"><Icon n="alert" size={18} /></span>Necesitan tu atención</h2><p>{attention.length} conversación{attention.length === 1 ? "" : "es"} esperando tu respuesta</p></div></div>
        <div className="alist">
          {attention.map(o => (
            <div key={o.id} className="aitem">
              <div className="av">{initials(o.nombre)}</div>
              <div className="min0"><b>{o.nombre || o.phone}</b><div className="small muted">{o.atencion} · {fmtAgo(o.createdAt, now)}</div></div>
              <button type="button" className="btn sm" onClick={() => onOpenChat(o.phone)}><Icon n="message" size={15} />Responder</button>
            </div>
          ))}
        </div>
      </section>
    )}

    <section className="card" aria-label="Para subir a Dropi hoy">
      <div className="card-h">
        <div><h2><span className="ibox" style={{ background: "rgba(16,185,129,.15)", color: "#34d399" }}><Icon n="truck" size={18} /></span>Para subir a Dropi hoy</h2><p>Pedidos reconfirmados por el cliente, listos para tu proveedor</p></div>
        <span className="badge t-emerald"><i />{ready.length} listo{ready.length === 1 ? "" : "s"}</span>
      </div>
      {ready.length ? (<>
        <pre className="dlist">{listText}</pre>
        <div className="actions stack">
          <button type="button" className={"btn" + (copied ? " done" : "")} onClick={copy} disabled={!!busy}><Icon n="copy" size={16} />{copied ? "¡Copiado!" : "Copiar lista"}</button>
          <button type="button" className={"btn ghost" + (busy === "csv" ? " loading" : "")} onClick={csv} disabled={!!busy}><Icon n="download" size={16} />Descargar Excel</button>
          <button type="button" className={"btn ghost" + (busy === "dropi" ? " loading" : "")} onClick={dropi} disabled={!!busy}><Icon n="upload" size={16} />Marcar como subidos</button>
        </div>
      </>) : (
        <div className="empty"><div className="eic"><Icon n="truck" size={24} /></div><b>Nada para despachar todavía</b><p>Los pedidos confirmados se reconfirman solos a las {bot.settings.reconfTime}. Cuando el cliente acepte, aparecerán aquí.</p></div>
      )}
    </section>

    <section className="card" id="pedidos" ref={listRef} aria-label="Lista de pedidos">
      <div className="card-h">
        <div><h2><span className="ibox"><Icon n="package" size={18} /></span>{active ? active.label : "Todos los pedidos"}</h2><p>{shown.length} pedido{shown.length === 1 ? "" : "s"}{active ? " en este estado" : ""}</p></div>
        {active && <button type="button" className="btn ghost sm" onClick={() => setFilter("")}><Icon n="close" size={15} />Quitar filtro</button>}
      </div>
      <div className="searchbox"><Icon n="search" size={18} /><label className="sr" htmlFor="cfq">Buscar pedidos</label><input id="cfq" className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono, producto o dirección" autoComplete="off" /></div>
      <nav className="filters" aria-label="Filtrar por estado">
        <button type="button" className={"fchip" + (filter ? "" : " on")} onClick={() => setFilter("")}>Todos <span className="n">{orders.length}</span></button>
        {FILTERS.map(f => <button key={f.key} type="button" className={`fchip t-${f.tone}${filter === f.key ? " on" : ""}`} onClick={() => setFilter(f.key)}>{f.label} <span className="n">{count(f)}</span></button>)}
      </nav>
      <div className="olist">
        {shown.length === 0 ? (
          <div className="empty"><div className="eic"><Icon n={orders.length ? "search" : "inbox"} size={24} /></div><b>{orders.length ? "Sin resultados" : "Todavía no hay pedidos"}</b><p>{orders.length ? "No hay pedidos con ese filtro o búsqueda." : "Cuando un cliente escriba desde tu tienda, su pedido aparecerá aquí automáticamente."}</p></div>
        ) : shown.map(o => (
          <article key={o.id} className={"order" + (o.atencion ? " attn" : "")} style={{ cursor: "pointer" }} onClick={(e) => { if (!e.target.closest("a,button")) onOpenChat(o.phone); }}>
            <div className="o-client">
              <div className="av">{initials(o.nombre)}</div>
              <div className="min0"><div className="o-name">{o.nombre || o.phone}</div><div className="o-sub">{o.phone} · {fmtAgo(o.createdAt, now)}</div></div>
              <Badge estado={o.estado} />
            </div>
            <div className="o-prod"><div className="min0"><div className="o-label">Pedido</div><div className="p">{o.producto}</div></div><div className="o-total">{o.total}</div></div>
            <div className="min0"><div className="o-label">Entrega</div><div className="o-addr">{o.dir}</div>
              <div className="tags">
                {o.loc?.url
                  ? <a className={"tag " + (o.loc.match === "no" ? "warn" : o.loc.match ? "good" : "")} href={o.loc.url} target="_blank" rel="noopener noreferrer"><Icon n="pin" size={13} />{o.loc.city || "Ver mapa"}{o.loc.match === "no" ? " · no coincide" : ""}</a>
                  : <span className="tag"><Icon n="pin" size={13} />Sin ubicación</span>}
                {o.notas && <span className="tag"><Icon n="note" size={13} />{o.notas}</span>}
                {o.atencion && <span className="tag warn"><Icon n="alert" size={13} />{o.atencion}</span>}
              </div>
            </div>
            <div className="o-state"><div className="o-label">Estado</div><Badge estado={o.estado} /></div>
            <div className="o-act"><button type="button" className="btn ghost sm" onClick={() => onOpenChat(o.phone)}><Icon n="message" size={16} />Abrir chat</button></div>
          </article>
        ))}
      </div>
    </section>
    <p className="foot">{bot.summary}<br />La lista se actualiza sola cada 20 segundos.</p>
  </>);
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
  const name = o?.nombre || c?.profileName || phone;

  return (<>
    <button type="button" className="backlink" onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}><Icon n="back" size={18} />Volver a pedidos</button>
    {!c ? <div className="empty"><b>Cargando conversación...</b></div> : (<>
      <section className="card">
        <div className="chat-head">
          <div className="av">{initials(name)}</div>
          <div className="min0" style={{ flex: 1 }}>
            <div className="chat-name"><b>{name}</b>{o && <Badge estado={o.estado} />}</div>
            <div className="muted small">{phone}{c.profileName ? ` · WhatsApp: ${c.profileName}` : ""}</div>
          </div>
        </div>
        {o && (
          <div className="kv">
            <div><span>Pedido</span><p>{o.producto} · <b>{o.total}</b></p></div>
            <div><span>Entrega</span><p>{o.dir}</p></div>
            <div><span>Ubicación y notas</span><p>{o.loc?.url ? <a href={o.loc.url} target="_blank" rel="noopener noreferrer">{o.loc.city || "Ver mapa"}</a> : "Sin ubicación"}{o.loc?.match === "no" ? " · no coincide" : ""}{o.notas ? <><br />{o.notas}</> : null}</p></div>
          </div>
        )}
        <div className="ctrl">
          <span className={`badge ${paused ? "t-amber" : "t-green"}`}><i />{paused ? `Bot en pausa hasta ${new Date(c.pausedUntil).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}` : "Bot respondiendo"}</span>
          <button type="button" className={"btn ghost sm" + (busy === "pause" ? " loading" : "")} disabled={!!busy} onClick={() => act("pause", () => botFetch(user, `/bot/chats/${phone}/${paused ? "resume" : "pause"}`, { method: "POST" }))}><Icon n={paused ? "play" : "pause"} size={15} />{paused ? "Reanudar bot" : "Pausar bot 12 h"}</button>
          {o && o.estado !== EST.bad && o.estado !== EST.go && <button type="button" className={"btn ghost sm" + (busy === "listo" ? " loading" : "")} disabled={!!busy} onClick={() => act("listo", () => botFetch(user, `/bot/orders/${o.id}/listo`, { method: "POST" }), "Pedido marcado como listo para despachar.")}><Icon n="truck" size={15} />Marcar listo</button>}
          {o && o.estado !== EST.bad && <button type="button" className={"btn danger sm" + (busy === "cancel" ? " loading" : "")} disabled={!!busy} onClick={() => { if (confirm("¿Cancelar este pedido?")) act("cancel", () => botFetch(user, `/bot/orders/${o.id}/cancelar`, { method: "POST" }), "Pedido cancelado."); }}><Icon n="x" size={15} />Cancelar pedido</button>}
        </div>
      </section>
      <section className="card" aria-label="Conversación">
        <div className="thread" ref={boxRef} aria-live="polite">
          {c.messages.length === 0 && <div className="empty"><div className="eic"><Icon n="message" size={24} /></div><b>Sin mensajes</b></div>}
          {c.messages.map((m, i) => (
            <div key={i} className={`msg ${m.from === "dueño" ? "dueno" : m.from}`}>
              {m.from !== "cliente" && <span className="who">{m.from === "dueño" ? "Tú" : "Bot"}</span>}
              {m.text}
              <small>{fmtTime(m.at)}</small>
            </div>
          ))}
        </div>
        <form className="composer" onSubmit={send}>
          <label className="sr" htmlFor="cfreply">Tu respuesta</label>
          <textarea id="cfreply" className="input" rows={1} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e); }} placeholder="Escribe tu respuesta…" />
          <button type="submit" className={"btn" + (busy === "send" ? " loading" : "")} disabled={busy === "send" || !text.trim()} aria-label="Enviar"><Icon n="send" size={19} /></button>
        </form>
        <p className={"note" + (c.within24h ? "" : " warn")}><Icon n={c.within24h ? "pause" : "alert"} size={15} /><span>{c.within24h ? "Al enviar, el bot se pausa 12 h en este chat para no interrumpirte." : "Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp no permite enviar texto libre hasta que vuelva a escribir."}</span></p>
      </section>
    </>)}
  </>);
}

// ─── Info tienda ─────────────────────────────────────────────────────────────
function InfoTienda({ user, notify, onSaved }) {
  const [info, setInfo] = useState(null);
  const [orig, setOrig] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { botFetch(user, "/bot/info").then(r => { setInfo(r.info); setOrig(r.info); }).catch(e => notify(e.message, "error")); }, [user, notify]);
  const dirty = info !== null && info !== orig;
  useEffect(() => { if (!dirty) return; const h = (e) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  if (info === null) return <div className="empty"><b>Cargando...</b></div>;
  const pending = (info.match(/\[[^\]]*\]/g) || []).length;
  const save = async (e) => { e.preventDefault(); setSaving(true); try { await botFetch(user, "/bot/info", { method: "PUT", body: { info } }); setOrig(info); notify("Guardado. Tu asistente ya usa la información nueva."); onSaved(); } catch (err) { notify(err.message, "error"); } setSaving(false); };
  return (<>
    <div className="tips" style={{ marginBottom: 16 }}>
      <div className="tip"><span className="ibox"><Icon n="sparkles" size={16} /></span><div><b>La IA solo usa este texto</b><span>Si algo no está aquí, no lo inventa.</span></div></div>
      <div className="tip"><span className="ibox" style={{ background: "rgba(245,158,11,.14)", color: "#fbbf24" }}><Icon n="alert" size={16} /></span><div><b>[Corchetes] = "no sé"</b><span>Le dice al cliente que lo consulta y te avisa en Pedidos.</span></div></div>
      <div className="tip"><span className="ibox" style={{ background: "rgba(34,197,94,.13)", color: "#4ade80" }}><Icon n="checkCircle" size={16} /></span><div><b>Cambios al instante</b><span>Al guardar, el bot usa la información nueva.</span></div></div>
    </div>
    <form className="card" onSubmit={save}>
      <div className="card-h">
        <div><h2><span className="ibox"><Icon n="file" size={18} /></span>Información de la tienda</h2><p>Escribe una respuesta por línea. Reemplaza lo que está entre [corchetes].</p></div>
        <span className={`badge ${pending ? "t-amber" : "t-green"}`}><i />{pending ? `${pending} por completar` : "Todo completo"}</span>
      </div>
      <div className="editor-wrap"><label className="sr" htmlFor="cfinfo">Información de la tienda</label><textarea id="cfinfo" className="editor" spellCheck={false} value={info} onChange={e => setInfo(e.target.value)} /></div>
      <div className="savebar">
        <span className="savestate" aria-live="polite"><span className={`dot ${dirty ? "warn" : "ok"}`} />{dirty ? "Cambios sin guardar" : "Guardado"}</span>
        <button type="submit" className={"btn" + (saving ? " loading" : "")} disabled={!dirty || saving}><Icon n="save" size={16} />Guardar</button>
      </div>
    </form>
  </>);
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
  const live = bot.enabled && s.phoneConnected;
  const conn = (ok, yes, no) => <span className={`conn ${ok ? "ok" : "off"}`}><span className={`dot ${ok ? "ok" : "off"}`} />{ok ? yes : no}</span>;
  return (<>
    <section className="card" aria-label="Estado del bot">
      <div className="hero-status">
        <div className="big"><Icon n="bot" size={22} /></div>
        <div className="min0"><b><span className={`dot ${live ? "ok pulse" : "warn"}`} />{live ? "Asistente operativo" : bot.enabled ? "Falta conectar tu WhatsApp" : "Asistente en pausa"}</b><div className="muted small">{live ? `${f.agentName} está atendiendo a tus clientes.` : "Para conectar tu número de WhatsApp, escríbenos: lo hacemos contigo en unos minutos."}</div></div>
      </div>
      <div className="stiles">
        <div className="stile"><div className="lab"><Icon n="sparkles" size={15} />Modo de conversación</div><div className="val">{bot.settings.mode === "natural" ? "Natural (la IA escribe)" : "Fijo"}</div></div>
        <div className="stile"><div className="lab"><Icon n="bot" size={15} />Claude AI</div><div className="val">{conn(s.ai, "Conectada", "No disponible")}</div></div>
        <div className="stile"><div className="lab"><Icon n="message" size={15} />WhatsApp</div><div className="val">{conn(s.phoneConnected, "Número conectado", "Sin conectar")}</div></div>
        <div className="stile"><div className="lab"><Icon n="activity" size={15} />Uso de IA este mes</div><div className="val">{bot.usage?.calls || 0} respuestas</div></div>
      </div>
    </section>

    <form className="card" onSubmit={save} aria-label="Tu asistente">
      <div className="card-h"><div><h2><span className="ibox"><Icon n="sliders" size={18} /></span>Tu asistente</h2><p>Cómo se presenta y cuándo trabaja. Horario de Ecuador.</p></div></div>
      <div className="grid2" style={{ marginBottom: 0 }}>
        <div className="field"><label htmlFor="cf-store">Nombre de tu tienda</label><input id="cf-store" className="input" value={f.storeName} onChange={set("storeName")} maxLength={60} required /></div>
        <div className="field"><label htmlFor="cf-agent">Nombre de la asistente</label><input id="cf-agent" className="input" value={f.agentName} onChange={set("agentName")} maxLength={30} required /></div>
        <div className="field"><label htmlFor="cf-mode">Forma de conversar</label><select id="cf-mode" className="input" value={f.mode} onChange={set("mode")}><option value="natural">Natural: la IA escribe cada mensaje</option><option value="fijo">Fija: mensajes iguales siempre</option></select></div>
        <div className="field"><label htmlFor="cf-days">Tiempo de entrega (como lo dirá el bot)</label><input id="cf-days" className="input" value={f.deliveryDays} onChange={set("deliveryDays")} maxLength={80} /></div>
        <div className="field"><label htmlFor="cf-reconf">Reconfirmación automática</label><input id="cf-reconf" type="time" className="input" value={f.reconfTime} onChange={set("reconfTime")} required /></div>
        <div className="field"><label htmlFor="cf-sum">Resumen diario</label><input id="cf-sum" type="time" className="input" value={f.summaryTime} onChange={set("summaryTime")} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="cf-owner">Tu celular para avisos y el resumen (con código de país, sin +)</label><input id="cf-owner" className="input" value={f.ownerPhone} onChange={set("ownerPhone")} inputMode="numeric" placeholder="593991234567" /></div>
      </div>
      <div className="actions" style={{ marginTop: 16 }}><button type="submit" className={"btn" + (saving ? " loading" : "")} disabled={saving}><Icon n="save" size={16} />Guardar ajustes</button></div>
    </form>

    <section className="card" aria-label="Reconfirmaciones manuales">
      <div className="card-h"><div><h2><span className="ibox"><Icon n="sun" size={18} /></span>Reconfirmaciones manuales</h2><p>Se envían solas a las {bot.settings.reconfTime} a los pedidos confirmados antes de hoy. Este botón las envía ya a todos los confirmados.</p></div></div>
      <button type="button" className={"btn block" + (sending ? " loading" : "")} onClick={reconfirm} disabled={sending || !bot.enabled}><Icon n="send" size={16} />Enviar reconfirmaciones ahora</button>
    </section>

    <section className="card" aria-label="Diagnóstico">
      <div className="card-h"><div><h2><span className="ibox"><Icon n="activity" size={18} /></span>Diagnóstico</h2><p>Últimos eventos desde el reinicio del asistente</p></div>{events.length > 0 && <span className="badge t-violet"><i />{events.length} evento{events.length === 1 ? "" : "s"}</span>}</div>
      {events.length ? <ol className="timeline">{events.map((e, i) => <li key={i}><time>{fmtTime(e.at)}</time><span>{e.text}</span></li>)}</ol>
        : <div className="empty"><div className="eic"><Icon n="activity" size={24} /></div><b>Sin eventos todavía</b><p>Aquí verás los mensajes que lleguen y cualquier error, para revisar rápido si algo falla.</p></div>}
    </section>
  </>);
}

// ─── Administrar (solo ADMIN_UIDS en el motor) ───────────────────────────────
function Admin({ user, notify, onChanged }) {
  const [bots, setBots] = useState(null);
  const empty = { uid: "", storeName: "", agentName: "Sofía", phoneNumberId: "", wabaId: "", enabled: true };
  const [f, setF] = useState(empty);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { try { setBots((await botFetch(user, "/admin/bots")).bots); } catch (e) { notify(e.message, "error"); } }, [user, notify]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const edit = (b) => { setF({ uid: b.id, storeName: b.settings.storeName, agentName: b.settings.agentName, phoneNumberId: b.admin.phoneNumberId, wabaId: b.admin.wabaId, enabled: b.enabled }); window.scrollTo({ top: 0 }); };
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); notify(ok); await load(); onChanged(); } catch (e) { notify(e.message, "error"); } setBusy(""); };
  const uid = f.uid.trim();
  const save = (e) => { e.preventDefault(); if (!uid) return; run("save", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}`, { method: "PUT", body: { storeName: f.storeName, agentName: f.agentName, phoneNumberId: f.phoneNumberId, wabaId: f.wabaId, enabled: f.enabled } }), "Tienda guardada."); };
  const totalCalls = useMemo(() => (bots || []).reduce((s, b) => s + (b.usage?.calls || 0), 0), [bots]);

  return (<>
    <form className="card" onSubmit={save} aria-label="Activar o editar una tienda">
      <div className="card-h"><div><h2><span className="ibox"><Icon n="key" size={18} /></span>Activar o editar una tienda</h2><p>El UID es el del usuario en Firebase → Authentication. El número y la cuenta de WhatsApp deben estar compartidos con el portafolio de Cuadre en Meta.</p></div></div>
      <div className="grid2" style={{ marginBottom: 0 }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="ad-uid">UID del usuario (Firebase)</label><input id="ad-uid" className="input" value={f.uid} onChange={set("uid")} required /></div>
        <div className="field"><label htmlFor="ad-store">Nombre de la tienda</label><input id="ad-store" className="input" value={f.storeName} onChange={set("storeName")} /></div>
        <div className="field"><label htmlFor="ad-agent">Nombre de la asistente</label><input id="ad-agent" className="input" value={f.agentName} onChange={set("agentName")} /></div>
        <div className="field"><label htmlFor="ad-pnid">Phone number ID</label><input id="ad-pnid" className="input" value={f.phoneNumberId} onChange={set("phoneNumberId")} inputMode="numeric" /></div>
        <div className="field"><label htmlFor="ad-waba">WABA ID (cuenta de WhatsApp)</label><input id="ad-waba" className="input" value={f.wabaId} onChange={set("wabaId")} inputMode="numeric" /></div>
        <label className="chk"><input type="checkbox" checked={f.enabled} onChange={set("enabled")} />Asistente activado</label>
      </div>
      <div className="actions" style={{ marginTop: 16 }}>
        <button type="submit" className={"btn" + (busy === "save" ? " loading" : "")} disabled={!!busy || !uid}><Icon n="save" size={16} />Guardar tienda</button>
        <button type="button" className={"btn ghost" + (busy === "sub" ? " loading" : "")} disabled={!!busy || !uid || !f.wabaId} onClick={() => run("sub", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}/subscribe`, { method: "POST" }), "Cuenta de WhatsApp conectada a los mensajes.")}><Icon n="link" size={16} />Conectar webhooks</button>
        <button type="button" className="btn ghost" disabled={!!busy} onClick={() => setF(empty)}>Limpiar</button>
      </div>
      <div className="inline-form" style={{ marginTop: 16 }}>
        <div className="field" style={{ flex: "0 1 220px" }}><label htmlFor="ad-pin">PIN para activar el número</label><input id="ad-pin" className="input" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 números" /></div>
        <button type="button" className={"btn ghost" + (busy === "pin" ? " loading" : "")} disabled={!!busy || !uid || pin.length !== 6} onClick={() => run("pin", () => botFetch(user, `/admin/bots/${encodeURIComponent(uid)}/register`, { method: "POST", body: { pin } }), "Número activado en WhatsApp.")}><Icon n="key" size={16} />Activar número</button>
      </div>
    </form>

    <section className="card" aria-label="Tiendas">
      <div className="card-h"><div><h2><span className="ibox"><Icon n="package" size={18} /></span>Tiendas</h2><p>Respuestas de IA este mes: {totalCalls}</p></div><span className="badge t-violet"><i />{bots ? bots.length : "…"}</span></div>
      {!bots ? <div className="empty"><b>Cargando...</b></div> : bots.length === 0 ? <div className="empty"><div className="eic"><Icon n="inbox" size={24} /></div><b>Todavía no hay tiendas</b><p>Crea la primera con el formulario de arriba.</p></div> : (
        <div className="alist">
          {bots.map(b => (
            <div key={b.id} className="aitem">
              <div className="av">{initials(b.settings.storeName)}</div>
              <div className="min0"><b>{b.settings.storeName}</b><div className="small muted" style={{ overflowWrap: "anywhere" }}>{b.id} · número {b.admin.phoneNumberId || "sin conectar"} · {b.usage?.calls || 0} respuestas de IA</div></div>
              <span className={`badge ${b.enabled ? "t-green" : "t-amber"}`}><i />{b.enabled ? "Activa" : "En pausa"}</span>
              <button type="button" className="btn ghost sm" onClick={() => edit(b)}>Editar</button>
            </div>
          ))}
        </div>
      )}
    </section>
  </>);
}
