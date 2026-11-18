import { useState, useEffect, createContext, useContext } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, onSnapshot } from "firebase/firestore";
import { PREFS_KEY } from "./nav";
import { refApi } from "./referral";
import { track } from "./pixel";


// ─── FIREBASE & AUTH ─────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];


export const auth = getAuth(firebaseApp);


export const db = getFirestore(firebaseApp);


export const googleProvider = new GoogleAuthProvider();


// Firestore helpers
export async function saveSimulationFS(userId, simulation) {
  const ref = collection(db, "users", userId, "simulations");
  await addDoc(ref, { ...simulation, createdAt: serverTimestamp() });
}


export async function getSimulationsFS(userId) {
  const ref = collection(db, "users", userId, "simulations");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


export async function deleteSimulationFS(userId, simId) {
  await deleteDoc(doc(db, "users", userId, "simulations", simId));
}


// Auth context
export const AuthCtx = createContext(null);

// Paddle (pago dentro de la página). Estos valores se configuran en Vercel (variables VITE_PADDLE_*).
export const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || "sandbox";


export const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_TOKEN || "";


export const PADDLE_PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID || "";


export let paddleReady = null;


export function loadPaddle(onEvent) {
  if (typeof window === "undefined" || !PADDLE_TOKEN) return Promise.resolve(null);
  window.__paddleOnEvent = onEvent;
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve) => {
    const init = () => {
      try {
        if (PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token: PADDLE_TOKEN, eventCallback: (e) => { if (window.__paddleOnEvent) window.__paddleOnEvent(e); } });
        resolve(window.Paddle);
      } catch { resolve(null); }
    };
    if (window.Paddle) return init();
    const sc = document.createElement("script");
    sc.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    sc.async = true;
    sc.onload = init;
    sc.onerror = () => { paddleReady = null; resolve(null); };
    document.head.appendChild(sc);
  });
  return paddleReady;
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let unsubDoc = null;
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (fu) {
        // Mostrar la sesión de inmediato, sin esperar a Firestore
        setUser(fu);
        setLoadingAuth(false);
        try {
          const rc = localStorage.getItem("nx_ref");
          if (rc) refApi(fu, "claim", { code: rc }).catch(() => {}).finally(() => { try { localStorage.removeItem("nx_ref"); } catch {} });
        } catch {}
        const userRef = doc(db, "users", fu.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: fu.uid, email: fu.email,
              name: fu.displayName, photo: fu.photoURL,
              plan: "free", createdAt: serverTimestamp(),
            });
            track("CompleteRegistration", {}, "reg");
          }
        } catch (err) {
          console.error("Firestore error (revisa las reglas):", err);
        }
        // Escucha el plan en tiempo real: cambia a PRO solo cuando el webhook de pago lo confirma
        unsubDoc = onSnapshot(userRef,
          (s) => {
            const d = s.data() || {};
            setIsPro(d.plan === "pro" && (d.lsStatus !== "bonus" || (!!d.proUntil && new Date(d.proUntil) > new Date()))); setPortalUrl(d.customerPortalUrl || ""); setProfile(d);
            if (d.prefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(d.prefs)); } catch {} }
          },
          (err) => { console.error(err); setIsPro(false); });
      } else {
        setUser(null); setIsPro(false); setPortalUrl(""); setProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => { unsub(); if (unsubDoc) unsubDoc(); };
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <AuthCtx.Provider value={{ user, loadingAuth, isPro, portalUrl, profile, loginWithGoogle, logout, saveSimulationFS, getSimulationsFS, deleteSimulationFS }}>
      {children}
    </AuthCtx.Provider>
  );
}


export function useAuth() {
  return useContext(AuthCtx);
}
