import { doc } from "firebase/firestore";
import { C } from "../theme";
import { GlobalStyles } from "../components/GlobalStyles";
import { Brand } from "../components/ui";
import { LEGAL_PATHS, SUPPORT_EMAIL, openLegal } from "../lib/nav";


// ─── PÁGINAS LEGALES ───────────────────────────────────────────────
export const LEGAL_UPDATED = "15 de noviembre de 2026";


export const LEGAL = {
  terms: { title: "Términos y condiciones", sections: [
    ["1. Quiénes somos", ["Cuadre es una herramienta en línea para calcular la rentabilidad de negocios de contraentrega (COD). Es operada por Dereck Axel Calle Rivera, persona natural, desde Ecuador. Puedes escribirnos a " + SUPPORT_EMAIL + "."]],
    ["2. Aceptación", ["Al usar Cuadre o crear una cuenta aceptas estos términos. Si no estás de acuerdo, no uses el servicio. Debes ser mayor de 18 años."]],
    ["3. El servicio", ["Cuadre ofrece una calculadora gratuita y un plan de pago llamado PRO con funciones adicionales (análisis, benchmarks, escenarios, asesor de IA, control financiero y otras).", "Los resultados son estimaciones basadas en los datos que tú ingresas y en supuestos generales, como la comisión de Dropi y el costo de envío de devoluciones. No son asesoría financiera, contable ni legal. Las decisiones que tomes con ellos son tu responsabilidad."]],
    ["4. Tu cuenta", ["Para guardar cálculos y activar PRO inicias sesión con Google. Eres responsable de la actividad de tu cuenta. Puedes eliminarla cuando quieras desde Ajustes."]],
    ["5. Suscripción PRO y pagos", ["PRO cuesta $5.99 USD al mes y se renueva automáticamente hasta que lo canceles. Incluye una prueba gratis de 3 días.", "Los pagos los procesa Paddle, que actúa como vendedor autorizado (merchant of record) y se encarga del cobro, los impuestos aplicables y las facturas. En tu estado de cuenta verás el cargo a nombre de Paddle.", "Puedes cancelar en cualquier momento desde Ajustes. Conservas PRO hasta el final del periodo ya pagado y no se te cobra de nuevo.", "Podemos cambiar el precio con aviso previo. El cambio aplica a partir de tu siguiente renovación."]],
    ["6. Reembolsos", ["Ofrecemos garantía de reembolso de 3 días en tu primer pago. Los detalles están en la política de reembolsos."]],
    ["7. Programa de referidos", ["Si invitas a alguien con tu enlace y se suscribe, recibes 15 días de PRO una vez pasados los 3 días de garantía de su primer pago. Puedes guardar hasta 30 días y activarlos cuando no tengas una suscripción activa. Los días no tienen valor en dinero, no se transfieren y se anulan si el pago del referido se reembolsa. Podemos cancelar premios por abuso, como referirte a ti mismo o crear cuentas falsas."]],
    ["8. Uso aceptable", ["No puedes usar el servicio para fines ilegales, intentar acceder a cuentas ajenas, extraer datos de forma masiva, vulnerar la seguridad ni revender el servicio sin autorización."]],
    ["9. Propiedad intelectual", ["Cuadre, su diseño y su código son nuestros. Tus datos siguen siendo tuyos: nos das permiso solo para almacenarlos y mostrarlos dentro del servicio."]],
    ["10. Disponibilidad y límite de responsabilidad", ["Nos esforzamos por mantener el servicio disponible, pero no garantizamos que funcione sin interrupciones ni errores. En la medida permitida por la ley, no somos responsables por pérdidas indirectas ni por decisiones de negocio tomadas con base en los resultados, y nuestra responsabilidad total se limita a lo que hayas pagado en los últimos 3 meses."]],
    ["11. Cambios", ["Podemos actualizar estos términos. Si el cambio es importante te avisaremos en la aplicación. Seguir usando el servicio significa que aceptas la versión nueva."]],
    ["12. Ley aplicable", ["Estos términos se rigen por las leyes de Ecuador. Para cualquier reclamo, escríbenos primero a " + SUPPORT_EMAIL + " y buscaremos resolverlo."]],
  ]},
  privacy: { title: "Política de privacidad", sections: [
    ["Responsable", ["El responsable del tratamiento de tus datos es Dereck Axel Calle Rivera, desde Ecuador (" + SUPPORT_EMAIL + ")."]],
    ["1. Qué datos recogemos", ["Cuenta: nombre, correo y foto de tu cuenta de Google cuando inicias sesión.", "Contenido que guardas: tus cálculos, tu control financiero, tus preferencias y el nombre de tu negocio.", "Suscripción: estado de tu plan y fechas de cobro. No vemos ni guardamos el número de tu tarjeta; el pago lo maneja Paddle.", "Referidos: tu código y el código de quien te invitó, si entraste por un enlace.", "En tu navegador guardamos preferencias y cálculos de la versión gratis (almacenamiento local)."]],
    ["2. Para qué los usamos", ["Para darte el servicio, guardar tu trabajo, activar tu plan PRO, gestionar referidos y atenderte cuando nos escribes. No vendemos tus datos. Para medir el rendimiento de nuestra publicidad usamos el píxel de TikTok, que registra de forma anónima visitas y acciones clave (registro, inicio de pago, pago completado); no recibe el contenido de tus cálculos."]],
    ["3. Con quién los compartimos", ["Google (Firebase) para inicio de sesión y almacenamiento. Paddle para pagos y facturación. Vercel para alojar la aplicación. Google Fonts para cargar la tipografía. TikTok (píxel de medición publicitaria). Cada uno trata los datos según su propia política. Los datos de pago se rigen por la política de privacidad de Paddle (paddle.com)."]],
    ["4. Cuánto tiempo los guardamos", ["Mientras tengas la cuenta. Si la eliminas, borramos tu perfil, tus cálculos y tu control financiero. Paddle puede conservar registros de facturación el tiempo que la ley le exija."]],
    ["5. Tus derechos", ["Puedes acceder a tus datos, corregirlos, descargarlos y eliminarlos. Todo esto lo haces tú mismo en Ajustes (pestañas Perfil y Datos y privacidad). Si necesitas algo más, escríbenos a " + SUPPORT_EMAIL + ". Respetamos los derechos que reconoce la Ley Orgánica de Protección de Datos Personales de Ecuador."]],
    ["6. Seguridad", ["Usamos conexiones cifradas y reglas de acceso para que cada persona solo vea sus propios datos. Ningún sistema es 100% seguro, pero trabajamos para proteger tu información."]],
    ["7. Menores", ["El servicio es para mayores de 18 años. No recogemos datos de menores a sabiendas."]],
    ["8. Cambios y contacto", ["Si cambiamos esta política, actualizaremos la fecha de esta página. Dudas: " + SUPPORT_EMAIL + "."]],
  ]},
  refund: { title: "Política de reembolsos", sections: [
    ["1. Garantía de 3 días", ["Si PRO no es para ti, puedes pedir el reembolso completo de tu primer pago dentro de los 3 días siguientes al cobro."]],
    ["2. Qué cubre", ["Solo el primer pago de la suscripción. Las renovaciones mensuales no se reembolsan, pero puedes cancelar cuando quieras para que no se cobren más. Si usas la prueba gratis de 3 días y cancelas antes de que termine, no se te cobra nada."]],
    ["3. Cómo pedirlo", ["Escribe a " + SUPPORT_EMAIL + " desde el correo de tu cuenta, o usa el enlace Solicitar reembolso en Ajustes > Suscripción. Revisamos la solicitud en un máximo de 2 días hábiles."]],
    ["4. Cómo se paga", ["El reembolso lo procesa Paddle al mismo método de pago que usaste. Según tu banco, puede tardar entre 5 y 10 días hábiles en verse reflejado."]],
    ["5. Qué pasa con tu cuenta", ["Al reembolsarse, tu suscripción se cancela y tu cuenta vuelve al plan gratuito. Conservas tus cálculos guardados, hasta el límite del plan gratis."]],
    ["6. Referidos", ["Si el pago de un referido se reembolsa dentro de los 3 días, los días de PRO que habrían correspondido al referente no se acreditan."]],
  ]},
};


