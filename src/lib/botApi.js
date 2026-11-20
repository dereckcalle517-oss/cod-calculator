// ─── CUADRE CONFIRMA: conexión con el motor del bot ──────────────────────────
// El motor (Railway) guarda los pedidos y chats de cada tienda. Aquí solo se le piden datos
// con la sesión de Google del usuario; el motor verifica la sesión y entrega solo lo suyo.
// Si VITE_BOT_API_URL no está configurada, la sección Confirma no aparece en la app.

export const BOT_API_URL = (import.meta.env.VITE_BOT_API_URL || "").replace(/\/+$/, "");
export const confirmaEnabled = !!BOT_API_URL;

const ERRORS = {
  "sin-sesion": "Tu sesión venció. Vuelve a iniciar sesión.",
  "sin-bot": "Todavía no tienes Cuadre Confirma activado.",
  "solo-admin": "Solo el administrador puede hacer esto.",
  "texto-vacio": "Escribe un mensaje.",
  "bot-inactivo": "Tu asistente todavía no está activo.",
  "numero-en-uso": "Ese número ya está conectado a otra tienda.",
  "datos-invalidos": "Revisa los datos.",
  "sin-waba": "Primero guarda el ID de la cuenta de WhatsApp.",
};

export async function botFetch(user, path, { method = "GET", body, raw = false } = {}) {
  if (!BOT_API_URL) throw new Error("Cuadre Confirma no está configurado.");
  if (!user) throw new Error(ERRORS["sin-sesion"]);
  const token = await user.getIdToken();
  let res;
  try {
    res = await fetch(`${BOT_API_URL}/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el asistente. Revisa tu internet e inténtalo de nuevo.");
  }
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message ? `${ERRORS[data.error] || "Error"}: ${data.message}` : ERRORS[data.error] || "Algo salió mal. Inténtalo de nuevo.");
    e.code = data.error;
    e.status = res.status;
    throw e;
  }
  return data;
}

// Descarga un archivo del motor (necesita la sesión, por eso no es un enlace normal)
export async function botDownload(user, path, filename) {
  const res = await botFetch(user, path, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Estados de un pedido (los mismos que usa el motor)
export const EST = {
  wait: "Coordinando entrega",
  rec: "Recuperando pedido",
  ok: "Confirmado",
  reconf: "Reconfirmación enviada",
  go: "Listo para despachar",
  dropi: "Subido a Dropi",
  bad: "Cancelado",
};
