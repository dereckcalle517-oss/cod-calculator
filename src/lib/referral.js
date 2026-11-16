import { useState, useEffect } from "react";
import { useAuth } from "./firebase";


export async function refApi(user, action, extra) {
  const token = await user.getIdToken();
  const r = await fetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...(extra || {}) }) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}


export const refUrlFor = (code) => `${window.location.origin}/${code ? `?ref=${code}` : ""}`;


export function useMyRefCode() {
  const { user } = useAuth();
  const [code, setCode] = useState(() => { try { return localStorage.getItem("nx_my_ref") || ""; } catch { return ""; } });
  useEffect(() => {
    if (!user || code) return;
    refApi(user, "status").then(d => { if (d && d.code) { setCode(d.code); try { localStorage.setItem("nx_my_ref", d.code); } catch {} } }).catch(() => {});
  }, [user && user.uid]);
  return code;
}
