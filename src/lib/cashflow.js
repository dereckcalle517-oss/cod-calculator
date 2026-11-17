// Motor de simulación de flujo de caja para negocios contraentrega (COD).
// Dos fondos independientes: banco (paga ads y costos) y Dropi (paga envíos).
// Los pedidos de cada día se simulan por separado: se entregan, se liquidan y se pueden
// retirar en días distintos. Los domingos no cuentan para los plazos.

export const HORIZON = 45;
const DAY = 86400000;
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
// Días corridos que hay que sumar para avanzar n días hábiles (domingo no cuenta)
export function bizOffset(start, n) {
  let x = new Date(start), left = Math.round(n), off = 0;
  while (left > 0) { x = addDays(x, 1); off++; if (x.getDay() !== 0) left--; }
  return off;
}

// i: banco, dropi, adsDia, cpa, precio, costo, envio, comision(%), otros(por día),
//    pctConf, pctEnt, retiro (días hábiles entrega→disponible), transfer (días hábiles Dropi→banco),
//    enCamino (pedidos ya despachados), envioModo: "despacho" (Dropi cobra el envío al despachar)
//    o "devolucion" (solo cobra el envío de lo que se devuelve).
export function simulate(i, lag, days = HORIZON, today = startOfToday()) {
  const despacho = i.envioModo !== "devolucion";
  const orders = i.cpa > 0 ? i.adsDia / i.cpa : 0;
  const conf = orders * i.pctConf / 100;
  const ent = conf * i.pctEnt / 100, dev = conf - ent;
  const payDel = despacho ? i.precio - i.costo - i.precio * i.comision / 100
                          : i.precio - i.envio - i.costo - i.precio * i.comision / 100;
  const perDay = ent * (i.precio - i.envio - i.costo - i.precio * i.comision / 100) - dev * i.envio - i.adsDia - i.otros;

  const batches = [], unlocks = [], arrivals = [];
  if (i.enCamino > 0) {
    const span = Math.max(1, bizOffset(today, lag));
    for (let k = 1; k <= span; k++) {
      const c = i.enCamino / span, e = c * i.pctEnt / 100;
      const rd = addDays(today, k);
      batches.push({ day: k, ent: e, dev: c - e, unlockDay: k + bizOffset(rd, i.retiro), ads: 0, ship: 0, conf: c });
    }
  }
  let bank = i.banco, wallet = i.dropi, locked = 0, inTr = 0, recovered = 0;
  let injected = 0, withdrawn = 0, peakNet = 0, failDay = null, adsOn = i.adsDia > 0;
  const total0 = bank + wallet;
  let minBank = Infinity, firstRecovery = null, paybackDay = null, dipped = false, peakCommitted = 0;
  const rows = [];
  for (let t = 0; t < days; t++) {
    const date = addDays(today, t);
    let unlockedToday = 0, shipToday = 0, injToday = 0, wdToday = 0;
    for (const a of arrivals) if (a.day === t) { bank += a.amount; inTr -= a.amount; }
    // 1) gastos del banco
    const adsToday = adsOn ? i.adsDia : 0;
    bank -= adsToday + i.otros;
    // 2) pedidos del día
    if (adsOn && orders > 0) {
      const rOff = bizOffset(date, lag), rd = addDays(date, rOff);
      batches.push({ day: t + rOff, ent, dev, unlockDay: t + rOff + bizOffset(rd, i.retiro), ads: adsToday, ship: despacho ? conf * i.envio : 0, conf });
      if (despacho) { wallet -= conf * i.envio; shipToday = conf * i.envio; }
    }
    // 3) pedidos que se resuelven hoy
    for (const b of batches) if (b.day === t) {
      if (!despacho) wallet -= b.dev * i.envio;
      const pay = b.ent * payDel;
      locked += pay; unlocks.push({ day: b.unlockDay, amount: pay });
    }
    // 4) pagos que quedan disponibles hoy
    for (const u of unlocks) if (u.day === t) { locked -= u.amount; wallet += u.amount; recovered += u.amount; unlockedToday += u.amount; }
    if (firstRecovery === null && unlockedToday > 0) firstRecovery = t;
    // 5) reserva objetivo de Dropi
    const pending = batches.filter(b => b.day > t);
    const target = despacho ? (adsOn ? conf * i.envio : 0) : pending.reduce((s, b) => s + b.dev * i.envio, 0);
    // 6) reequilibrio
    if (wallet < target) { const m = target - wallet; bank -= m; wallet += m; injected += m; injToday = m; }
    else if (wallet > target) {
      const m = wallet - target; wallet -= m; withdrawn += m; wdToday = m;
      const off = bizOffset(date, i.transfer);
      if (off === 0) bank += m; else { inTr += m; arrivals.push({ day: t + off, amount: m }); }
    }
    peakNet = Math.max(peakNet, injected - withdrawn);
    minBank = Math.min(minBank, bank);
    if (failDay === null && bank < -0.005) { failDay = t; adsOn = false; }
    const committed = pending.reduce((s, b) => s + b.ads + b.ship, 0);
    peakCommitted = Math.max(peakCommitted, committed);
    const totalNow = bank + wallet + locked + inTr;
    if (totalNow < total0 - 0.01) dipped = true;
    if (dipped && paybackDay === null && totalNow >= total0 - 0.01) paybackDay = t;
    rows.push({ t, date, bank, wallet, locked, inTr, ads: adsToday, otros: i.otros, ship: shipToday, unlocked: unlockedToday,
      recovered, committed, total: totalNow, target, injToday, wdToday });
  }
  return { rows, failDay, orders, conf, ent, dev, perDay, minBank, peakNet, firstRecovery, paybackDay: dipped ? paybackDay : 0,
    peakCommitted, maxTarget: Math.max(0, ...rows.map(r => r.target)), payDel,
    ingresosDia: ent * i.precio,
    gastosDia: i.adsDia + i.otros + conf * i.envio + ent * i.costo + ent * i.precio * i.comision / 100 };
}

