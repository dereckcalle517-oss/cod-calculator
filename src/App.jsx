import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { C } from "./theme";
import { GlobalStyles } from "./components/GlobalStyles";
import { AppShell } from "./components/Shell";
import { Ic } from "./components/ui";
import { Splash } from "./components/Splash";
import { AuthProvider, useAuth } from "./lib/firebase";
import { ACCOUNT_EVT, legalFromPath, openPlans, trialLeft, trialUsed } from "./lib/nav";
import { TrackingProvider } from "./lib/tracking";
import { Dashboard } from "./views/Dashboard";
import { Landing } from "./views/Landing";

// Pantallas pesadas: se descargan solo cuando se abren
const AccountView = lazy(() => import("./views/Account").then(m => ({ default: m.AccountView })));
const CheckoutView = lazy(() => import("./views/Checkout").then(m => ({ default: m.CheckoutView })));
const Paywall = lazy(() => import("./views/Checkout").then(m => ({ default: m.Paywall })));
const FinanceCenter = lazy(() => import("./views/Finance").then(m => ({ default: m.FinanceCenter })));
const FreeCalculator = lazy(() => import("./views/FreeCalculator").then(m => ({ default: m.FreeCalculator })));
const LegalView = lazy(() => import("./views/Legal").then(m => ({ default: m.LegalView })));
const ProCalculator = lazy(() => import("./views/ProCalculator").then(m => ({ default: m.ProCalculator })));
const PlannerView = lazy(() => import("./views/Planner").then(m => ({ default: m.PlannerView })));
const Landing1 = lazy(() => import("./views/Landing1").then(m => ({ default: m.Landing1 })));
const SeguimientoView = lazy(() => import("./views/Seguimiento").then(m => ({ default: m.SeguimientoView })));


function AppInner() {
  const { user, isPro, loadingAuth, loginWithGoogle } = useAuth();
  const [view, setView] = useState(() => (legalFromPath() ? "legal" : "landing"));
  const [legalKind, setLegalKind] = useState(legalFromPath);
  const [routed, setRouted] = useState(false);
  // Al cambiar de pantalla, siempre empezar arriba (sin animación)
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [view, legalKind]);
  const actions = useRef({});
  const [trialDaysLeft, setTrialDaysLeft] = useState(trialLeft);
  const [payMsg, setPayMsg] = useState("");
  const justPaidUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pago") === "ok";
  const justPaid = justPaidUrl;

  const canPro = isPro || trialDaysLeft > 0;
  useEffect(() => {
    const h = (e) => { setLegalKind(e.detail); setView("legal"); };
    const pop = () => { const k = legalFromPath(); if (k) { setLegalKind(k); setView("legal"); } else setView(v => (v === "legal" ? "landing" : v)); };
    window.addEventListener("nx:legal", h); window.addEventListener("popstate", pop);
    return () => { window.removeEventListener("nx:legal", h); window.removeEventListener("popstate", pop); };
  }, []);
  useEffect(() => { const h = () => setView("account"); window.addEventListener(ACCOUNT_EVT, h); return () => window.removeEventListener(ACCOUNT_EVT, h); }, []);

  // Quien ya inició sesión entra directo al panel
  useEffect(() => {
    if (loadingAuth || routed) return;
    setRouted(true);
    if (user && view === "landing" && window.location.pathname === "/" && !justPaidUrl) setView("panel");
  }, [loadingAuth, user]);
  useEffect(() => {
    const h = (e) => {
      const v = e.detail, a = actions.current;
      if (v === "panel") setView(a.user ? "panel" : "landing");
      else if (v === "landing1") { setView("landing1"); window.scrollTo(0, 0); }
      else if (v === "track") setView(a.user ? "track" : "landing");
      else if (v === "calc") (a.canPro ? setView("pro") : setView("free"));
      else if (v === "finance" && a.openFinance) a.openFinance();
      else if (v === "planner" && a.openPlanner) a.openPlanner();
      else if (v === "upgrade" && a.upgrade) a.upgrade();
    };
    window.addEventListener("nx:nav", h); return () => window.removeEventListener("nx:nav", h);
  }, []);
  // Si el pago llega mientras se espera, entra a PRO solo
  useEffect(() => { if (isPro && view === "paywall") setView("pro"); }, [isPro, view]);
  // Al volver del pago, mostrar la pantalla de espera
  useEffect(() => { if (justPaidUrl && !isPro) { try { sessionStorage.setItem("nx_pay_pending", "1"); } catch {} setView("paywall"); } }, []);

  if (loadingAuth || !routed) return <Splash />;

  const startTrial = () => upgrade();
  const openPro = () => { if (canPro) setView("pro"); else { setPayMsg(""); setView("paywall"); } };
  const openFree = () => setView("free");
  const openFinance = () => { if (canPro) setView("finance"); else if (user) openPlans(); else { setPayMsg(""); setView("paywall"); } };
  const openPlanner = () => { if (canPro) setView("planner"); else if (user) openPlans(); else { setPayMsg(""); setView("paywall"); } };
  const goHome = () => { try { if (window.location.pathname !== "/") window.history.pushState({}, "", "/"); } catch {} setView("landing"); window.scrollTo(0, 0); };

  // Ir a pagar: pide sesión (para saber a qué cuenta activar PRO) y abre el pago dentro de la página
  const upgrade = async () => {
    setPayMsg("");
    let u = user;
    if (!u) {
      try { u = (await loginWithGoogle()).user; }
      catch { setPayMsg("Necesitas iniciar sesión con Google para activar PRO."); setView("paywall"); return; }
    }
    setView("checkout");
  };

  actions.current = { user, canPro, openFinance, openPlanner, upgrade };
  const proTrial = isPro ? 0 : trialDaysLeft;
  if ((view === "pro" || view === "finance" || view === "planner") && !canPro) return <Paywall onUpgrade={upgrade} onStartTrial={startTrial} onHome={goHome} trialAvailable={!trialUsed()} message={payMsg} justPaid={false} />;
  if (view === "landing1") return <Landing1 onOpenFree={openFree} onStartTrial={startTrial} onUpgrade={upgrade} onHome={goHome} />;
  if (view === "legal") return <LegalView kind={legalKind || "terms"} onHome={goHome} />;
  if (view === "checkout") return <CheckoutView onBack={goHome} onDone={() => setView("pro")} />;
  if (view === "paywall") return <Paywall onUpgrade={upgrade} onStartTrial={startTrial} onHome={goHome} trialAvailable={!trialUsed()} message={payMsg} justPaid={justPaid && !isPro} />;
  if (view === "account") return <AccountView trialDaysLeft={proTrial} onUpgrade={upgrade} onHome={goHome} onCalc={openPro} onFinance={openFinance} onBackToFree={openFree} />;
  if (view === "panel") return user
    ? <AppShell active="panel" onHome={goHome}><Dashboard trialDaysLeft={proTrial} onUpgrade={upgrade} /></AppShell>
    : <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} onUpgrade={upgrade} />;
  if (view === "track") return user
    ? <AppShell active="track" onHome={goHome}><SeguimientoView /></AppShell>
    : <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} onUpgrade={upgrade} />;
  if (view === "free") return user
    ? <AppShell active="calc" onHome={goHome}><FreeCalculator embedded onUpgrade={upgrade} onOpenPro={openPro} onStartTrial={startTrial} onHome={goHome} /></AppShell>
    : <FreeCalculator onUpgrade={upgrade} onOpenPro={openPro} onStartTrial={startTrial} onHome={goHome} />;
  if (view === "pro") return <ProCalculator trialDaysLeft={proTrial} onUpgrade={upgrade} onBackToFree={openFree} onHome={goHome} onFinance={() => setView("finance")} />;
  if (view === "planner") return <PlannerView onHome={goHome} />;
  if (view === "finance") return <FinanceCenter onBackToCalc={openPro} onHome={goHome} onBackToFree={openFree} />;
  return <Landing onOpenFree={openFree} onOpenPro={openPro} onStartTrial={startTrial} onUpgrade={upgrade} />;
}


