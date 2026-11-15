import crypto from "crypto";
import admin from "firebase-admin";

const REWARD_DAYS = 15;
const CAP_DAYS = 30;
const WINDOW_MS = 3 * 24 * 3600 * 1000; // 3 días de garantía

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return admin.firestore();
}

const ALPH = "abcdefghjkmnpqrstuvwxyz23456789";
const newCode = () => Array.from(crypto.randomBytes(7)).map((b) => ALPH[b % ALPH.length]).join("");

async function ensureCode(db, uid) {
  const ref = db.collection("referrals").doc(uid);
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : {};
  if (d.code) return d.code;
  for (let i = 0; i < 6; i++) {
    const code = newCode();
    try {
      await db.collection("refCodes").doc(code).create({ uid });
      await ref.set({ code }, { merge: true });
      return code;
    } catch (e) { /* código repetido: probar otro */ }
  }
  throw new Error("code");
}

// Acredita los premios cuyo periodo de garantía ya terminó
async function processPending(db, uid) {
  const ref = db.collection("referrals").doc(uid);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data() || {};
    const pending = d.pending || [];
    if (!pending.length) return;
    const now = Date.now();
    const due = pending.filter((p) => now - Date.parse(p.at) >= WINDOW_MS);
    if (!due.length) return;
    const snaps = await tx.getAll(...due.map((p) => db.collection("referrals").doc(p.friendUid)));
    const voided = new Set();
    snaps.forEach((x, i) => { if (x.exists && x.data().voided) voided.add(due[i].friendUid); });
    let bank = d.bank || 0, granted = 0;
    const keep = [];
    for (const p of pending) {
      if (now - Date.parse(p.at) < WINDOW_MS) { keep.push(p); continue; }
      if (voided.has(p.friendUid)) continue;
      if (bank + REWARD_DAYS <= CAP_DAYS) { bank += REWARD_DAYS; granted++; } else keep.push(p);
    }
    tx.set(ref, { pending: keep, bank, rewarded: (d.rewarded || 0) + granted }, { merge: true });
  });
}

const blockedByPaidSub = (u) => u.plan === "pro" && u.lsStatus !== "bonus";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "no-token" });
  let uid;
  try { getDb(); uid = (await admin.auth().verifyIdToken(token)).uid; }
  catch (e) { return res.status(401).json({ error: "invalid" }); }
  const db = getDb();
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const action = body.action;

  try {
    if (action === "claim") {
      const code = String(body.code || "").toLowerCase();
      if (!/^[a-z0-9]{4,16}$/.test(code)) return res.status(400).json({ error: "code" });
      const mine = await db.collection("referrals").doc(uid).get();
      if (mine.exists && mine.data().referredBy) return res.status(200).json({ ok: false, reason: "already" });
      // Solo cuentas nuevas (creadas en las últimas 24 h)
      const rec = await admin.auth().getUser(uid);
      if (Date.now() - Date.parse(rec.metadata.creationTime) > 24 * 3600 * 1000) return res.status(200).json({ ok: false, reason: "old" });
      const c = await db.collection("refCodes").doc(code).get();
      if (!c.exists) return res.status(200).json({ ok: false, reason: "unknown" });
      const referrer = c.data().uid;
      if (referrer === uid) return res.status(200).json({ ok: false, reason: "self" });
      await db.collection("referrals").doc(uid).set({ referredBy: referrer, referredAt: new Date().toISOString() }, { merge: true });
      await db.collection("referrals").doc(referrer).set({ registered: admin.firestore.FieldValue.increment(1) }, { merge: true });
      return res.status(200).json({ ok: true });
    }

    if (action === "status" || action === "redeem") {
      const code = await ensureCode(db, uid);
      await processPending(db, uid);
      const ref = db.collection("referrals").doc(uid);
      let d = (await ref.get()).data() || {};
      const u = ((await db.collection("users").doc(uid).get()).data()) || {};
      const blocked = blockedByPaidSub(u);

      if (action === "redeem") {
        const days = d.bank || 0;
        if (days <= 0) return res.status(400).json({ error: "empty" });
        if (blocked) return res.status(409).json({ error: "subscription-active" });
        const cur = u.lsStatus === "bonus" && u.proUntil ? Date.parse(u.proUntil) : 0;
        const base = Math.max(Date.now(), cur || 0);
        const until = new Date(base + days * 24 * 3600 * 1000).toISOString();
        await db.collection("users").doc(uid).set({
          plan: "pro", lsStatus: "bonus", proUntil: until,
          customerPortalUrl: "", updatePaymentUrl: "", nextBillAt: null, cancelAt: null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        await ref.set({ bank: 0, redeemedDays: (d.redeemedDays || 0) + days }, { merge: true });
        return res.status(200).json({ ok: true, days, until });
      }

      return res.status(200).json({
        code, registered: d.registered || 0, paid: d.paidCount || 0,
        bank: d.bank || 0, cap: CAP_DAYS, reward: REWARD_DAYS,
        pending: (d.pending || []).length, blocked, canRedeem: (d.bank || 0) > 0 && !blocked,
      });
    }
    return res.status(400).json({ error: "action" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
