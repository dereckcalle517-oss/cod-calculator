import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../theme";
import { Brand, Ic } from "./ui";
import { useAuth } from "../lib/firebase";
import { SUPPORT_EMAIL, navTo, openAccount, openLegal, openPlans, trialLeft } from "../lib/nav";


// ─── USER MENU ────────────────────────────────────────────────────────────────
export function UserMenu({ side, onNavigate }) {
  const { user, isPro, portalUrl, loginWithGoogle, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try { await loginWithGoogle(); } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (!user) return (
    <button onClick={handleLogin} disabled={loading}
      style={{ background: C.text, border: "none", borderRadius: 9, padding: "7px 16px", color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
      {loading ? "..." : <><span className="d-only"><Ic n="🔑" /> Iniciar sesión</span><span className="m-only">Entrar</span></>}
    </button>
  );

  const nav = (fn) => () => { setOpen(false); if (onNavigate) onNavigate(); fn(); };
  const initial = ((user.displayName || user.email || "?").trim()[0] || "?").toUpperCase();
  const avatar = (sz) => user.photoURL
    ? <img src={user.photoURL} alt="" width={sz} height={sz} referrerPolicy="no-referrer" style={{ borderRadius: sz > 30 ? 8 : "50%", display: "block", flexShrink: 0 }} />
    : <span style={{ width: sz, height: sz, borderRadius: sz > 30 ? 8 : "50%", background: "#4C31A0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: sz * 0.45, flexShrink: 0 }}>{initial}</span>;

  return (
    <div style={{ position: "relative", width: side ? "100%" : undefined }}>
      {side ? (
        <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
          style={{ width: "100%", background: open ? C.cardHover : "transparent", border: "none", borderRadius: 10, padding: "8px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", textAlign: "left" }}>
          {avatar(34)}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.text }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "Mi cuenta"}</span>
              {isPro && <span style={{ background: `${C.gold}20`, color: C.gold, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>PRO</span>}
            </span>
            <span style={{ display: "block", fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: C.textMuted, flexShrink: 0 }}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
        </button>
      ) : (
      <button onClick={() => setOpen(!open)}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 99, padding: "4px 12px 4px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
        <img src={user.photoURL} alt="" width={26} height={26} style={{ borderRadius: "50%", display: "block" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName?.split(" ")[0]}</span>
        {isPro && <span style={{ background: `${C.gold}20`, color: C.gold, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "1px 6px" }}>PRO</span>}
        <span style={{ color: C.textMuted, fontSize: 10 }}>▼</span>
      </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", ...(side ? { left: 0, right: 0, bottom: "calc(100% + 6px)" } : { right: 0, top: "calc(100% + 6px)" }), background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px", minWidth: 180, zIndex: 400, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "8px 10px 10px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{user.displayName}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{user.email}</div>
              <div style={{ marginTop: 4, fontSize: 10, color: isPro ? C.gold : C.textMuted, fontWeight: 600 }}>{isPro ? "Plan PRO" : "Plan Gratuito"}</div>
            </div>
            <button onClick={nav(() => navTo("panel"))}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              <Ic n="home" /> Ir al panel
            </button>
            <button onClick={nav(() => openAccount())}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Ic n="settings" /> Ajustes
            </button>
            <button onClick={() => { logout(); setOpen(false); }}
              style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 10px", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Ic n="🚪" /> Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── MARCO DE LA APP PRO (menú lateral + barra superior) ──────────────────────
export const HELP_QA = [
  { q: "¿Qué es el CPA real?", k: "cpa real que es costo adquisicion ads manager", a: "Es lo que de verdad te cuesta conseguir un pedido entregado: el gasto en publicidad dividido entre los pedidos que sí se entregan, no entre los que Ads Manager cuenta como compra." },
  { q: "¿Qué diferencia hay entre CPA real y CPA máximo?", k: "cpa maximo real diferencia limite tope", a: "El CPA real es lo que pagas hoy por pedido entregado. El CPA máximo es lo más que puedes pagar sin perder dinero. Si el real supera al máximo, esa campaña te está haciendo perder." },
  { q: "¿Cómo funciona la prueba gratis de PRO?", k: "prueba gratis trial 3 dias tarjeta cobro", a: "Tienes 3 días para probar PRO. Pones tu tarjeta al empezar y el primer cobro de $5.99 llega al terminar la prueba. Puedes cancelar antes y no se cobra." },
  { q: "¿Cómo cancelo mi suscripción?", k: "cancelar cancelo suscripcion baja plan pro", a: "Ve a Ajustes → Suscripción y toca Administrar suscripción. Conservas PRO hasta que termine el periodo ya pagado." },
  { q: "¿Cómo pido un reembolso?", k: "reembolso devolver devolucion dinero garantia", a: "Tienes 3 días de garantía desde tu primer pago. Pídelo desde Ajustes → Suscripción o escribiendo a soporte desde el correo de tu cuenta." },
  { q: "Pagué pero sigo en plan Gratis", k: "pague pago sigue gratis no activa activo pro plan", a: "La activación tarda unos segundos. Recarga la página o cierra sesión y vuelve a entrar. Si después de unos minutos sigue igual, escríbenos con el correo de tu cuenta y lo resolvemos." },
  { q: "¿Cómo funcionan los referidos?", k: "referidos referido amigo invitar dias pro gratis enlace", a: "Compartes tu enlace desde Ajustes → Referidos. Por cada amigo que se suscriba y pague, ganas 15 días de PRO, que se acreditan 3 días después de su primer pago. El tope acumulado es de 30 días." },
  { q: "¿Qué incluye el plan PRO?", k: "pro incluye beneficios plan que ofrece precio", a: "Desglose de CPA y sensibilidad a la entrega, salud de campaña, benchmarks, escenarios, comparador A/B, asesor de IA, planificador de ads y control financiero. Cuesta $5.99 al mes." },
  { q: "¿Qué incluye el plan Gratis?", k: "gratis free incluye limite guardados monedas", a: "La calculadora de rentabilidad completa, CPA real y CPA máximo, 16 monedas de LATAM, hasta 5 cálculos guardados y compartir tu resultado." },
  { q: "¿Cómo elimino mi cuenta y mis datos?", k: "eliminar borrar cuenta datos privacidad", a: "Ve a Ajustes → Datos y privacidad. Ahí puedes descargar o eliminar tus datos. Si tienes una suscripción activa, cancélala antes." },
];


export const helpNorm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");


export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [openQ, setOpenQ] = useState(null);
  const [searched, setSearched] = useState("");
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const words = helpNorm(searched).split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const results = words.length
    ? HELP_QA.map(x => ({ x, n: words.filter(w => helpNorm(x.q + " " + x.k).includes(w)).length })).filter(r => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 3).map(r => r.x)
    : HELP_QA;
  const send = (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setSearched(t); setOpenQ(null); };
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Consulta desde el panel")}&body=${encodeURIComponent(searched ? searched + "\n\n" : "")}`;
  return (
    <>
      <style>{`@keyframes nxHelpIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} .help-panel{animation:nxHelpIn .18s ease} @media (max-width:520px){.help-panel{right:12px!important;left:12px!important;width:auto!important;bottom:80px!important;max-height:calc(100vh - 110px)!important}}`}</style>
      {open && (
        <div className="help-panel" role="dialog" aria-label="Ayuda" style={{ position: "fixed", right: 20, bottom: 84, width: 360, maxHeight: "min(560px, calc(100vh - 120px))", display: "flex", flexDirection: "column", zIndex: 260, background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.55)", overflow: "hidden", fontFamily: "'InterVariable','Inter',system-ui,sans-serif" }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>¿En qué te ayudamos?</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Escribe tu duda o elige una pregunta.</div>
          </div>
          <div style={{ padding: 12, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {searched && results.length === 0 && (
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.55, padding: "6px 4px" }}>No encontré una respuesta para eso. Escríbenos y te respondemos por correo.</div>
            )}
            {results.map(x => (
              <div key={x.q} style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: openQ === x.q ? C.cardHover : "transparent" }}>
                <button onClick={() => setOpenQ(openQ === x.q ? null : x.q)} aria-expanded={openQ === x.q} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "11px 12px", color: C.text, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{x.q}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: C.textMuted, transform: openQ === x.q ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openQ === x.q && <div style={{ padding: "0 12px 12px", fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{x.a}</div>}
              </div>
            ))}
            {searched && <button onClick={() => { setSearched(""); setText(""); setOpenQ(null); }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px" }}>Ver todas las preguntas</button>}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
            <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribe tu pregunta" aria-label="Escribe tu pregunta" style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              <button type="submit" style={{ background: C.text, border: "none", borderRadius: 10, padding: "0 14px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Buscar</button>
            </form>
            <a href={mail} style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12, color: C.textMuted, textDecoration: "none" }}>¿Sigues con dudas? Escríbenos</a>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label={open ? "Cerrar ayuda" : "Abrir ayuda"} aria-expanded={open} style={{ position: "fixed", right: 20, bottom: 20, zIndex: 260, width: 52, height: 52, borderRadius: "50%", border: "none", background: C.gold, color: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M9.6 9.6a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.4M12 16.2h.01" /></svg>}
      </button>
    </>
  );
}


export function AppShell({ active, onHome, right, children }) {
  const { user, isPro } = useAuth();
  const canPro = isPro || trialLeft() > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const k = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [menuOpen]);
  const go = (fn) => () => { setMenuOpen(false); fn(); };
  const items = [
    ...(user ? [{ id: "panel", label: "Panel", icon: "home", fn: () => navTo("panel") }] : []),
    { id: "calc", label: "Calculadora", icon: "calculator", fn: () => navTo("calc") },
    ...(user ? [{ id: "track", label: "Seguimiento", icon: "trendUp", fn: () => navTo("track") }] : []),
    { id: "plan", label: "Planificador de ads", icon: "megaphone", fn: () => navTo("planner"), lock: !canPro },
    { id: "fin", label: "Control financiero", icon: "wallet", fn: () => navTo("finance"), lock: !canPro },
    { id: "acct", label: "Ajustes", icon: "settings", fn: () => openAccount("perfil") },
  ];
  const titles = { track: "Seguimiento", panel: "Panel", calc: "Calculadora", plan: "Planificador de ads", fin: "Control financiero", ref: "Referidos", acct: "Ajustes" };
  const brandGo = user ? () => navTo("panel") : onHome;
  const legalLink = { background: "none", border: "none", padding: 0, color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" };
  return (
    <div className="shell" style={{ fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text }}>
      {user && <HelpWidget />}
      <div className={"shell-scrim" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen(false)} />
      <aside className={"shell-drawer" + (menuOpen ? " open" : "")} aria-hidden={!menuOpen}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand onClick={go(brandGo)} size={30} pro={isPro} />
          <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} style={{ background: "transparent", border: "none", color: C.textDim, width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(i => (
            <button key={i.id} className={"nav-item" + (active === i.id ? " on" : "")} onClick={go(i.fn)}><Ic n={i.icon} size={17} /> {i.label}{i.lock && <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: C.gold }}><Ic n="lock" size={12} /> PRO</span>}</button>
          ))}
          {!isPro && <button className="nav-item" onClick={go(openPlans)} style={{ color: C.gold }}><Ic n="star" size={17} /> Ver planes</button>}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
          <button className="nav-item" onClick={go(onHome)} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Ver sitio</button>
          <button className="nav-item" onClick={go(() => navTo("landing1"))} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 1</button>
          <button className="nav-item" onClick={go(() => navTo("bot"))} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Cuadre Bot · Próximamente</button>
          <button className="nav-item" onClick={go(() => navTo("landing2"))} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 2</button>
          <button className="nav-item" onClick={go(() => navTo("landing3"))} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 3</button>
          <button className="nav-item" onClick={go(() => navTo("landing4"))} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 4</button>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={legalLink} onClick={go(() => openLegal("terms"))}>Términos</button>
            <button style={legalLink} onClick={go(() => openLegal("privacy"))}>Privacidad</button>
            <button style={legalLink} onClick={go(() => openLegal("refund"))}>Reembolsos</button>
          </div>
        </div>
        {user && <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}><UserMenu side onNavigate={() => setMenuOpen(false)} /></div>}
      </aside>
      <aside className="shell-side">
        <Brand onClick={brandGo} size={30} pro={isPro} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(i => (
            <button key={i.id} className={"nav-item" + (active === i.id ? " on" : "")} onClick={i.fn}><Ic n={i.icon} size={17} /> {i.label}{i.lock && <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: C.gold }}><Ic n="lock" size={12} /> PRO</span>}</button>
          ))}
          {!isPro && <button className="nav-item" onClick={openPlans} style={{ color: C.gold }}><Ic n="star" size={17} /> Ver planes</button>}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
          <button className="nav-item" onClick={onHome} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Ver sitio</button>
          <button className="nav-item" onClick={() => navTo("landing1")} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 1</button>
          <button className="nav-item" onClick={() => navTo("bot")} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Cuadre Bot · Próximamente</button>
          <button className="nav-item" onClick={() => navTo("landing2")} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 2</button>
          <button className="nav-item" onClick={() => navTo("landing3")} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 3</button>
          <button className="nav-item" onClick={() => navTo("landing4")} style={{ margin: "0 -12px" }}><Ic n="globe" size={17} /> Landing 4</button>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={legalLink} onClick={() => openLegal("terms")}>Términos</button>
            <button style={legalLink} onClick={() => openLegal("privacy")}>Privacidad</button>
            <button style={legalLink} onClick={() => openLegal("refund")}>Reembolsos</button>
          </div>
        </div>
        {user && <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}><UserMenu side /></div>}
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="shell-top">
          <div className="shell-top-l">
            <button className="shell-burger" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Brand onClick={brandGo} size={26} pro={isPro} />
          </div>
          <div className="hide-mobile" style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>{titles[active] || "Calculadora"}</div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>{right}{!user && <UserMenu />}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
