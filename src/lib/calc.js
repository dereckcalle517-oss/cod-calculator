import { useMemo } from "react";
import { C } from "../theme";


// ─── CURRENCIES ───────────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "Dólar (USD)", flag: "US", countries: "Ecuador · Panamá" },
  { code: "COP", symbol: "$", name: "Peso Colombiano (COP)", flag: "CO", countries: "Colombia" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano (MXN)", flag: "MX", countries: "México" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano (PEN)", flag: "PE", countries: "Perú" },
  { code: "ARS", symbol: "$", name: "Peso Argentino (ARS)", flag: "AR", countries: "Argentina" },
  { code: "CLP", symbol: "$", name: "Peso Chileno (CLP)", flag: "CL", countries: "Chile" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño (BRL)", flag: "BR", countries: "Brasil" },
  { code: "BOB", symbol: "Bs.", name: "Boliviano (BOB)", flag: "BO", countries: "Bolivia" },
  { code: "PYG", symbol: "₲", name: "Guaraní (PYG)", flag: "PY", countries: "Paraguay" },
  { code: "UYU", symbol: "$U", name: "Peso Uruguayo (UYU)", flag: "UY", countries: "Uruguay" },
  { code: "GTQ", symbol: "Q", name: "Quetzal (GTQ)", flag: "GT", countries: "Guatemala" },
  { code: "DOP", symbol: "RD$", name: "Peso Dominicano (DOP)", flag: "DO", countries: "Rep. Dominicana" },
  { code: "CRC", symbol: "₡", name: "Colón (CRC)", flag: "CR", countries: "Costa Rica" },
  { code: "HNL", symbol: "L", name: "Lempira (HNL)", flag: "HN", countries: "Honduras" },
  { code: "NIO", symbol: "C$", name: "Córdoba (NIO)", flag: "NI", countries: "Nicaragua" },
  { code: "VES", symbol: "Bs.D", name: "Bolívar (VES)", flag: "VE", countries: "Venezuela" },
];


export const BENCH = {
  confirmacion: { min: 60, optimo: 75, max: 90 },
  entrega: { min: 60, optimo: 72, max: 85 },
  margen: { min: 20, optimo: 30, max: 45 },
  roas: { min: 1.5, optimo: 2.5, max: 4 },
};


// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const makeFmt = (sym) => (n, dec = 2) => {
  if (n === undefined || isNaN(n)) return `${sym}0`;
  return `${sym}${Math.abs(n).toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};


export const fmtNum = (n) => Math.round(n ?? 0).toLocaleString("es-ES");


export const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;


// ─── HEALTH SCORE ─────────────────────────────────────────────────────────────
export function calcHealth(inputs, R) {
  let score = 100;
  const issues = [];
  const wins = [];
  if (R.margen < 10) { score -= 25; issues.push({ label: "Margen crítico", detail: `${fmtPct(R.margen)} — mínimo recomendado 20%`, severity: "urgente" }); }
  else if (R.margen < 20) { score -= 12; issues.push({ label: "Margen bajo", detail: `${fmtPct(R.margen)} — apunta a 25%+`, severity: "importante" }); }
  else wins.push({ label: "Buen margen", detail: fmtPct(R.margen) });
  if (inputs.pctEntregados < 60) { score -= 20; issues.push({ label: "Entrega crítica", detail: `${inputs.pctEntregados}% — promedio LATAM 70-75%`, severity: "urgente" }); }
  else if (inputs.pctEntregados < 70) { score -= 8; issues.push({ label: "Entrega baja", detail: `${inputs.pctEntregados}%`, severity: "importante" }); }
  else wins.push({ label: "Buena entrega", detail: `${inputs.pctEntregados}%` });
  if (inputs.pctConfirmados < 60) { score -= 15; issues.push({ label: "Confirmación baja", detail: `${inputs.pctConfirmados}%`, severity: "importante" }); }
  else if (inputs.pctConfirmados >= 75) wins.push({ label: "Alta confirmación", detail: `${inputs.pctConfirmados}%` });
  if (R.gananciaNet < 0) { score -= 20; issues.push({ label: "Campaña con pérdidas", detail: "Estás perdiendo dinero", severity: "urgente" }); }
  else if (R.roas >= R.roasBreakEven) wins.push({ label: "ROAS saludable", detail: `${R.roas.toFixed(2)}x` });
  return { score: Math.max(0, score), issues, wins };
}


// ─── RISK LEVEL ───────────────────────────────────────────────────────────────
export function calcRisk(inputs, R) {
  let riskPoints = 0;
  if (R.margen < 15) riskPoints += 3;
  else if (R.margen < 25) riskPoints += 1;
  if (inputs.pctEntregados < 60) riskPoints += 3;
  else if (inputs.pctEntregados < 70) riskPoints += 1;
  if (R.roas < R.roasBreakEven) riskPoints += 3;
  if (R.gananciaNet < 0) riskPoints += 3;
  if (inputs.pctConfirmados < 60) riskPoints += 2;
  if (riskPoints >= 6) return { level: "Peligroso", emoji: "🔴", color: C.red, desc: "Alto riesgo de pérdida. No escales." };
  if (riskPoints >= 3) return { level: "Riesgoso", emoji: "🟡", color: C.amber, desc: "Campaña inestable. Optimiza antes de escalar." };
  return { level: "Seguro", emoji: "🟢", color: C.green, desc: "Campaña saludable. Puedes escalar con confianza." };
}


// ─── INVISIBLE LOSSES ─────────────────────────────────────────────────────────
export function calcInvisibleLosses(inputs, R) {
  // What if delivery was optimal (75%)?
  const optEntrega = 0.75;
  const confirmados = inputs.pedidos * (inputs.pctConfirmados / 100);
  const optEntregados = confirmados * optEntrega;
  const optDev = confirmados - optEntregados;
  const dropi = inputs.precio * 0.025;
  const ganXP = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
  const optGanancia = optEntregados * ganXP - optDev * inputs.cpa - optDev * inputs.envio * 0.6 - (!inputs.recupera ? optDev * inputs.costo : 0) - (inputs.pedidos - confirmados) * inputs.cpa;
  const lossEntrega = Math.max(0, optGanancia - R.gananciaNet);

  // What if confirmation was optimal (78%)?
  const optConf = 0.78;
  const optConfirmados = inputs.pedidos * optConf;
  const optEntregados2 = optConfirmados * (inputs.pctEntregados / 100);
  const optDev2 = optConfirmados - optEntregados2;
  const noConf2 = inputs.pedidos - optConfirmados;
  const optGan2 = optEntregados2 * ganXP - optDev2 * inputs.cpa - optDev2 * inputs.envio * 0.6 - (!inputs.recupera ? optDev2 * inputs.costo : 0) - noConf2 * inputs.cpa;
  const lossConf = Math.max(0, optGan2 - R.gananciaNet);

  // What if CPA was 20% lower?
  const optCPA = inputs.cpa * 0.8;
  const ganXP2 = inputs.precio - inputs.costo - inputs.envio - optCPA - dropi;
  const optGan3 = R.entregados * ganXP2 - R.devoluciones * optCPA - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * optCPA;
  const lossCPA = Math.max(0, optGan3 - R.gananciaNet);

  return { lossEntrega, lossConf, lossCPA, total: Math.max(lossEntrega, lossConf, lossCPA) };
}


// ─── BREAK PREDICTOR ──────────────────────────────────────────────────────────
export function calcBreakPoints(inputs, R) {
  const dropi = inputs.precio * 0.025;
  const ganXP = inputs.precio - inputs.costo - inputs.envio - inputs.cpa - dropi;
  // Min delivery to stay profitable
  let minEntrega = 0;
  for (let e = 1; e <= 100; e++) {
    const ent = (inputs.pedidos * inputs.pctConfirmados / 100) * (e / 100);
    const dev = (inputs.pedidos * inputs.pctConfirmados / 100) - ent;
    const gan = ent * ganXP - dev * inputs.cpa - dev * inputs.envio * 0.6 - (!inputs.recupera ? dev * inputs.costo : 0) - (inputs.pedidos * (1 - inputs.pctConfirmados / 100)) * inputs.cpa;
    if (gan >= 0) { minEntrega = e; break; }
  }
  // Max CPA to stay profitable
  let maxCPA = 0;
  for (let cpa = 0.1; cpa <= 50; cpa += 0.1) {
    const gxp = inputs.precio - inputs.costo - inputs.envio - cpa - dropi;
    const gan = R.entregados * gxp - R.devoluciones * cpa - R.devoluciones * inputs.envio * 0.6 - (!inputs.recupera ? R.devoluciones * inputs.costo : 0) - R.noConfirmados * cpa;
    if (gan < 0) { maxCPA = cpa - 0.1; break; }
  }
  return { minEntrega, maxCPA: Math.max(0, maxCPA) };
}


// ─── CALC ENGINE ──────────────────────────────────────────────────────────────
export function useCalc(inputs) {
  return useMemo(() => {
    const { costo, precio, envio, cpa, pedidos, pctConfirmados, pctEntregados, recupera } = inputs;
    const confirmados = pedidos * (pctConfirmados / 100);
    const entregados = confirmados * (pctEntregados / 100);
    const devoluciones = confirmados - entregados;
    const noConfirmados = pedidos - confirmados;
    const dropi = precio * 0.025;
    const gananciaXPedido = precio - costo - envio - cpa - dropi;
    const ingresosBrutos = entregados * precio;
    const perdidaCPA_dev = devoluciones * cpa;
    const perdidaFlete_dev = devoluciones * envio * 0.60;
    const perdidaProducto_dev = recupera ? 0 : devoluciones * costo;
    const totalPerdidaDev = perdidaCPA_dev + perdidaFlete_dev + perdidaProducto_dev;
    const perdidaCPA_noc = noConfirmados * cpa;
    const totalDropi = entregados * dropi;
    const totalCPA = pedidos * cpa;
    const totalEnvio = entregados * envio + devoluciones * envio * 0.60;
    const totalCosto = recupera ? entregados * costo : (entregados + devoluciones) * costo;
    const gastosTotales = totalCPA + totalEnvio + totalCosto + totalDropi;
    const gananciaNet = ingresosBrutos - gastosTotales;
    const margen = ingresosBrutos > 0 ? (gananciaNet / ingresosBrutos) * 100 : 0;
    const roasBreakEven = precio > (costo + envio + dropi) ? precio / (precio - costo - envio - dropi) : 0;
    const roas = cpa > 0 ? precio / cpa : 0;
    const invAds = cpa * pedidos;
    const fleteRecuperado = devoluciones * envio * 0.40;
    const cpaReal = entregados > 0 ? totalCPA / entregados : 0;
    const cpaMax = pedidos > 0 ? Math.max(0, (ingresosBrutos - totalEnvio - totalCosto - totalDropi) / pedidos) : 0;
    return { cpaReal, cpaMax, confirmados, entregados, devoluciones, noConfirmados, dropi, gananciaXPedido, ingresosBrutos, perdidaCPA_dev, perdidaFlete_dev, perdidaProducto_dev, totalPerdidaDev, perdidaCPA_noc, totalDropi, totalCPA, totalEnvio, totalCosto, gastosTotales, gananciaNet, margen, roasBreakEven, roas, invAds, fleteRecuperado };
  }, [inputs]);
}



// ─── CPA REAL ──────────────────────────────────────────────────────
export const CPA_LEVELS = [
  { id: "muy", label: "Muy rentable", f: 0.40, color: "#22C55E", hint: "Escala con tranquilidad" },
  { id: "normal", label: "Normal", f: 0.60, color: "#7BD88F", hint: "Buen margen para crecer" },
  { id: "medio", label: "Medio-alto", f: 0.80, color: "#F5C451", hint: "Ojo, el margen se achica" },
  { id: "limite", label: "Límite", f: 0.95, color: "#F59E0B", hint: "Casi sin ganancia" },
  { id: "cero", label: "0 ganancia", f: 1.00, color: "#EF4444", hint: "Aquí empiezas a perder" },
];


export function useCalcPure(inp) {
  const conf = inp.pedidos * (inp.pctConfirmados / 100);
  const ent = conf * (inp.pctEntregados / 100);
  const dev = conf - ent;
  const dropi = inp.precio * 0.025;
  const ing = ent * inp.precio;
  const envio = ent * inp.envio + dev * inp.envio * 0.60;
  const costo = inp.recupera ? ent * inp.costo : (ent + dev) * inp.costo;
  const max = inp.pedidos > 0 ? Math.max(0, (ing - envio - costo - ent * dropi) / inp.pedidos) : 0;
  const real = ent > 0 ? (inp.pedidos * inp.cpa) / ent : 0;
  return { cpaReal: real, cpaMax: max, ent };
}
