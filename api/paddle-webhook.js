import crypto from "crypto";
import admin from "firebase-admin";

export const config = { api: { bodyParser: false } };

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return admin.firestore();
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verify(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=")));
  const ts = parts.ts, h1 = parts.h1;
  if (!ts || !h1) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const calc = crypto.createHmac("sha256", secret).update(`${ts}:${raw.toString("utf8")}`).digest("hex");
  const a = Buffer.from(calc), b = Buffer.from(h1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const raw = await readRaw(req);
  if (!verify(raw, req.headers["paddle-signature"], process.env.PADDLE_WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }
  const event = JSON.parse(raw.toString("utf8"));
  if (!String(event.event_type || "").startsWith("subscription.")) return res.status(200).send("ignored");
  const d = event.data || {};
  const uid = d.custom_data && d.custom_data.user_id;
  if (!uid) return res.status(200).send("no user");
  const endsAt = d.current_billing_period && d.current_billing_period.ends_at;
  const active = ["active", "trialing", "past_due"].includes(d.status) ||
    (d.status === "canceled" && endsAt && new Date(endsAt) > new Date());
  const urls = d.management_urls || {};
  const db = getDb();
  await db.collection("users").doc(uid).set({
    plan: active ? "pro" : "free",
    lsStatus: d.status || "",
    lsSubscriptionId: d.id || "",
    customerPortalUrl: urls.cancel || "",
    updatePaymentUrl: urls.update_payment_method || "",
    nextBillAt: d.next_billed_at || null,
    cancelAt: (d.scheduled_change && d.scheduled_change.action === "cancel") ? d.scheduled_change.effective_at : null,
    proUntil: endsAt || null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  // Referidos: primer pago de un referido => premio pendiente (se acredita pasados 3 días)
  try {
    const WINDOW_MS = 3 * 24 * 3600 * 1000;
    const fref = db.collection("referrals").doc(uid);
    const fd = (await fref.get()).data() || {};
    if (d.status === "active" && fd.referredBy && !fd.paidAt) {
      const at = new Date().toISOString();
      await fref.set({ paidAt: at }, { merge: true });
      await db.collection("referrals").doc(fd.referredBy).set({
        pending: admin.firestore.FieldValue.arrayUnion({ friendUid: uid, at }),
        paidCount: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    }
    // Cancelación inmediata dentro de la garantía (reembolso): el premio se anula
    if (d.status === "canceled" && fd.paidAt && Date.now() - Date.parse(fd.paidAt) < WINDOW_MS) {
      await fref.set({ voided: true }, { merge: true });
    }
  } catch (e) { console.error("referral", e); }
  return res.status(200).send("ok");
}
