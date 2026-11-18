import { useState, useEffect } from "react";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { Ic } from "../components/ui";
import { PADDLE_PRICE_ID, loadPaddle, useAuth } from "../lib/firebase";
import { openLegal } from "../lib/nav";
import { track } from "../lib/pixel";


export function Paywall({ onUpgrade, onStartTrial, onHome, trialAvailable, message, justPaid }) {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalStyles />
      <div style={{ maxWidth: 440, width: "100%", background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{justPaid ? "Activando tu plan PRO" : "PRO es para suscriptores"}</div>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 18 }}>
          {justPaid
            ? "Recibimos tu pago. Tu cuenta se activa en unos segundos; esta pantalla cambia sola."
            : "Salud y riesgo, benchmarks, pérdida invisible, escenarios, comparador A/B, asesor IA, PDF y Control financiero."}
        </div>
        {!justPaid && <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 4 }}>$5.99<span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}> / mes</span></div>}
        {!justPaid && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 18 }}>Cancelas cuando quieras. {user ? `Cuenta: ${user.email}` : "Te pediremos iniciar sesión con Google."}</div>}
        {message && <div style={{ fontSize: 12, color: C.amber, marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}
        {!justPaid && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={onUpgrade} style={{ background: C.gold, border: "none", borderRadius: 10, padding: "13px", color: C.bg, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Activar PRO — $5.99/mes</button>
            {trialAvailable && <button onClick={onStartTrial} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Probar 3 días gratis</button>}
          </div>
        )}
        <button onClick={onHome} style={{ marginTop: 14, background: "transparent", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Volver al inicio</button>
      </div>
    </div>
  );
}


export function CheckoutView({ onBack, onDone }) {
  const { user, isPro } = useAuth();
  const [state, setState] = useState("loading");
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    let alive = true;
    track("InitiateCheckout", { value: 5.99, currency: "USD" }, "ic");
    loadPaddle((e) => { if (e && e.name === "checkout.completed" && alive) { try { sessionStorage.setItem("nx_pay_pending", "1"); } catch {} track("Subscribe", { value: 5.99, currency: "USD" }, "sub"); track("CompletePayment", { value: 5.99, currency: "USD" }, "pay"); setPaid(true); } }).then((P) => {
      if (!alive) return;
      if (!P || !PADDLE_PRICE_ID) { setState("error"); return; }
      try {
        P.Checkout.open({
          settings: { displayMode: "inline", frameTarget: "paddle-checkout", frameInitialHeight: 450, frameStyle: "width:100%; min-width:280px; background-color:transparent; border:none;", theme: "dark", locale: "es", variant: "one-page", showAddDiscounts: false, showAddTaxId: false },
          items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
          customer: user && user.email ? { email: user.email } : undefined,
          customData: { user_id: user ? user.uid : "" },
        });
        setState("ready");
      } catch { setState("error"); }
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (isPro) onDone(); }, [isPro]);

  const feats = ["Salud y riesgo de cada producto", "Benchmarks y pérdida invisible", "Escenarios y comparador A/B", "Asesor IA y reporte en PDF", "Control financiero completo"];
  const steps = [
    { t: "Hoy", d: "Empiezas 3 días gratis. No se cobra nada.", c: C.green },
    { t: "Día 4", d: "Se cobra $5.99 al mes.", c: C.gold },
    { t: "Siempre", d: "Cancelas cuando quieras, en un clic.", c: C.accent },
  ];
  const wrap = { minHeight: "100vh", background: C.bg, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif", color: C.text };
  return (
    <div style={wrap}>
      <GlobalStyles />
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.textDim, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>← Volver</button>
          <div style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Ic n="🔒" /> Pago seguro</div>
        </div>
      </div>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 56px" }}>
        {paid ? (
          <div style={{ maxWidth: 440, margin: "60px auto", background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Activando tu plan PRO</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Recibimos tu pago. Esta pantalla cambia sola en unos segundos.</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Activa tu plan PRO</h1>
            <p style={{ fontSize: 14, color: C.textDim, margin: "0 0 26px" }}>Prueba gratis 3 días. Sin compromiso.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Cuadre PRO</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>$5.99<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>/mes</span></div>
                  </div>
                  {user && user.email && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, overflowWrap: "anywhere" }}>{user.email}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                    {feats.map(f => (
                      <div key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: C.textDim, lineHeight: 1.4 }}>
                        <span style={{ color: C.green, fontWeight: 800 }}><Ic n="✓" /></span><span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Cómo funciona</div>
                  {steps.map((st, i) => (
                    <div key={st.t} style={{ display: "flex", gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.c, marginTop: 6, flexShrink: 0 }} />
                      <div><div style={{ fontSize: 13, fontWeight: 700 }}>{st.t}</div><div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{st.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: "8px 18px 18px", minHeight: 240 }}>
                  {state === "loading" && <div style={{ fontSize: 13, color: C.textMuted, padding: 16 }}>Cargando pago seguro…</div>}
                  {state === "error" && <div style={{ fontSize: 13, color: C.amber, padding: 16, lineHeight: 1.6 }}>No pudimos cargar el pago. Revisa tu conexión e intenta de nuevo.</div>}
                  <div className="paddle-checkout" />
                </div>
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "6px 18px", marginTop: 14, fontSize: 11, color: C.textMuted }}>
                  <span><Ic n="🔒" /> Cifrado SSL</span><span><Ic n="💳" /> Visa · Mastercard · PayPal</span><span><Ic n="↩" /> Cancela cuando quieras</span>
                </div>
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
                  Al suscribirte aceptas los <a href="/terminos" onClick={e => { e.preventDefault(); openLegal("terms"); }} style={{ color: C.textDim }}>Términos</a>, la <a href="/privacidad" onClick={e => { e.preventDefault(); openLegal("privacy"); }} style={{ color: C.textDim }}>Privacidad</a> y la <a href="/reembolsos" onClick={e => { e.preventDefault(); openLegal("refund"); }} style={{ color: C.textDim }}>política de reembolsos</a> (3 días en tu primer pago).
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// La prueba gratis ahora es solo la de Paddle (con tarjeta). Se limpia la prueba antigua del navegador.
try { localStorage.removeItem("cod_trial_start"); } catch {}
