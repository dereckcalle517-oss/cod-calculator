import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { ReferralPanel } from "../components/Referral";
import { AppShell } from "../components/Shell";
import { Ic } from "../components/ui";
import { CURRENCIES } from "../lib/calc";
import { db, getSimulationsFS, useAuth } from "../lib/firebase";
import { ACCOUNT_EVT, PREFS_KEY, SUPPORT_EMAIL, SUPPORT_URL, openLegal, readPrefs } from "../lib/nav";


// ─── ROOT ─────────────────────────────────────────────────────────────────────
// ─── MI CUENTA ────────────────────────────────────────────────────────────────
export function fmtLongDate(d) {
  try { return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; }
}


// ─── PLANES ────────────────────────────────────────────────────────────────────
export function PlansView({ paid, onBack, onUpgrade, panel }) {
  const plans = [
    { name: "Gratis", price: "$0", per: "para siempre", current: !paid && false, features: ["Calculadora de rentabilidad completa", "CPA real y CPA máximo", "16 monedas de LATAM", "Hasta 5 cálculos guardados", "Compartir tu resultado"] },
    { name: "PRO", price: "$5.99", per: "al mes", pro: true, features: ["Todo lo del plan Gratis", "Desglose de CPA y sensibilidad a la entrega", "Salud de campaña y riesgo", "Benchmarks de LATAM y pérdida invisible", "Escenarios, escalado y comparador A/B", "Asesor de IA", "Control financiero", "Hasta 50 cálculos guardados", "3 días de prueba gratis"] },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", padding: 0, color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Suscripción</button>
        <span style={{ margin: "0 8px" }}>›</span><span style={{ color: C.text }}>Planes</span>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Planes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {plans.map(p => (
          <div key={p.name} style={{ ...panel, marginBottom: 0, padding: 24, borderColor: p.pro ? `${C.gold}55` : C.border, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: p.pro ? C.gold : C.text }}>{p.name}</div>
            <div style={{ marginBottom: 18 }}><span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>{p.price}</span> <span style={{ fontSize: 13, color: C.textMuted }}>{p.per}</span></div>
            {p.pro ? (
              <button onClick={onUpgrade} disabled={paid} style={{ background: paid ? C.cardHover : C.gold, color: paid ? C.textDim : C.bg, border: "none", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, cursor: paid ? "default" : "pointer", fontFamily: "inherit", marginBottom: 20 }}>{paid ? "Tu plan actual" : "Elegir plan"}</button>
            ) : (
              <button disabled style={{ background: C.cardHover, color: C.textDim, border: "none", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", marginBottom: 20 }}>{paid ? "Plan gratuito" : "Tu plan actual"}</button>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
              {p.features.map(f => <div key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: C.textDim, lineHeight: 1.5 }}><span style={{ color: C.green, flexShrink: 0 }}><Ic n="check" size={15} /></span>{f}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function AccountView({ trialDaysLeft, onUpgrade, onHome, onCalc, onFinance, onBackToFree }) {
  const { user, isPro, profile, portalUrl, loginWithGoogle, logout } = useAuth();
  const [tab, setTab] = useState(() => window.__nxAcctTab || "perfil");
  const [selOpen, setSelOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(() => { const v = !!window.__nxShowPlans; window.__nxShowPlans = false; return v; });
  useEffect(() => { const h = () => { if (window.__nxAcctTab) { setTab(window.__nxAcctTab); setShowPlans(!!window.__nxShowPlans); window.__nxShowPlans = false; } }; window.addEventListener(ACCOUNT_EVT, h); return () => window.removeEventListener(ACCOUNT_EVT, h); }, []);
  const [business, setBusiness] = useState("");
  const [bizMsg, setBizMsg] = useState("");
  const [prefs, setPrefs] = useState(() => ({ currency: "USD", envio: 5, pctConfirmados: 75, pctEntregados: 65, recupera: true, ...readPrefs() }));
  const [prefMsg, setPrefMsg] = useState("");
  const [usage, setUsage] = useState({ calcs: null, expenses: null });
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const limit = isPro ? 50 : 5;

  useEffect(() => { if (profile && profile.businessName != null) setBusiness(profile.businessName); }, [profile && profile.businessName]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      let calcs = null, expenses = null;
      try { calcs = (await getSimulationsFS(user.uid)).length; } catch {}
      try { const f = await getDoc(doc(db, "users", user.uid, "finance", "data")); expenses = f.exists() ? (f.data().expenses || []).length : 0; } catch {}
      setUsage({ calcs, expenses });
    })();
  }, [user && user.uid]);

  const st = (profile && profile.lsStatus) || "";
  const toDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
  const until = toDate(profile && profile.proUntil);
  const nextBill = toDate(profile && profile.nextBillAt) || until;
  const cancelAt = toDate(profile && profile.cancelAt);
  const willCancel = isPro && (st === "canceled" || !!cancelAt);
  const endDate = cancelAt || until;
  let plan = { name: "Plan gratuito", chip: "Gratis", tone: C.textDim, note: "Estás usando la versión gratis de Cuadre." };
  if (isPro) {
    plan = st === "bonus" ? { name: "Plan PRO", chip: "Bonus de referidos", tone: C.gold, note: until ? `Tienes PRO gratis hasta el ${fmtLongDate(until)}.` : "Tienes PRO gratis por tus referidos." }
      : willCancel ? { name: "Plan PRO", chip: "Cancelada", tone: C.amber, note: endDate ? `Conservas PRO hasta el ${fmtLongDate(endDate)}. Después no se te cobrará más.` : "Tu suscripción está cancelada." }
      : st === "past_due" ? { name: "Plan PRO", chip: "Pago pendiente", tone: C.red, note: "No pudimos cobrar tu último pago. Actualiza tu método de pago para no perder PRO." }
      : st === "trialing" ? { name: "Plan PRO", chip: "En prueba", tone: C.green, note: nextBill ? `Tu primer cobro de $5.99 será el ${fmtLongDate(nextBill)}.` : "Estás en tu prueba gratis." }
      : { name: "Plan PRO", chip: "Activa", tone: C.green, note: nextBill ? `Próximo cobro de $5.99 el ${fmtLongDate(nextBill)}.` : "Tu suscripción está activa." };
  }

  const saveBusiness = async () => {
    try { await setDoc(doc(db, "users", user.uid), { businessName: business.trim() }, { merge: true }); setBizMsg("Guardado"); }
    catch { setBizMsg("No se pudo guardar"); }
    setTimeout(() => setBizMsg(""), 2500);
  };
  const clampN = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
  const savePrefs = async () => {
    const p = { currency: prefs.currency, envio: Math.max(0, Number(prefs.envio) || 0), pctConfirmados: clampN(prefs.pctConfirmados, 0, 100), pctEntregados: clampN(prefs.pctEntregados, 0, 100), recupera: !!prefs.recupera };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
    if (user) { try { await setDoc(doc(db, "users", user.uid), { prefs: p }, { merge: true }); } catch (e) { console.error(e); } }
    setPrefs(p); setPrefMsg("Preferencias guardadas. Se aplican la próxima vez que abras la calculadora.");
    setTimeout(() => setPrefMsg(""), 4000);
  };
  const exportData = async () => {
    setBusy("export"); setErr("");
    try {
      const sims = await getSimulationsFS(user.uid).catch(() => []);
      const fin = await getDoc(doc(db, "users", user.uid, "finance", "data")).then(x => x.exists() ? x.data() : null).catch(() => null);
      const clean = (o) => JSON.parse(JSON.stringify(o || {}, (k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
      const out = { exportado: new Date().toISOString(), cuenta: { correo: user.email, nombre: user.displayName, negocio: profile && profile.businessName || "", preferencias: readPrefs() }, calculos_guardados: clean(sims), control_financiero: clean(fin) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "cuadre-mis-datos.json"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); setErr("No se pudieron exportar tus datos. Intenta de nuevo."); }
    setBusy("");
  };
  const deleteAccount = async () => {
    setBusy("delete"); setErr("");
    try {
      const token = await user.getIdToken();
      const r = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 409) { setErr("Primero cancela tu suscripción PRO. Después podrás eliminar la cuenta."); setBusy(""); return; }
      if (!r.ok) throw new Error("fail");
      ["cod_prefs", "cod_saved_calcs", "cod_finance", "cod_trial_start"].forEach(k => { try { localStorage.removeItem(k); } catch {} });
      try { await logout(); } catch {}
      window.location.href = "/";
    } catch (e) { console.error(e); setErr("No se pudo eliminar la cuenta. Intenta de nuevo o escríbenos."); setBusy(""); }
  };

  const panel = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 16 };
  const inp = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, color: C.textDim, fontWeight: 600, marginBottom: 6, display: "block" };
  const btnMain = { background: C.text, border: "none", borderRadius: 10, padding: "10px 18px", color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: "10px 18px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-block" };
  const tabs = [{ id: "perfil", l: "Perfil", i: "user" }, { id: "suscripcion", l: "Suscripción", i: "card" }, { id: "referidos", l: "Referidos", i: "gift" }, { id: "preferencias", l: "Preferencias", i: "sliders" }, { id: "datos", l: "Datos y privacidad", i: "lock" }];
  const created = (profile && profile.createdAt && profile.createdAt.toDate && profile.createdAt.toDate()) || (user && user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : null);
  const canDelete = !(isPro && !willCancel && st !== "bonus");

  return (
    <AppShell active="acct" onHome={onHome}>
      <GlobalStyles />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px 60px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Ajustes</h1>
        {!user ? (
          <div style={{ ...panel, textAlign: "center", padding: 36 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Inicia sesión para ver tu cuenta</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>Aquí verás tu perfil, tu suscripción y tus preferencias.</div>
            <button onClick={() => loginWithGoogle().catch(() => {})} style={btnMain}>Iniciar sesión con Google</button>
          </div>
        ) : (<>
          <div className="acct-select" style={{ position: "relative", marginBottom: 22 }}>
            <button onClick={() => setSelOpen(o => !o)} aria-haspopup="listbox" aria-expanded={selOpen} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 12, padding: "13px 14px", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Ic n={(tabs.find(t => t.id === tab) || tabs[0]).i} size={16} /> <span style={{ flex: 1 }}>{(tabs.find(t => t.id === tab) || tabs[0]).l}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: C.textMuted, transform: selOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {selOpen && (<>
              <div onClick={() => setSelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div role="listbox" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 41, background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 12, padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                {tabs.map(t => (
                  <button key={t.id} role="option" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setShowPlans(false); setSelOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: tab === t.id ? C.cardHover : "transparent", border: "none", borderRadius: 8, padding: "11px 10px", color: tab === t.id ? C.text : C.textDim, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><Ic n={t.i} size={16} /> {t.l}</button>
                ))}
              </div>
            </>)}
          </div>
          <div className="acct-tabs" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 22, overflowX: "auto", overflowY: "hidden", overscrollBehaviorY: "none", touchAction: "pan-x" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setShowPlans(false); }} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? C.text : "transparent"}`, padding: "10px 14px", color: tab === t.id ? C.text : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", marginBottom: -1 }}><Ic n={t.i} size={15} /> {t.l}</button>
            ))}
          </div>

          {tab === "perfil" && (<>
            <div style={panel}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
                {user.photoURL ? <img src={user.photoURL} alt="" width={64} height={64} style={{ borderRadius: "50%", display: "block" }} /> : <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cardHover }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{user.displayName}</div>
                  <div style={{ fontSize: 13, color: C.textDim, overflowWrap: "anywhere" }}>{user.email}</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: isPro ? C.bg : C.textDim, background: isPro ? C.gold : "transparent", border: isPro ? "none" : `1px solid ${C.borderBright}`, borderRadius: 99, padding: "4px 12px" }}>{isPro ? "PRO" : "Gratis"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
                <div><span style={lbl}>Correo</span><div style={{ ...inp, color: C.textDim, overflowWrap: "anywhere" }}>{user.email}</div></div>
                <div><span style={lbl}>Miembro desde</span><div style={{ ...inp, color: C.textDim }}>{created ? fmtLongDate(created) : "—"}</div></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={lbl} htmlFor="biz">Nombre de tu negocio o tienda (opcional)</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input id="biz" value={business} onChange={e => setBusiness(e.target.value)} placeholder="Ej: Decán Parfums" style={{ ...inp, flex: "1 1 220px", width: "auto" }} />
                  <button onClick={saveBusiness} style={btnMain}>Guardar</button>
                </div>
                {bizMsg && <div style={{ fontSize: 12, color: bizMsg === "Guardado" ? C.green : C.red, marginTop: 8 }}>{bizMsg}</div>}
              </div>
            </div>
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Tu uso</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Cálculos guardados</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{usage.calcs == null ? "—" : usage.calcs} <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>de {limit}</span></div>
                </div>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Gastos registrados</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{usage.expenses == null ? "—" : usage.expenses}</div>
                </div>
              </div>
            </div>
            <button onClick={() => logout().then(onHome)} style={{ ...btnGhost, color: C.red }}><Ic n="logout" /> Cerrar sesión</button>
          </>)}

          {tab === "suscripcion" && showPlans && <PlansView paid={isPro && st !== "bonus"} onBack={() => setShowPlans(false)} onUpgrade={onUpgrade} panel={panel} />}

          {tab === "suscripcion" && !showPlans && !isPro && (
            <div style={{ ...panel, textAlign: "center", padding: "44px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.cardHover, color: C.textDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Ic n="calendar" size={20} /></div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Aún no tienes una suscripción activa</div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 22px" }}>Activa PRO para desbloquear el desglose de CPA, benchmarks, escenarios y control financiero.</div>
              <button onClick={() => setShowPlans(true)} style={btnMain}>Ver planes</button>
            </div>
          )}

          {tab === "suscripcion" && !showPlans && isPro && (<>
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: plan.tone, background: `${plan.tone}1A`, border: `1px solid ${plan.tone}40`, borderRadius: 99, padding: "4px 12px" }}>{plan.chip}</span>
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 20 }}>{plan.note}</div>
              {isPro && st !== "bonus" ? (<>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 22 }}>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>Precio</div><div style={{ fontWeight: 700 }}>$5.99 al mes</div></div>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 12, color: C.textMuted, marginBottom: 3 }}>{willCancel ? "Acceso hasta" : "Próximo cobro"}</div><div style={{ fontWeight: 700 }}>{(willCancel ? endDate : nextBill) ? fmtLongDate(willCancel ? endDate : nextBill) : "—"}</div></div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {profile && profile.updatePaymentUrl && <a href={profile.updatePaymentUrl} target="_blank" rel="noreferrer" style={btnGhost}>Actualizar método de pago</a>}
                  {!willCancel && portalUrl && <a href={portalUrl} target="_blank" rel="noreferrer" style={{ ...btnGhost, color: C.red }}>Cancelar suscripción</a>}
                  {willCancel && <button onClick={onUpgrade} style={{ ...btnMain, background: C.gold }}>Reactivar PRO</button>}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 18, lineHeight: 1.6 }}>Los pagos los procesa Paddle, nuestro vendedor oficial. En tu estado de cuenta verás el cobro a nombre de Paddle.</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>Tienes 3 días de garantía desde tu primer pago. <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Solicitud de reembolso - Cuadre")}&body=${encodeURIComponent(`Hola, quiero solicitar el reembolso de mi primer pago.\n\nCorreo de mi cuenta: ${user.email}`)}`} style={{ color: C.text, fontWeight: 600 }}>Solicitar reembolso</a> · <a href="/reembolsos" onClick={e => { e.preventDefault(); openLegal("refund"); }} style={{ color: C.textDim }}>Ver política</a></div>
              </>) : (<>
                <button onClick={() => setShowPlans(true)} style={btnMain}>Ver planes</button>
              </>)}
            </div>
          </>)}

          {tab === "referidos" && <ReferralPanel panel={panel} btnMain={btnMain} btnGhost={btnGhost} inp={inp} />}

          {tab === "preferencias" && (
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Valores por defecto de la calculadora</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20, lineHeight: 1.6 }}>Guarda lo que usas siempre para no escribirlo cada vez.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
                <div><label style={lbl} htmlFor="pcur">Moneda</label>
                  <select id="pcur" value={prefs.currency} onChange={e => setPrefs({ ...prefs, currency: e.target.value })} style={inp}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select></div>
                <div><label style={lbl} htmlFor="penv">Costo de envío habitual</label>
                  <input id="penv" type="number" min="0" step="0.01" value={prefs.envio} onChange={e => setPrefs({ ...prefs, envio: e.target.value })} style={inp} /></div>
                <div><label style={lbl} htmlFor="pcon">Confirmados habituales (%)</label>
                  <input id="pcon" type="number" min="0" max="100" value={prefs.pctConfirmados} onChange={e => setPrefs({ ...prefs, pctConfirmados: e.target.value })} style={inp} /></div>
                <div><label style={lbl} htmlFor="pent">Entregados habituales (%)</label>
                  <input id="pent" type="number" min="0" max="100" value={prefs.pctEntregados} onChange={e => setPrefs({ ...prefs, pctEntregados: e.target.value })} style={inp} /></div>
              </div>
              <div style={{ marginTop: 18 }}>
                <span style={lbl}>¿Recuperas el producto en las devoluciones?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[[true, "Sí recupero"], [false, "No recupero"]].map(([v, l]) => (
                    <button key={l} onClick={() => setPrefs({ ...prefs, recupera: v })} style={{ ...btnGhost, padding: "9px 16px", background: prefs.recupera === v ? C.cardHover : "transparent", borderColor: prefs.recupera === v ? C.accent : C.borderBright }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button onClick={savePrefs} style={btnMain}>Guardar preferencias</button>
                {prefMsg && <span style={{ fontSize: 12, color: C.green }}>{prefMsg}</span>}
              </div>
            </div>
          )}

          {tab === "datos" && (<>
            <div style={panel}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Exportar mis datos</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Descarga un archivo con tu perfil, tus cálculos guardados y tu control financiero.</div>
              <button onClick={exportData} disabled={busy === "export"} style={{ ...btnGhost, opacity: busy === "export" ? 0.6 : 1 }}><Ic n="download" /> {busy === "export" ? "Preparando..." : "Descargar mis datos"}</button>
            </div>
            <div style={{ ...panel, borderColor: `${C.red}40` }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: C.red }}>Eliminar mi cuenta</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16, lineHeight: 1.6 }}>Se borran tu perfil, tus cálculos guardados y tu control financiero. Esta acción no se puede deshacer.</div>
              {!canDelete ? (
                <div style={{ fontSize: 13, color: C.amber, lineHeight: 1.6 }}>Tienes una suscripción PRO activa. Cancélala primero en la pestaña Suscripción y después podrás eliminar tu cuenta.</div>
              ) : (<>
                <label style={lbl} htmlFor="delc">Escribe ELIMINAR para confirmar</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input id="delc" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ ...inp, flex: "1 1 200px", width: "auto" }} />
                  <button onClick={deleteAccount} disabled={confirm !== "ELIMINAR" || busy === "delete"} style={{ ...btnMain, background: C.red, color: "#fff", opacity: confirm === "ELIMINAR" && busy !== "delete" ? 1 : 0.4, cursor: confirm === "ELIMINAR" ? "pointer" : "not-allowed" }}>{busy === "delete" ? "Eliminando..." : "Eliminar cuenta"}</button>
                </div>
              </>)}
              {err && <div style={{ fontSize: 12, color: C.red, marginTop: 12 }}>{err}</div>}
            </div>
          </>)}

          <div style={{ marginTop: 8, fontSize: 13, color: C.textDim }}>¿Necesitas ayuda? <a href={SUPPORT_URL || `mailto:${SUPPORT_EMAIL}`} target="_blank" rel="noreferrer" style={{ color: C.text, fontWeight: 600 }}>Escríbenos</a></div>
        </>)}
      </div>
    </AppShell>
  );
}
