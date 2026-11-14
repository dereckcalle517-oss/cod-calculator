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
  await getDb().collection("users").doc(uid).set({
    plan: active ? "pro" : "free",
    lsStatus: d.status || "",
    lsSubscriptionId: d.id || "",
    customerPortalUrl: urls.cancel || urls.update_payment_method || "",
    proUntil: endsAt || null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return res.status(200).send("ok");
}
