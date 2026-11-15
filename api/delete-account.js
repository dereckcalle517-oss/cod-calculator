import admin from "firebase-admin";

function init() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "no-token" });
  try {
    init();
    const uid = (await admin.auth().verifyIdToken(token)).uid;
    const db = admin.firestore();
    const ref = db.collection("users").doc(uid);
    const d = ((await ref.get()).data()) || {};
    const activeSub = d.plan === "pro" && d.lsStatus !== "bonus" && d.lsStatus !== "canceled" && !d.cancelAt;
    if (activeSub) return res.status(409).json({ error: "cancel-first" });
    try {
      const rr = db.collection("referrals").doc(uid);
      const code = ((await rr.get()).data() || {}).code;
      if (code) await db.collection("refCodes").doc(code).delete();
      await rr.delete();
    } catch (e) { /* sin datos de referidos */ }
    await db.recursiveDelete(ref);
    try { await admin.auth().deleteUser(uid); } catch (e) { /* ya no existe */ }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: "invalid" });
  }
}