// Capital total que habría que tener (banco + Dropi) para sostener la campaña sin fallar,
// y cuánto de eso tiene que vivir en Dropi.
export function capitalNeeded(i, lag, days = HORIZON) {
  const big = 1e9;
  const s = simulate({ ...i, banco: big, dropi: 0 }, lag, days);
  const total = Math.max(0, big - s.minBank);
  const dropi = Math.min(total, s.peakNet);
  return { total, dropi, banco: Math.max(0, total - dropi) };
}
// Mayor inversión diaria que sostiene tu dinero actual durante el horizonte
export function maxSafeAds(i, lag, days = HORIZON) {
  if (!(i.cpa > 0)) return 0;
  let lo = 0, hi = Math.max(1000, i.adsDia * 4 + i.banco + i.dropi);
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) / 2;
    if (simulate({ ...i, adsDia: mid }, lag, days).failDay === null) lo = mid; else hi = mid;
  }
  return lo;
}
// Resumen de un escenario de inversión
export function scenario(i, ads, lag, days = HORIZON) {
  const x = { ...i, adsDia: ads };
  const s = simulate(x, lag, days);
  const need = capitalNeeded(x, lag, days);
  const last = s.rows[Math.min(29, s.rows.length - 1)];
  const sum30 = s.rows.slice(0, 30);
  const risk = s.failDay !== null ? "alto" : s.minBank < Math.max(ads * 3, 1) ? "medio" : "bajo";
  return { ads, s, need, risk, autonomia: s.failDay, pedidos30: s.orders * 30, entregas30: s.ent * 30,
    ingresos30: s.ingresosDia * 30, gastos30: s.gastosDia * 30, neta30: s.perDay * 30, bankEnd: last.bank, walletEnd: last.wallet };
}
