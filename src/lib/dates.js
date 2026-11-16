import { C } from "../theme";


// ─── CONTROL FINANCIERO (valor agregado PRO) ──────────────────────────────────
export const FIN_CATS = ["Fondos Ads", "Suscripciones de negocio", "Cloaking / Herramientas", "Productos físicos", "Gastos operativos", "Retiros personales", "Otros"];


export const FIN_COLORS = [C.accent, C.purple, C.cyan, C.amber, C.green, C.red, C.textMuted, "#EC4899", "#14B8A6"];


export const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];


export const monthKey = (d) => (d || "").slice(0, 7);


export const monthLabel = (k) => { const [y, m] = (k || "").split("-"); return m ? `${MONTHS_ES[+m - 1]} ${y}` : k; };


export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };


export const uid8 = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);


export const sumBy = (arr) => arr.reduce((a, x) => a + (Number(x.amount) || 0), 0);


export const FIN_LS = "cod_finance";
