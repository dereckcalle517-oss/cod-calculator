import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, useNodesState, useNodesInitialized, useReactFlow, useUpdateNodeInternals, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { botFetch } from "../lib/botApi";
import { ICONS } from "../lib/confirmaIcons";
import "./confirmaFlows.css";

// ─── CUADRE CONFIRMA · FLUJOS ────────────────────────────────────────────────
// Editor visual estilo ManyChat: cuadros (mensaje, pregunta, ubicación, agente de IA, acción) unidos con flechas.
// El flujo se guarda en el motor del bot; aquí solo se dibuja, se prueba (simulador) y se envía a clientes.
// Formato de cada cuadro: ver src/flows.js en el motor.

function Icon({ n, size = 18 }) {
  return <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[n] || "" }} />;
}

const TRIGGERS = {
  shopify_order: { label: "Llega un pedido de Shopify", short: "Pedido de Shopify", icon: "package" },
  keyword: { label: "El cliente escribe una palabra clave", short: "Palabra clave", icon: "search" },
  first_message: { label: "Un cliente nuevo escribe por primera vez", short: "Primer mensaje", icon: "sparkles" },
  any_message: { label: "Cualquier mensaje (si no hay otro flujo en curso)", short: "Cualquier mensaje", icon: "message" },
  manual: { label: "Solo cuando yo lo envío a mis clientes", short: "Envío manual", icon: "send" },
};
const META = {
  start: { label: "Inicio", icon: "zap", tone: "violet" },
  message: { label: "Mensaje", icon: "message", tone: "blue" },
  question: { label: "Pregunta", icon: "help", tone: "amber" },
  location: { label: "Pedir ubicación", icon: "pin", tone: "emerald" },
  ai: { label: "Agente de IA", icon: "sparkles", tone: "purple" },
  action: { label: "Acción", icon: "checkCircle", tone: "green" },
  end: { label: "Fin", icon: "flag", tone: "red" },
};
const ACTIONS = {
  confirm: "Marcar pedido confirmado",
  cancel: "Cancelar el pedido",
  ready: "Marcar listo para despachar",
  handoff: "Pasar a una persona (pausa el bot)",
  notify: "Avisarme por WhatsApp",
  note: "Agregar nota de entrega",
};
const BUTTON_ACTIONS = { "": "Sin acción", confirm: "Confirmar pedido", cancel: "Cancelar pedido", ready: "Listo para despachar", handoff: "Pasar a una persona" };
const metaOf = n => META[n.type === "question" && n.kind === "location" ? "location" : n.type] || META.message;
const rid = p => `${p}_${Math.random().toString(36).slice(2, 7)}`;
const fmtDate = ts => (ts ? new Date(ts).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function newNode(kind) {
  const base = { id: rid(kind === "location" ? "ubicacion" : kind), timeoutMin: 0, timeoutNext: "" };
  switch (kind) {
    case "message": return { ...base, type: "message", texts: ["Escribe aquí tu mensaje"], buttons: [], next: "" };
    case "buttons": return { ...base, id: rid("botones"), type: "message", texts: ["¿Qué prefieres?"], buttons: [{ id: "b1", title: "Opción 1", next: "", action: "" }, { id: "b2", title: "Opción 2", next: "", action: "" }], next: "" };
    case "question": return { ...base, type: "question", kind: "text", text: "¿Me cuentas...?", saveAs: "respuesta", next: "", mismatchNext: "" };
    case "location": return { ...base, type: "question", kind: "location", text: "📍 Envíame tu ubicación por aquí, por favor", saveAs: "", next: "", mismatchNext: "" };
    case "ai": return { ...base, type: "ai", goal: "Responde las dudas del cliente usando la información de mi tienda.", next: "", noNext: "" };
    case "action": return { id: rid("accion"), type: "action", action: "notify", text: "", next: "" };
    default: return { id: rid("fin"), type: "end" };
  }
}

// Salidas (flechas) de cada cuadro: [id de la salida, campo, texto]
function outputsOf(n) {
  const outs = [];
  if (n.type === "start" || n.type === "action") outs.push(["next", "next", "Siguiente"]);
  if (n.type === "message") {
    if (n.buttons?.length) n.buttons.forEach(b => outs.push([`b:${b.id}`, null, b.title]));
    else outs.push(["next", "next", "Siguiente"]);
  }
  if (n.type === "question") {
    outs.push(["next", "next", n.kind === "location" ? "Envió la ubicación" : "Respondió"]);
    if (n.kind === "location") outs.push(["mismatch", "mismatchNext", "Está en otra ciudad"]);
  }
  if (n.type === "ai") { outs.push(["next", "next", "Logró el objetivo"]); outs.push(["no", "noNext", "No puede / no quiere"]); }
  if (["message", "question", "ai"].includes(n.type) && n.timeoutMin > 0 && (n.type !== "message" || n.buttons?.length)) outs.push(["timeout", "timeoutNext", `Si no responde en ${n.timeoutMin} min`]);
  return outs;
}
function getTarget(n, handle) {
  if (handle.startsWith("b:")) return n.buttons?.find(b => `b:${b.id}` === handle)?.next || "";
  const f = outputsOf(n).find(o => o[0] === handle)?.[1];
  return f ? n[f] || "" : "";
}
function setTarget(n, handle, target) {
  if (handle.startsWith("b:")) return { ...n, buttons: n.buttons.map(b => (`b:${b.id}` === handle ? { ...b, next: target } : b)) };
  const f = { next: "next", mismatch: "mismatchNext", no: "noNext", timeout: "timeoutNext" }[handle];
  return f ? { ...n, [f]: target } : n;
}
const toRF = nodes => nodes.map(n => ({ id: n.id, type: "cf", position: { x: n.pos?.x || 0, y: n.pos?.y || 0 }, data: { node: n }, deletable: n.type !== "start" }));
const fromRF = rf => rf.map(r => ({ ...r.data.node, id: r.id, pos: { x: Math.round(r.position.x), y: Math.round(r.position.y) } }));

const UiCtx = createContext({ liveId: "", incoming: new Set() });

// ─── Un cuadro en el lienzo ──────────────────────────────────────────────────
function FlowNode({ id, data, selected }) {
  const n = data.node;
  const m = metaOf(n);
  const { liveId, incoming } = useContext(UiCtx);
  const outs = outputsOf(n);
  const update = useUpdateNodeInternals();
  const sig = outs.map(o => o[0]).join("|");
  useEffect(() => { update(id); }, [id, sig, update]);
  const orphan = n.type !== "start" && !incoming.has(id);

  return (
    <div className={`fx-node tone-${m.tone}${selected ? " sel" : ""}${liveId === id ? " live" : ""}${orphan ? " orphan" : ""}`}>
      {n.type !== "start" && <Handle type="target" position={Position.Left} className="fx-h in" />}
      <div className="fx-nh"><span className="fx-ni"><Icon n={m.icon} size={14} /></span>{m.label}{orphan && <span className="fx-warn" title="Ninguna flecha llega a este cuadro">sin conexión</span>}</div>
      <div className="fx-nb">
        {n.type === "start" && <p className="fx-muted">El flujo empieza aquí</p>}
        {n.type === "message" && n.texts.map((t, i) => <div key={i} className="fx-bubble">{t}</div>)}
        {n.type === "question" && <div className="fx-bubble">{n.text}</div>}
        {n.type === "question" && n.kind === "text" && n.saveAs && <p className="fx-muted">Guarda la respuesta en {`{{${n.saveAs}}}`}</p>}
        {n.type === "question" && n.kind === "location" && <div className="fx-fakebtn"><Icon n="pin" size={13} />Enviar ubicación</div>}
        {n.type === "ai" && <p className="fx-goal"><b>Objetivo:</b> {n.goal}</p>}
        {n.type === "action" && <p className="fx-act">{ACTIONS[n.action]}{n.text ? <span className="fx-muted"> · {n.text}</span> : null}</p>}
        {n.type === "end" && <p className="fx-muted">Termina el flujo. Si el cliente vuelve a escribir, la IA responde sus dudas.</p>}
      </div>
      {outs.length > 0 && (
        <div className="fx-outs">
          {outs.map(([h, , label]) => {
            const btn = h.startsWith("b:");
            const b = btn ? n.buttons.find(x => `b:${x.id}` === h) : null;
            return (
              <div key={h} className={`fx-out${btn ? " fxb" : ""}${h === "timeout" ? " to" : ""}${h === "mismatch" || h === "no" ? " alt" : ""}`}>
                <span>{label}</span>{b?.action && <span className="fx-pill">{BUTTON_ACTIONS[b.action]}</span>}
                <Handle type="source" position={Position.Right} id={h} className="fx-h out" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const nodeTypes = { cf: FlowNode };
const PALETTE = [["message", "Mensaje", "message", "Texto, con burbujas separadas"], ["buttons", "Botones", "pointer", "Mensaje con hasta 3 opciones"], ["question", "Pregunta", "help", "Guarda lo que responda"], ["location", "Ubicación", "pin", "Pide la ubicación con botón"], ["ai", "Agente IA", "sparkles", "Conversa hasta lograr un objetivo"], ["action", "Acción", "checkCircle", "Confirmar, cancelar, avisarte..."], ["end", "Fin", "flag", "Termina el flujo"]];

// ─── Lista de flujos ─────────────────────────────────────────────────────────
export default function FlowsTab({ user, bot, notify }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try { setData(await botFetch(user, "/bot/flows")); } catch (e) { notify(e.message, "error"); }
  }, [user, notify]);
  useEffect(() => { load(); }, [load]);

  async function create(template) {
    setBusy(template || "blank");
    try {
      const f = await botFetch(user, "/bot/flows", { method: "POST", body: template ? { template } : { name: "Nuevo flujo" } });
      setCreating(false); await load(); setEditing(f.id);
    } catch (e) { notify(e.code === "muchos-flujos" ? "Llegaste al máximo de flujos. Borra uno que no uses." : e.message, "error"); }
    setBusy("");
  }
  async function toggle(f) {
    setBusy(f.id);
    try {
      const full = await botFetch(user, `/bot/flows/${f.id}`);
      const r = await botFetch(user, `/bot/flows/${f.id}`, { method: "PUT", body: { ...full, active: !f.active } });
      notify(r.flow.active ? `"${r.flow.name}" está activo${r.turnedOff.length ? `. Se apagó "${r.turnedOff.join('", "')}" porque tiene el mismo disparador.` : ""}` : `"${r.flow.name}" quedó apagado`);
      await load();
    } catch (e) { notify(e.message, "error"); }
    setBusy("");
  }
  async function remove(f) {
    if (!window.confirm(`¿Borrar el flujo "${f.name}"? No se puede deshacer.`)) return;
    try { await botFetch(user, `/bot/flows/${f.id}`, { method: "DELETE" }); notify("Flujo borrado"); load(); }
    catch (e) { notify(e.message, "error"); }
  }

  if (editing) return <ReactFlowProvider><FlowEditor user={user} bot={bot} id={editing} meta={data} notify={notify} onClose={() => { setEditing(null); load(); }} /></ReactFlowProvider>;
  if (!data) return <div className="empty"><b>Cargando tus flujos...</b></div>;

  return (
    <>
      <section className="card">
        <div className="card-h">
          <div className="min0">
            <h2><span className="ibox"><Icon n="flow" /></span>Mis flujos</h2>
            <p>Arma tus conversaciones con cuadros y flechas. Si ningún flujo activo coincide, tu asistente sigue con la confirmación de siempre.</p>
          </div>
          <button type="button" className="btn" onClick={() => setCreating(c => !c)}><Icon n="plus" size={16} />Crear flujo</button>
        </div>
        {creating && (
          <div className="fx-tpls">
            {data.templates.map(t => (
              <button key={t.key} type="button" className="fx-tpl" onClick={() => create(t.key)} disabled={!!busy}>
                <span className="fx-tpl-h"><Icon n={TRIGGERS[t.trigger]?.icon || "flow"} size={16} />{t.name}</span>
                <span className="fx-tpl-d">{t.description}</span>
                <span className="fx-tpl-t">{TRIGGERS[t.trigger]?.short}</span>
              </button>
            ))}
            <button type="button" className="fx-tpl blank" onClick={() => create(null)} disabled={!!busy}>
              <span className="fx-tpl-h"><Icon n="plus" size={16} />En blanco</span>
              <span className="fx-tpl-d">Empieza desde cero y arma tu propio flujo.</span>
            </button>
          </div>
        )}
        {data.flows.length === 0 && !creating && (
          <div className="empty">
            <div className="eic"><Icon n="flow" size={24} /></div>
            <b>Todavía no tienes flujos</b>
            <p>Empieza con la plantilla "Confirmación contra entrega": es el mismo flujo que usa tu asistente hoy, listo para que lo cambies a tu gusto.</p>
            <button type="button" className="btn" onClick={() => create("cod")} disabled={!!busy}><Icon n="sparkles" size={16} />Usar la plantilla</button>
          </div>
        )}
        <div className="fx-list">
          {data.flows.map(f => (
            <article key={f.id} className={"fx-item" + (f.active ? " on" : "")}>
              <button type="button" className="fx-item-main" onClick={() => setEditing(f.id)}>
                <span className="fx-item-ic"><Icon n={TRIGGERS[f.trigger.type]?.icon || "flow"} size={18} /></span>
                <span className="min0">
                  <b>{f.name}</b>
                  <span className="fx-item-sub">{TRIGGERS[f.trigger.type]?.short}{f.trigger.type === "keyword" ? `: ${f.trigger.keywords.join(", ")}` : ""} · {f.nodes} cuadros · {fmtDate(f.updatedAt)}</span>
                </span>
              </button>
              <div className="fx-item-act">
                <label className="fx-switch" title={f.active ? "Apagar" : "Activar"}>
                  <input type="checkbox" checked={f.active} disabled={busy === f.id} onChange={() => toggle(f)} aria-label={`${f.active ? "Apagar" : "Activar"} ${f.name}`} />
                  <span /><em>{f.active ? "Activo" : "Apagado"}</em>
                </label>
                <button type="button" className="btn ghost sm" onClick={() => setEditing(f.id)}><Icon n="edit" size={15} />Editar</button>
                <button type="button" className="btn danger sm" aria-label={`Borrar ${f.name}`} onClick={() => remove(f)}><Icon n="trash" size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-h"><div><h2><span className="ibox"><Icon n="help" /></span>¿Cómo funcionan?</h2></div></div>
        <div className="tips">
          <div className="tip"><div><b>1. Elige el disparador</b><span className="muted small">Cuándo arranca: un pedido de Shopify, una palabra clave, el primer mensaje o cuando tú lo envías.</span></div></div>
          <div className="tip"><div><b>2. Une los cuadros</b><span className="muted small">Arrastra desde el punto de la derecha de un cuadro hasta otro. Cada botón tiene su propia flecha.</span></div></div>
          <div className="tip"><div><b>3. Pruébalo y actívalo</b><span className="muted small">Usa "Probar" para conversar con tu flujo sin gastar WhatsApp. Luego actívalo.</span></div></div>
        </div>
      </section>
    </>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────
function FlowEditor({ user, bot, id, meta, notify, onClose }) {
  const [flow, setFlow] = useState(null); // datos del flujo (sin los cuadros)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [saved, setSaved] = useState("");
  const [selEdge, setSelEdge] = useState("");
  const [panel, setPanel] = useState(""); // "" | "sim" | "send"
  const [full, setFull] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveId, setLiveId] = useState("");
  const [dropMenu, setDropMenu] = useState(null); // menú "¿qué sigue?" al soltar una flecha en el vacío
  const rf = useReactFlow();
  useEffect(() => {
    document.body.classList.add("fx-editing");
    return () => document.body.classList.remove("fx-editing");
  }, []);
  // Al abrir, mostrar el flujo completo (cuando los cuadros ya tienen tamaño)
  const inited = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => {
    if (!inited || fitted.current) return;
    fitted.current = true;
    // Si el flujo completo se vería muy pequeño, se abre legible desde el Inicio (y se recorre arrastrando)
    const ns = rf.getNodes();
    const box = document.querySelector(".fx-canvas")?.getBoundingClientRect();
    if (!ns.length || !box) return;
    const minX = Math.min(...ns.map(n => n.position.x)), maxX = Math.max(...ns.map(n => n.position.x + (n.measured?.width || 260)));
    const minY = Math.min(...ns.map(n => n.position.y)), maxY = Math.max(...ns.map(n => n.position.y + (n.measured?.height || 160)));
    const fit = Math.min(box.width / (maxX - minX + 120), box.height / (maxY - minY + 120));
    if (fit >= 0.55) { rf.fitView({ padding: 0.1, maxZoom: 0.9 }); return; } // (no devolver la promesa: React la tomaría como limpieza)
    const start = ns.find(n => n.data.node.type === "start") || ns[0];
    const z = 0.65;
    rf.setViewport({ zoom: z, x: 40 - start.position.x * z, y: box.height / 2 - (start.position.y + 60) * z });
  }, [inited, rf]);

  useEffect(() => {
    let off = false;
    botFetch(user, `/bot/flows/${id}`).then(f => {
      if (off) return;
      const { nodes: ns, ...rest } = f;
      setFlow(rest); setNodes(toRF(ns));
      setSaved(JSON.stringify({ ...rest, nodes: ns.map(n => ({ ...n })) , updatedAt: 0 }));
    }).catch(e => { notify(e.message, "error"); onClose(); });
    return () => { off = true; };
  }, [user, id, setNodes, notify, onClose]);

  const plain = useMemo(() => fromRF(nodes), [nodes]);
  const current = useMemo(() => (flow ? { ...flow, nodes: plain, updatedAt: 0 } : null), [flow, plain]);
  const dirty = !!current && JSON.stringify(current) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const h = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Flechas: salen de lo que dice cada cuadro
  const edges = useMemo(() => {
    const ids = new Set(plain.map(n => n.id));
    const out = [];
    for (const n of plain) for (const [h, , label] of outputsOf(n)) {
      const t = getTarget(n, h);
      if (t && ids.has(t)) {
        const eid = `${n.id}|${h}`;
        const tone = h === "timeout" ? "#F59E0B" : h === "mismatch" || h === "no" ? "#F87171" : "#8B5CF6";
        out.push({ id: eid, source: n.id, sourceHandle: h, target: t, type: "smoothstep", selected: selEdge === eid, animated: liveId === n.id, style: { stroke: tone, strokeWidth: selEdge === eid ? 3 : 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: tone }, ariaLabel: `${label} → ${t}` });
      }
    }
    return out;
  }, [plain, selEdge, liveId]);
  const incoming = useMemo(() => new Set(edges.map(e => e.target)), [edges]);

  const plainRef = useRef(plain);
  useEffect(() => { plainRef.current = plain; }, [plain]);
  const patchNode = useCallback((nid, fn) => setNodes(ns => ns.map(r => (r.id === nid ? { ...r, data: { node: fn(r.data.node) } } : r))), [setNodes]);
  const onConnect = useCallback(p => {
    if (!p.source || !p.target || p.source === p.target) return;
    patchNode(p.source, n => setTarget(n, p.sourceHandle || "next", p.target));
  }, [patchNode]);
  const onEdgesChange = useCallback(changes => {
    for (const c of changes) {
      if (c.type === "select") setSelEdge(c.selected ? c.id : "");
      if (c.type === "remove") { const [src, h] = c.id.split("|"); patchNode(src, n => setTarget(n, h, "")); setSelEdge(""); }
    }
  }, [patchNode]);
  const onNodesChangeSafe = useCallback(changes => {
    const removed = changes.filter(c => c.type === "remove").map(c => c.id);
    onNodesChange(changes.filter(c => c.type !== "remove" || !plainRef.current.find(n => n.id === c.id && n.type === "start")));
    if (removed.length) setNodes(ns => ns.map(r => {
      let n = r.data.node;
      for (const [h] of outputsOf(n)) if (removed.includes(getTarget(n, h))) n = setTarget(n, h, "");
      return n === r.data.node ? r : { ...r, data: { node: n } };
    }));
  }, [onNodesChange, setNodes]);
  const selected = nodes.find(r => r.selected);
  const selNode = selected?.data.node || null;

  // Agrega un cuadro en `pos` (o en un lugar libre cerca del centro) y, si viene de una flecha, lo conecta
  function add(kind, { pos = null, from = null } = {}) {
    const n = newNode(kind);
    const el = document.querySelector(".fx-canvas");
    const box = el?.getBoundingClientRect();
    const center = box ? rf.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 0, y: 0 };
    // Lugar del cuadro nuevo: donde se soltó la flecha, o uno libre cerca del centro de la pantalla
    const ns0 = rf.getNodes();
    let p = pos;
    if (!p) {
      const W = 270, H = 190;
      const hits = (x, y) => ns0.some(r => { const w = r.measured?.width || 260, h = r.measured?.height || 160; return x < r.position.x + w + 20 && x + W > r.position.x - 20 && y < r.position.y + h + 20 && y + H > r.position.y - 20; });
      p = { x: center.x - 130, y: center.y - 80 };
      for (let i = 1; i < 40 && hits(p.x, p.y); i++) {
        const a = i * 0.9, d = 60 + i * 28;
        p = { x: center.x - 130 + Math.cos(a) * d, y: center.y - 80 + Math.sin(a) * d };
      }
    }
    setNodes(ns => [
      ...ns.map(r => {
        const base = { ...r, selected: false };
        return from && r.id === from.source ? { ...base, data: { node: setTarget(r.data.node, from.handle, n.id) } } : base;
      }),
      { id: n.id, type: "cf", position: p, data: { node: n }, selected: true },
    ]);
    // Al abrirse el panel de edición el lienzo se angosta: centrar el cuadro nuevo para que no quede tapado
    setTimeout(() => rf.setCenter(p.x + 130, p.y + 90, { zoom: rf.getZoom(), duration: 300 }), 80);
    setDropMenu(null);
  }
  // Soltar una flecha: sobre un cuadro → se conecta; en el vacío → menú para crear el siguiente cuadro
  const onConnectEnd = useCallback((event, cs) => {
    if (cs.isValid || !cs.fromNode || cs.fromHandle?.type !== "source") return;
    const handle = cs.fromHandle.id || "next";
    if (cs.toNode && cs.toNode.id !== cs.fromNode.id && cs.toNode.data?.node?.type !== "start") {
      patchNode(cs.fromNode.id, n => setTarget(n, handle, cs.toNode.id));
      return;
    }
    const pt = "changedTouches" in event && event.changedTouches.length ? event.changedTouches[0] : event;
    const box = document.querySelector(".fx-canvas")?.getBoundingClientRect();
    if (!box) return;
    const fp = rf.screenToFlowPosition({ x: pt.clientX, y: pt.clientY });
    setDropMenu({ x: Math.min(pt.clientX - box.left + 8, box.width - 232), y: Math.min(pt.clientY - box.top - 20, box.height - 430), pos: { x: fp.x, y: fp.y - 40 }, from: { source: cs.fromNode.id, handle } });
  }, [patchNode, rf]);
  useEffect(() => {
    if (!dropMenu) return;
    const k = e => { if (e.key === "Escape") setDropMenu(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [dropMenu]);
  function removeNode(nid) {
    onNodesChangeSafe([{ type: "remove", id: nid }]);
  }

  async function save() {
    if (!current) return null;
    setSaving(true);
    try {
      const r = await botFetch(user, `/bot/flows/${id}`, { method: "PUT", body: current });
      const { nodes: ns, ...rest } = r.flow;
      setFlow(rest);
      setSaved(JSON.stringify({ ...rest, nodes: ns, updatedAt: 0 }));
      notify(r.turnedOff.length ? `Guardado. Se apagó "${r.turnedOff.join('", "')}" porque tiene el mismo disparador.` : "Flujo guardado");
      setSaving(false);
      return r.flow;
    } catch (e) {
      notify(e.message, "error"); setSaving(false); return null;
    }
  }
  function close() {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) return;
    onClose();
  }

  if (!flow) return <div className="empty"><b>Abriendo el flujo...</b></div>;
  const trig = flow.trigger;
  const tokens = Object.keys(meta?.variables || {});

  return (
    <div className={"fx-editor" + (full ? " full" : "")}>
      <div className="fx-top">
        <button type="button" className="btn ghost sm" onClick={close}><Icon n="back" size={16} /><span className="fx-hide-sm">Mis flujos</span></button>
        <input className="input fx-name" value={flow.name} maxLength={60} aria-label="Nombre del flujo" onChange={e => setFlow(f => ({ ...f, name: e.target.value }))} />
        <div className="fx-trig">
          <Icon n={TRIGGERS[trig.type]?.icon || "zap"} size={15} />
          <select className="input" value={trig.type} aria-label="Disparador: cuándo arranca este flujo" onChange={e => setFlow(f => ({ ...f, trigger: { type: e.target.value, keywords: f.trigger.keywords || [] } }))}>
            {Object.entries(TRIGGERS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </div>
        {trig.type === "keyword" && (
          <input className="input fx-kw" placeholder="Palabras clave, separadas por coma" aria-label="Palabras clave"
            defaultValue={(trig.keywords || []).join(", ")}
            onBlur={e => setFlow(f => ({ ...f, trigger: { ...f.trigger, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10) } }))} />
        )}
        <label className="fx-switch">
          <input type="checkbox" checked={flow.active} onChange={e => setFlow(f => ({ ...f, active: e.target.checked }))} aria-label="Flujo activo" />
          <span /><em>{flow.active ? "Activo" : "Apagado"}</em>
        </label>
        <div className="fx-top-r">
          <button type="button" className={"btn ghost sm" + (panel === "sim" ? " on" : "")} onClick={() => setPanel(p => (p === "sim" ? "" : "sim"))}><Icon n="play" size={15} />Probar</button>
          <button type="button" className={"btn ghost sm" + (panel === "send" ? " on" : "")} onClick={() => setPanel(p => (p === "send" ? "" : "send"))}><Icon n="send" size={15} /><span className="fx-hide-sm">Enviar</span></button>
          <button type="button" className="btn ghost sm" aria-label={full ? "Salir de pantalla completa" : "Pantalla completa"} title={full ? "Salir de pantalla completa" : "Pantalla completa"} onClick={() => setFull(v => !v)}><Icon n={full ? "shrink" : "expand"} size={15} /></button>
          <button type="button" className={"btn sm" + (saving ? " loading" : "")} disabled={!dirty || saving} onClick={save}><Icon n="save" size={15} />{dirty ? "Guardar" : "Guardado"}</button>
        </div>
      </div>

      <div className="fx-body">
        <div className="fx-palette" role="toolbar" aria-label="Agregar cuadros">
          {PALETTE.map(([k, l, ic]) => (
            <button key={k} type="button" className={`fx-pal tone-${META[k === "buttons" ? "message" : k]?.tone || "blue"}`} onClick={() => add(k)} title={`Agregar ${l}`}>
              <Icon n={ic} size={16} /><span>{l}</span>
            </button>
          ))}
        </div>

        <div className="fx-canvas">
          <UiCtx.Provider value={{ liveId, incoming }}>
            <ReactFlow
              nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={onNodesChangeSafe} onEdgesChange={onEdgesChange} onConnect={onConnect} onConnectEnd={onConnectEnd}
              onPaneClick={() => { setSelEdge(""); setDropMenu(null); }} onMoveStart={() => setDropMenu(null)}
              colorMode="dark" minZoom={0.15} maxZoom={1.6}
              deleteKeyCode={["Backspace", "Delete"]} connectionRadius={36} proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "smoothstep" }} connectionLineStyle={{ stroke: "#a78bfa", strokeWidth: 2 }}
            >
              <Background gap={22} size={1.4} color="#2b2b44" />
              <Controls showInteractive={false} position="bottom-left" />
            </ReactFlow>
          </UiCtx.Provider>
          {dropMenu && (
            <div className="fx-drop" style={{ left: Math.max(8, dropMenu.x), top: Math.max(8, dropMenu.y) }} role="menu" aria-label="Agregar el siguiente cuadro">
              <div className="fx-drop-h">¿Qué sigue?<button type="button" className="fx-x" aria-label="Cerrar" onClick={() => setDropMenu(null)}><Icon n="close" size={14} /></button></div>
              {PALETTE.map(([k, l, ic, d]) => (
                <button key={k} type="button" role="menuitem" className={`fx-drop-i tone-${META[k === "buttons" ? "message" : k]?.tone || "blue"}`} onClick={() => add(k, { pos: dropMenu.pos, from: dropMenu.from })}>
                  <span className="fx-ni"><Icon n={ic} size={15} /></span><span className="min0"><b>{l}</b><small>{d}</small></span>
                </button>
              ))}
            </div>
          )}
          {!selNode && !panel && !selEdge && !dropMenu && <div className="fx-tip fx-hide-sm"><Icon n="pointer" size={14} />Toca un cuadro para editarlo · arrastra desde un punto de la derecha: suéltalo en otro cuadro para unirlos, o en el vacío para crear el siguiente · arrastra el fondo para moverte</div>}
          {selEdge && (
            <button type="button" className="btn danger sm fx-edge-del" onClick={() => onEdgesChange([{ type: "remove", id: selEdge }])}><Icon n="trash" size={14} />Quitar flecha</button>
          )}
        </div>

        {panel === "sim" ? <Simulator user={user} flow={current} onLive={setLiveId} onClose={() => { setPanel(""); setLiveId(""); }} />
          : panel === "send" ? <SendPanel user={user} bot={bot} flow={current} dirty={dirty} save={save} notify={notify} onClose={() => setPanel("")} />
          : selNode ? <NodePanel key={selNode.id} node={selNode} tokens={tokens} vars={meta?.variables || {}} onChange={fn => patchNode(selNode.id, fn)} onRemove={() => removeNode(selNode.id)} onClose={() => setNodes(ns => ns.map(r => ({ ...r, selected: false })))} />
          : null}
      </div>
    </div>
  );
}

// ─── Panel para editar un cuadro ─────────────────────────────────────────────
function VarChips({ tokens, vars, onPick }) {
  return (
    <div className="fx-vars" aria-label="Insertar variable">
      {tokens.map(t => <button key={t} type="button" title={vars[t]} onMouseDown={e => e.preventDefault()} onClick={() => onPick(`{{${t}}}`)}>{`{{${t}}}`}</button>)}
    </div>
  );
}
function TimeoutField({ node, onChange }) {
  return (
    <div className="field">
      <label htmlFor="fx-to">Si no responde en (minutos)</label>
      <input id="fx-to" className="input" type="number" min="0" max="10080" value={node.timeoutMin || 0} onChange={e => onChange(n => ({ ...n, timeoutMin: Math.max(0, Math.min(10080, Number(e.target.value) || 0)) }))} />
      <span className="fx-help">0 = espera sin límite. Con un número aparece la salida "Si no responde" para enviarle un recordatorio. Solo funciona dentro de las 24 h de WhatsApp.</span>
    </div>
  );
}

function NodePanel({ node, tokens, vars, onChange, onRemove, onClose }) {
  const m = metaOf(node);
  // Insertar una variable donde está el cursor (cada campo dice qué dato edita con data-fx)
  function setField(key, v) {
    if (key.startsWith("text:")) { const i = Number(key.slice(5)); onChange(n => ({ ...n, texts: n.texts.map((x, j) => (j === i ? v : x)) })); }
    else onChange(n => ({ ...n, [key]: v }));
  }
  function insert(tok) {
    const el = document.activeElement;
    const key = el?.dataset?.fx;
    if (!key) return;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length;
    setField(key, el.value.slice(0, s) + tok + el.value.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + tok.length, s + tok.length); });
  }

  return (
    <aside className="fx-side" aria-label={`Editar ${m.label}`}>
      <div className="fx-side-h">
        <span className={`fx-ni tone-${m.tone}`}><Icon n={m.icon} size={15} /></span><b>{m.label}</b>
        <button type="button" className="fx-x" aria-label="Cerrar" onClick={onClose}><Icon n="close" size={16} /></button>
      </div>
      <div className="fx-side-b">
        {node.type === "start" && <p className="fx-help">Une este cuadro con el primero que quieras que vea tu cliente. Cambia el disparador arriba.</p>}

        {node.type === "message" && <>
          <p className="fx-help">Cada burbuja se envía como un mensaje separado, con "escribiendo..." entre uno y otro.</p>
          {node.texts.map((t, i) => (
            <div className="field" key={i}>
              <label htmlFor={`fx-t${i}`}>Mensaje {i + 1}</label>
              <div className="fx-row">
                <textarea id={`fx-t${i}`} className="input" rows={3} maxLength={1000} value={t}
                  data-fx={`text:${i}`}
                  onChange={e => { const v = e.target.value; onChange(n => ({ ...n, texts: n.texts.map((x, j) => (j === i ? v : x)) })); }} />
                {node.texts.length > 1 && <button type="button" className="fx-x" aria-label={`Quitar mensaje ${i + 1}`} onClick={() => onChange(n => ({ ...n, texts: n.texts.filter((_, j) => j !== i) }))}><Icon n="trash" size={15} /></button>}
              </div>
            </div>
          ))}
          {node.texts.length < 5 && <button type="button" className="btn ghost sm" onClick={() => onChange(n => ({ ...n, texts: [...n.texts, ""] }))}><Icon n="plus" size={14} />Agregar mensaje</button>}
          <VarChips tokens={tokens} vars={vars} onPick={insert} />

          <div className="fx-sep">Botones <span className="fx-help">(máximo 3, de 20 letras; van en el último mensaje)</span></div>
          {node.buttons.map((b, i) => (
            <div className="fx-btnrow" key={b.id}>
              <input className="input" maxLength={20} value={b.title} aria-label={`Texto del botón ${i + 1}`} onChange={e => { const v = e.target.value; onChange(n => ({ ...n, buttons: n.buttons.map(x => (x.id === b.id ? { ...x, title: v } : x)) })); }} />
              <span className="fx-count">{b.title.length}/20</span>
              <select className="input" value={b.action} aria-label={`Acción del botón ${i + 1}`} onChange={e => { const v = e.target.value; onChange(n => ({ ...n, buttons: n.buttons.map(x => (x.id === b.id ? { ...x, action: v } : x)) })); }}>
                {Object.entries(BUTTON_ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button type="button" className="fx-x" aria-label={`Quitar botón ${i + 1}`} onClick={() => onChange(n => ({ ...n, buttons: n.buttons.filter(x => x.id !== b.id) }))}><Icon n="trash" size={15} /></button>
            </div>
          ))}
          {node.buttons.length < 3 && <button type="button" className="btn ghost sm" onClick={() => onChange(n => ({ ...n, next: "", buttons: [...n.buttons, { id: rid("b"), title: n.buttons.length ? "Otra opción" : "Sí", next: "", action: "" }] }))}><Icon n="plus" size={14} />Agregar botón</button>}
          {node.buttons.length > 0 && <>
            <p className="fx-help">Si el cliente escribe en vez de tocar un botón, la IA responde su duda y vuelve a mostrar los botones. Si entiende que dijo que sí, sigue por el primer botón; si dijo que no, por el último.</p>
            <TimeoutField node={node} onChange={onChange} />
          </>}
        </>}

        {node.type === "question" && <>
          <div className="field">
            <label htmlFor="fx-k">Tipo de respuesta</label>
            <select id="fx-k" className="input" value={node.kind} onChange={e => { const v = e.target.value; onChange(n => ({ ...n, kind: v, mismatchNext: v === "location" ? n.mismatchNext : "" })); }}>
              <option value="text">Texto (nombre, referencia, horario...)</option>
              <option value="location">Ubicación (con el botón de WhatsApp)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fx-q">Pregunta</label>
            <textarea id="fx-q" className="input" rows={4} maxLength={1000} value={node.text} data-fx="text" onChange={e => { const v = e.target.value; onChange(n => ({ ...n, text: v })); }} />
          </div>
          <VarChips tokens={tokens} vars={vars} onPick={insert} />
          {node.kind === "text" && (
            <div className="field">
              <label htmlFor="fx-s">Guardar la respuesta como</label>
              <input id="fx-s" className="input" maxLength={30} value={node.saveAs} placeholder="respuesta" onChange={e => { const v = e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase(); onChange(n => ({ ...n, saveAs: v })); }} />
              <span className="fx-help">Luego puedes usarla en otros mensajes como {`{{${node.saveAs || "respuesta"}}}`}.</span>
            </div>
          )}
          {node.kind === "location" && <p className="fx-help">Revisamos en qué ciudad cae la ubicación. Si no coincide con la del pedido, sigue por la salida "Está en otra ciudad" (si la conectas). Si escribe una referencia en vez de enviarla, se la pedimos una vez más y luego la guardamos como nota.</p>}
          <TimeoutField node={node} onChange={onChange} />
        </>}

        {node.type === "ai" && <>
          <div className="field">
            <label htmlFor="fx-g">¿Qué tiene que lograr la IA?</label>
            <textarea id="fx-g" className="input" rows={6} maxLength={1500} value={node.goal} data-fx="goal" onChange={e => { const v = e.target.value; onChange(n => ({ ...n, goal: v })); }} />
          </div>
          <VarChips tokens={tokens} vars={vars} onPick={insert} />
          <p className="fx-help">La IA conversa con sus propias palabras usando la información de tu tienda (Info tienda). Sigue por "Logró el objetivo" cuando el cliente acepta, y por "No puede / no quiere" si rechaza. Si pide cancelar, cancela el pedido; si necesita una persona, te avisa.</p>
          <TimeoutField node={node} onChange={onChange} />
        </>}

        {node.type === "action" && <>
          <div className="field">
            <label htmlFor="fx-a">Qué hacer</label>
            <select id="fx-a" className="input" value={node.action} onChange={e => { const v = e.target.value; onChange(n => ({ ...n, action: v })); }}>
              {Object.entries(ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {["notify", "note", "handoff"].includes(node.action) && <>
            <div className="field">
              <label htmlFor="fx-at">{node.action === "note" ? "Nota para el repartidor" : "Mensaje para ti"}</label>
              <textarea id="fx-at" className="input" rows={3} maxLength={500} value={node.text} data-fx="text" onChange={e => { const v = e.target.value; onChange(n => ({ ...n, text: v })); }} />
            </div>
            <VarChips tokens={tokens} vars={vars} onPick={insert} />
          </>}
          {node.action === "confirm" && <p className="fx-help">El pedido queda Confirmado y entra en la reconfirmación de la mañana.</p>}
          {node.action === "handoff" && <p className="fx-help">El bot se pausa 12 horas en ese chat y te aparece en "Necesitan atención".</p>}
        </>}

        {node.type === "end" && <p className="fx-help">Aquí termina el flujo. Si el cliente vuelve a escribir, la IA responde sus dudas como siempre.</p>}
      </div>
      {node.type !== "start" && <div className="fx-side-f"><button type="button" className="btn danger sm block" onClick={onRemove}><Icon n="trash" size={15} />Eliminar cuadro</button></div>}
    </aside>
  );
}

// ─── Simulador: conversar con el flujo sin WhatsApp ──────────────────────────
function Simulator({ user, flow, onLive, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState([]);
  const endRef = useRef(null);
  const stateRef = useRef(null);
  const msgsRef = useRef([]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  const step = useCallback(async (event, shown) => {
    setBusy(true); setErr("");
    const hist = shown ? [...msgsRef.current, { from: "cliente", text: shown }] : msgsRef.current;
    if (shown) { msgsRef.current = hist; setMsgs(hist); }
    try {
      const r = await botFetch(user, "/bot/flows/simulate", { method: "POST", body: { flow, state: event.type === "start" ? null : stateRef.current, event, history: hist.map(m => ({ from: m.from, text: m.text })) } });
      const add = r.out.map(o => ({ from: "bot", text: o.text, buttons: o.buttons, location: o.location }));
      msgsRef.current = [...msgsRef.current, ...add];
      setMsgs(msgsRef.current);
      stateRef.current = r.state; setState(r.state);
      onLive(r.state?.nodeId || "");
      const LBL = { estado: e => ({ confirm: "Pedido → Confirmado", cancel: "Pedido → Cancelado", ready: "Pedido → Listo para despachar" }[e.value]), handoff: e => `Te avisa y ${e.soft ? "marca el chat para atención" : "pausa el bot"}: ${e.reason}`, notify: e => `Aviso para ti: ${e.text}`, note: e => `Nota de entrega: ${e.text}`, location: e => `Ubicación guardada (${e.geo?.city || "?"})`, end: () => "Fin del flujo" };
      const ns = r.effects.map(e => LBL[e.type]?.(e)).filter(Boolean);
      if (ns.length) setNotes(x => [...x, ...ns].slice(-8));
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }, [user, flow, onLive]);

  function restart() { msgsRef.current = []; stateRef.current = null; setMsgs([]); setState(null); setNotes([]); step({ type: "start" }); }
  function sendText(e) { e.preventDefault(); const t = text.trim(); if (!t || busy) return; setText(""); step({ type: "text", text: t }, t); }
  const lastBot = [...msgs].reverse().find(m => m.from === "bot");
  const waiting = state?.waiting;

  return (
    <aside className="fx-side fx-sim" aria-label="Probar el flujo">
      <div className="fx-side-h">
        <span className="fx-ni tone-violet"><Icon n="play" size={15} /></span><b>Probar flujo</b>
        <button type="button" className="fx-x" aria-label="Cerrar simulador" onClick={onClose}><Icon n="close" size={16} /></button>
      </div>
      <p className="fx-help fx-pad">Conversas como si fueras el cliente Danny Vite con un pedido de ejemplo. No se envía nada por WhatsApp. Usa los cambios sin guardar.</p>
      <div className="fx-phone">
        {msgs.length === 0 && !busy && (
          <div className="fx-sim-empty">
            <button type="button" className="btn" onClick={restart}><Icon n="play" size={15} />Empezar la prueba</button>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`fx-msg ${m.from === "bot" ? "in" : "out"}`}>
            <div className="fx-msg-t">{m.text}</div>
            {m.buttons?.length > 0 && (
              <div className="fx-msg-btns">
                {m.buttons.map(b => <button key={b.id} type="button" disabled={busy || m !== lastBot} onClick={() => step({ type: "button", id: b.id, title: b.title }, b.title)}>{b.title}</button>)}
              </div>
            )}
            {m.location && (
              <div className="fx-msg-btns">
                <button type="button" disabled={busy || m !== lastBot} onClick={() => step({ type: "location", match: "ciudad" }, "📍 Ubicación (Ambato, la misma ciudad)")}><Icon n="pin" size={13} />Enviar ubicación</button>
                <button type="button" disabled={busy || m !== lastBot} onClick={() => step({ type: "location", match: "no" }, "📍 Ubicación (Quito, otra ciudad)")}>Ubicación en otra ciudad</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="fx-msg in"><div className="fx-typing"><i /><i /><i /></div></div>}
        <div ref={endRef} />
      </div>
      {notes.length > 0 && <ul className="fx-effects" aria-label="Lo que pasaría en tu panel">{notes.map((t, i) => <li key={i}><Icon n="checkCircle" size={13} />{t}</li>)}</ul>}
      {err && <p className="fx-err" role="alert">{err}</p>}
      <form className="fx-sim-f" onSubmit={sendText}>
        <input className="input" placeholder={msgs.length ? "Escribe como cliente..." : "Primero empieza la prueba"} value={text} onChange={e => setText(e.target.value)} disabled={!msgs.length || busy} aria-label="Mensaje del cliente" />
        <button type="submit" className="btn sm" disabled={!text.trim() || busy || !msgs.length} aria-label="Enviar"><Icon n="send" size={15} /></button>
      </form>
      <div className="fx-sim-tools">
        {waiting?.deadline > 0 && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => step({ type: "timeout" })}><Icon n="clock" size={14} />Simular que no responde</button>}
        {msgs.length > 0 && <button type="button" className="btn ghost sm" disabled={busy} onClick={restart}><Icon n="back" size={14} />Reiniciar</button>}
        {msgs.length > 0 && !state && !busy && <span className="fx-help">El flujo terminó.</span>}
      </div>
    </aside>
  );
}

// ─── Enviar el flujo a clientes ──────────────────────────────────────────────
function SendPanel({ user, bot, flow, dirty, save, notify, onClose }) {
  const [contacts, setContacts] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tplErr, setTplErr] = useState("");
  const [sel, setSel] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [tpl, setTpl] = useState("");
  const [params, setParams] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    botFetch(user, "/bot/contacts").then(r => setContacts(r.contacts)).catch(e => notify(e.message, "error"));
    botFetch(user, "/bot/templates").then(r => setTemplates(r.templates.filter(t => !t.unsupported))).catch(e => setTplErr(e.message));
  }, [user, notify]);

  const t = templates.find(x => `${x.name}|${x.language}` === tpl);
  function pickTemplate(key) {
    setTpl(key);
    const x = templates.find(y => `${y.name}|${y.language}` === key);
    setParams(x ? Array.from({ length: x.params }, (_, i) => (i === 0 ? "{{nombre}}" : "")) : []);
  }

  const list = (contacts || []).filter(c => !q || `${c.name} ${c.phone} ${c.producto}`.toLowerCase().includes(q.toLowerCase()));
  const chosen = (contacts || []).filter(c => sel.has(c.phone));
  const inWin = chosen.filter(c => c.within24h).length;
  const outWin = chosen.length - inWin;
  const toggle = p => setSel(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  async function send() {
    if (!chosen.length) return;
    if (!bot?.enabled) return notify("Tu asistente todavía no está activo.", "error");
    if (outWin && !t && !window.confirm(`${outWin} cliente(s) no escribieron en las últimas 24 h y no recibirán nada sin una plantilla. ¿Enviar solo a los otros ${inWin}?`)) return;
    if (!window.confirm(`¿Enviar "${flow.name}" a ${chosen.length} cliente(s)?${outWin && t ? ` A ${outWin} les llega primero la plantilla "${t.name}" (Meta la cobra).` : ""}`)) return;
    setSending(true);
    try {
      if (dirty && !(await save())) { setSending(false); return; }
      const r = await botFetch(user, `/bot/flows/${flow.id}/send`, { method: "POST", body: { phones: chosen.map(c => c.phone), template: t ? { name: t.name, language: t.language, params, buttons: t.buttons.length } : null } });
      setResult(r); setSel(new Set());
      notify(`Enviado: ${r.started} empezaron el flujo, ${r.template} recibieron la plantilla${r.skipped ? `, ${r.skipped} omitidos` : ""}`);
    } catch (e) { notify(e.message, "error"); }
    setSending(false);
  }

  return (
    <aside className="fx-side fx-send" aria-label="Enviar el flujo a clientes">
      <div className="fx-side-h">
        <span className="fx-ni tone-blue"><Icon n="send" size={15} /></span><b>Enviar a clientes</b>
        <button type="button" className="fx-x" aria-label="Cerrar" onClick={onClose}><Icon n="close" size={16} /></button>
      </div>
      <div className="fx-side-b">
        <p className="fx-help">WhatsApp solo deja escribir libremente a quien te escribió en las <b>últimas 24 horas</b>: a ellos el flujo les llega de inmediato. A los demás primero les llega una <b>plantilla aprobada por Meta</b> (Meta la cobra) y el flujo sigue cuando respondan.</p>
        <div className="searchbox fx-search"><Icon n="search" size={16} /><input className="input" placeholder="Buscar cliente" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar cliente" /></div>
        <div className="fx-selbar">
          <button type="button" className="btn ghost sm" onClick={() => setSel(new Set(list.filter(c => c.within24h).map(c => c.phone)))}>Elegir los de 24 h</button>
          <button type="button" className="btn ghost sm" onClick={() => setSel(new Set(list.map(c => c.phone)))}>Todos</button>
          {sel.size > 0 && <button type="button" className="btn ghost sm" onClick={() => setSel(new Set())}>Ninguno</button>}
        </div>
        <div className="fx-contacts">
          {!contacts && <p className="fx-help">Cargando clientes...</p>}
          {contacts && list.length === 0 && <p className="fx-help">Todavía no hay clientes que te hayan escrito.</p>}
          {list.slice(0, 300).map(c => (
            <label key={c.phone} className={"fx-contact" + (sel.has(c.phone) ? " on" : "")}>
              <input type="checkbox" checked={sel.has(c.phone)} onChange={() => toggle(c.phone)} />
              <span className="min0"><b>{c.name || c.phone}</b><span className="fx-item-sub">{c.phone}{c.producto ? ` · ${c.producto}` : ""}</span></span>
              <span className={"fx-win" + (c.within24h ? " ok" : "")}>{c.within24h ? "24 h" : "plantilla"}</span>
            </label>
          ))}
        </div>
        {outWin > 0 && (
          <div className="fx-tplbox">
            <div className="field">
              <label htmlFor="fx-tpl">Plantilla para abrir la conversación ({outWin} cliente{outWin > 1 ? "s" : ""})</label>
              <select id="fx-tpl" className="input" value={tpl} onChange={e => pickTemplate(e.target.value)}>
                <option value="">Elige una plantilla aprobada</option>
                {templates.map(x => <option key={`${x.name}|${x.language}`} value={`${x.name}|${x.language}`}>{x.name} ({x.category === "MARKETING" ? "marketing" : x.category === "UTILITY" ? "utilidad" : x.category?.toLowerCase()})</option>)}
              </select>
              {tplErr && <span className="fx-err">{tplErr}</span>}
              {!tplErr && templates.length === 0 && <span className="fx-help">No tienes plantillas aprobadas. Créalas en el Administrador de WhatsApp de Meta.</span>}
            </div>
            {t && <div className="fx-tplprev">{t.body}</div>}
            {params.map((p, i) => (
              <div className="field" key={i}>
                <label htmlFor={`fx-p${i}`}>{`Variable {{${i + 1}}}`}</label>
                <input id={`fx-p${i}`} className="input" value={p} onChange={e => { const v = e.target.value; setParams(ps => ps.map((x, j) => (j === i ? v : x))); }} placeholder="{{nombre}}" />
              </div>
            ))}
          </div>
        )}
        {result && <p className="fx-ok" role="status">Último envío: {result.started} empezaron el flujo, {result.template} recibieron la plantilla{result.skipped ? `, ${result.skipped} omitidos (bot pausado o sin plantilla)` : ""}.</p>}
      </div>
      <div className="fx-side-f">
        <button type="button" className={"btn block" + (sending ? " loading" : "")} disabled={!chosen.length || sending} onClick={send}>
          <Icon n="send" size={15} />Enviar a {chosen.length || ""} cliente{chosen.length === 1 ? "" : "s"}
        </button>
        {chosen.length > 0 && <span className="fx-help">{inWin} de inmediato · {outWin} con plantilla</span>}
      </div>
    </aside>
  );
}
