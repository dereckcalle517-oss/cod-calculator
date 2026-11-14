// Archivo: api/lemon-webhook.js
// Recibe los avisos de Lemon Squeezy y activa o desactiva el plan PRO en Firestore.
import crypto from "node:crypto";
import admin from "firebase-admin";

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return admin.firestore();
}

async function readRaw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("method not allowed");

  const secret = process.env.LEMON_WEBHOOK_SECRET;
  if (!secret) return res.status(500).send("missing LEMON_WEBHOOK_SECRET");

  const raw = await readRaw(req);
  const sig = String(req.headers["x-signature"] || "");
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).send("invalid signature");

  let body;
  try { body = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).send("bad json"); }

  const event = body?.meta?.event_name || "";
  const uid = body?.meta?.custom_data?.user_id;
  if (!event.startsWith("subscription_")) return res.status(200).send("ignored event");
  if (!uid) return res.status(200).send("no user_id in custom data");

  const at = body?.data?.attributes || {};
  const status = at.status;
  const endsAt = at.ends_at ? Date.parse(at.ends_at) : null;
  // Activo si paga, está en prueba, tiene un pago pendiente, o canceló pero ya pagó el periodo en curso
  const active = ["active", "on_trial", "past_due"].includes(status) || (status === "cancelled" && endsAt && endsAt > Date.now());

  try {
    await getDb().collection("users").doc(uid).set({
      plan: active ? "pro" : "free",
      lsStatus: status || null,
      lsSubscriptionId: String(body?.data?.id || ""),
      customerPortalUrl: at?.urls?.customer_portal || null,
      proUntil: at.ends_at || at.renews_at || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error("firestore error", e);
    return res.status(500).send("firestore error");
  }
  return res.status(200).send("ok");
}