export function LegalView({ kind, onHome }) {
  const doc = LEGAL[kind] || LEGAL.terms;
  const tabs = [["terms", "Términos"], ["privacy", "Privacidad"], ["refund", "Reembolsos"]];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'InterVariable','Inter',system-ui,-apple-system,sans-serif" }}>
      <GlobalStyles />
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand onClick={onHome} size={28} />
          <button onClick={onHome} style={{ background: "transparent", border: `1px solid ${C.borderBright}`, borderRadius: 9, padding: "7px 14px", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Volver al inicio</button>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          {tabs.map(([k, l]) => (
            <a key={k} href={LEGAL_PATHS[k]} onClick={e => { e.preventDefault(); openLegal(k); }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none", color: kind === k ? C.bg : C.textDim, background: kind === k ? C.text : C.card, border: `1px solid ${kind === k ? C.text : C.border}` }}>{l}</a>
          ))}
        </div>
        <h1 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 6px" }}>{doc.title}</h1>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 28 }}>Última actualización: {LEGAL_UPDATED}</div>
        {doc.sections.map(([h, ps]) => (
          <div key={h} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{h}</h2>
            {ps.map((t, i) => <p key={i} style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, margin: "0 0 10px" }}>{t}</p>)}
          </div>
        ))}
        <div style={{ marginTop: 36, paddingTop: 18, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMuted }}>Cuadre · Dereck Calle · Ecuador · <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.textDim }}>{SUPPORT_EMAIL}</a></div>
      </div>
    </div>
  );
}