function WelcomePro() {
  const { user, isPro, profile } = useAuth();
  const [show, setShow] = useState(false);
  const DURATION = 8000;
  useEffect(() => {
    if (!isPro) return;
    let pending = false;
    try { pending = sessionStorage.getItem("nx_pay_pending") === "1"; if (pending) sessionStorage.removeItem("nx_pay_pending"); } catch {}
    if (pending) setShow(true);
  }, [isPro]);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), DURATION);
    const k = (e) => { if (e.key === "Escape") setShow(false); };
    window.addEventListener("keydown", k);
    return () => { clearTimeout(t); window.removeEventListener("keydown", k); };
  }, [show]);
  if (!show) return null;
  const name = ((user && user.displayName) || "").split(" ")[0];
  const trial = profile && profile.lsStatus === "trialing";
  const perks = ["Desglose de CPA y sensibilidad a la entrega", "Salud de campaña, riesgo y benchmarks LATAM", "Escenarios, comparador A/B y asesor de IA", "Control financiero y reportes en PDF"];
  return (
    <div onClick={() => setShow(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "nxFade .2s ease" }}>
      <style>{`@keyframes nxFade{from{opacity:0}to{opacity:1}} @keyframes nxPop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}} @keyframes nxBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
      <div role="dialog" aria-live="polite" onClick={(e) => e.stopPropagation()} style={{ position: "relative", overflow: "hidden", width: "100%", maxWidth: 400, background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 18, padding: "26px 24px 22px", textAlign: "center", fontFamily: "'InterVariable','Inter',system-ui,sans-serif", color: C.text, animation: "nxPop .25s ease", boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${C.gold}18`, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Ic n="star" size={22} /></div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>{name ? `¡Gracias, ${name}!` : "¡Gracias por suscribirte!"}</div>
        <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.55, marginBottom: 16 }}>Bienvenido a PRO.{trial ? " Tu prueba gratis de 3 días ya empezó." : ""} Esto ya está desbloqueado:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 18 }}>
          {perks.map(t => (
            <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.text, lineHeight: 1.45 }}><span style={{ color: C.green, marginTop: 1, flexShrink: 0 }}><Ic n="✓" size={15} /></span>{t}</div>
          ))}
        </div>
        <button onClick={() => setShow(false)} style={{ width: "100%", background: C.gold, border: "none", borderRadius: 10, padding: "12px", color: C.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Empezar</button>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: `${C.gold}25` }}><div style={{ height: "100%", background: C.gold, transformOrigin: "left", animation: `nxBar ${DURATION}ms linear forwards` }} /></div>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <TrackingProvider>
        <GlobalStyles />
        <Suspense fallback={<Splash />}><AppInner /></Suspense>
        <WelcomePro />
      </TrackingProvider>
    </AuthProvider>
  );
}

