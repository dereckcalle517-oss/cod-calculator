import crypto from "crypto";
import admin from "firebase-admin";

// Lista de espera de Cuadre Bot. Guarda correo, pedidos por día y país (opcionales).
function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return admin.firestore();
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const b = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  // Campo trampa: si un robot lo llena, se responde ok sin guardar
  if (b.hp) return res.status(200).json({ ok: true });
  const email = String(b.email || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
  const orders = String(b.orders || "").replace(/[^\d]/g, "").slice(0, 6);
  const country = String(b.country || "").trim().slice(0, 40);
  try {
    const id = crypto.createHash("sha256").update(email).digest("hex").slice(0, 32);
    await getDb().collection("botWaitlist").doc(id).set({
      email,
      orders: orders || null,
      country: country || null,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("waitlist", e);
    return res.status(500).json({ error: "server" });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
