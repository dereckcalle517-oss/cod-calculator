// Motor de simulación de flujo de caja para negocios contraentrega (COD).
//
// Dos cuentas separadas:
//  · Banco: paga ads, otros costos y (si compras el inventario) el costo del producto.
//  · Dropi: paga los envíos. Cobra el envío de cada pedido al despacharlo, o solo el de los
//    devueltos (según envioModo). El costo del producto se descuenta al liquidar el pedido
//    (modelo Dropi) o lo pagas tú al despachar (costoModo).
//
// Cada día genera un lote de pedidos que se simula por separado: se entrega, se liquida,
// queda disponible para retirar y se transfiere al banco en días distintos. Los domingos
// no cuentan para ningún plazo. Dropi mantiene una reserva fija (reserveDropi): si baja de
// ahí se deposita desde el banco; lo que sobra se retira cada pocos días.
// La operación "falla" cuando el banco no puede pagar o Dropi no puede pagar envíos.

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

// Valores por pedido y por día derivados de las entradas
function unit(i) {
  const despacho = i.envioModo !== "devolucion";
  const prepagaCosto = i.costoModo === "despacho";
  const orders = i.cpa > 0 ? i.adsDia / i.cpa : 0;
  const conf = orders * i.pctConf / 100;
  const ent = conf * i.pctEnt / 100, dev = conf - ent;
  const com = i.precio * i.comision / 100;
  // Lo que Dropi deposita en tu saldo por un pedido entregado
  const payDel = i.precio - com - (despacho ? 0 : i.envio) - (prepagaCosto ? 0 : i.costo);
  // Ganancia por día en régimen (igual en cualquier modo): lo que queda después de todo
  const perDay = ent * (i.precio - i.envio - i.costo - com) - dev * i.envio - i.adsDia - i.otros;
  return { despacho, prepagaCosto, orders, conf, ent, dev, com, payDel, perDay };
}

// Pedidos que ya están en camino hoy: se resuelven repartidos en el plazo de entrega
function initialBatches(i, lag, today) {
  const out = [];
  if (!(i.enCamino > 0)) return out;
  const span = Math.max(1, bizOffset(today, lag));
  for (let k = 1; k <= span; k++) {
    const c = i.enCamino / span, e = c * i.pctEnt / 100;
    out.push({ day: k, ent: e, dev: c - e, conf: c, unlockDay: k + bizOffset(addDays(today, k), i.retiro), ads: 0, ship: 0 });
  }
  return out;
}

// Movimiento neto de Dropi por día (envíos en negativo, cobros en positivo), sin depósitos ni retiros
export function walletFlow(i, lag, L, ahead, today = startOfToday(), parts = null) {
  const u = unit(i);
  const flow = new Array(L).fill(0);
  if (parts) { parts.ship = new Array(L).fill(0); parts.pay = new Array(L).fill(0); parts.shipN = new Array(L).fill(0); parts.entN = new Array(L).fill(0); }
  const cnt = (k, t, n) => { if (parts && t >= 0 && t < L) parts[k][t] += n; };
  const add = (t, v) => { if (t >= 0 && t < L) { flow[t] += v; if (parts) { if (v < 0) parts.ship[t] -= v; else parts.pay[t] += v; } } };
  for (const b of initialBatches(i, lag, today)) { if (!u.despacho) { add(b.day, -b.dev * i.envio); cnt("shipN", b.day, b.dev); } add(b.unlockDay, b.ent * u.payDel); cnt("entN", b.unlockDay, b.ent); }
  for (let t = 0; t < ahead; t++) {
    const d = addDays(today, t), r = bizOffset(d, lag), ul = r + bizOffset(addDays(d, r), i.retiro);
    if (u.despacho) { add(t, -u.conf * i.envio); cnt("shipN", t, u.conf); } else { add(t + r, -u.dev * i.envio); cnt("shipN", t + r, u.dev); }
    add(t + ul, u.ent * u.payDel); cnt("entN", t + ul, u.ent);
  }
  return flow;
}

// Reserva que Dropi necesita para no quedarse sin saldo: lo que van a superar los envíos a los pagos
// ya programados (mirando hacia adelante). R[0] es lo que debes tener en Dropi hoy; R[t+1] es lo que
// debe quedar al cierre del día t. Sin colchones extra cuando el depósito es inmediato.
export function reserveSchedule(i, lag, days = HORIZON, today = startOfToday()) {
  const u = unit(i);
  if (!(i.adsDia > 0)) return new Array(days).fill(0);
  const L = days + 40;
  const flow = walletFlow(i, lag, L, days + 30, today);
  const daily = u.despacho ? u.conf * i.envio : u.dev * i.envio;
  const m = new Array(L + 1).fill(0);
  for (let t = L - 1; t >= 0; t--) m[t] = flow[t] + Math.min(0, m[t + 1]);
  // R[t] = saldo que Dropi necesita al INICIO del día t. Si el depósito del banco tarda, hay que
  // tener además los envíos de los días que pasan hasta que llegue (con depósito inmediato: 0).
  return Array.from({ length: days + 1 }, (_, t) => {
    const off = i.deposito > 0 ? bizOffset(addDays(today, t), i.deposito) : 0;
    return Math.max(0, -m[t]) + daily * Math.max(0, off - 1);
  });
}
export const reserveDropi = (i, lag, days = HORIZON, today = startOfToday()) => reserveSchedule(i, lag, days, today)[0] || 0;

export function simulate(i, lag, days = HORIZON, today = startOfToday(), R = reserveSchedule(i, lag, days, today)) {
  const u = unit(i);
  const batches = initialBatches(i, lag, today);
  const unlocks = [], toBank = [], toDropi = [];
  let bank = i.banco, wallet = i.dropi, locked = 0, trBank = 0, trDropi = 0, inventory = 0, recovered = 0;
  let failDay = null, failWhy = null, adsOn = i.adsDia > 0;
  const total0 = bank + wallet;
  let minBank = Infinity, minWallet = Infinity, firstRecovery = null, paybackDay = null, dipped = false, peakCommitted = 0, sinceWd = 0;
  const rows = [];
  for (let t = 0; t < days; t++) {
    const date = addDays(today, t);
    let unlockedToday = 0, shipToday = 0, depToday = 0, wdToday = 0, prodToday = 0;
    // 0) llegan transferencias en camino
    for (const a of toBank) if (a.day === t) { bank += a.amount; trBank -= a.amount; }
    for (const a of toDropi) if (a.day === t) { wallet += a.amount; trDropi -= a.amount; }
    // 1) gastos del banco
    const adsToday = adsOn ? i.adsDia : 0;
    bank -= adsToday + i.otros;
    // 2) pedidos del día
    if (adsOn && u.orders > 0) {
      const rOff = bizOffset(date, lag), rd = addDays(date, rOff);
      batches.push({ day: t + rOff, ent: u.ent, dev: u.dev, conf: u.conf, ads: adsToday, ship: u.despacho ? u.conf * i.envio : 0, unlockDay: t + rOff + bizOffset(rd, i.retiro) });
      if (u.despacho) { wallet -= u.conf * i.envio; shipToday = u.conf * i.envio; }
      if (u.prepagaCosto) { bank -= u.conf * i.costo; prodToday = u.conf * i.costo; }
    }
    // 3) pedidos que se resuelven hoy
    for (const b of batches) if (b.day === t) {
      if (!u.despacho) wallet -= b.dev * i.envio;
      if (u.prepagaCosto) inventory += b.dev * i.costo;   // lo devuelto vuelve a tu stock
      const pay = b.ent * u.payDel;
      locked += pay; unlocks.push({ day: b.unlockDay, amount: pay });
    }
    // 4) pagos que quedan disponibles hoy
    for (const x of unlocks) if (x.day === t) { locked -= x.amount; wallet += x.amount; recovered += x.amount; unlockedToday += x.amount; }
    if (firstRecovery === null && unlockedToday > 0) firstRecovery = t;
    // 5) depósito desde el banco, justo a tiempo: solo lo que falta para pagar los envíos
    //    (más los que se pagarán mientras el depósito está en camino). No se pre-financia Dropi.
    const K = R[t + 1] || 0;
    const have = wallet + trDropi;
    const dOff = i.deposito > 0 ? bizOffset(date, i.deposito) : 0;
    const Kdep = (u.despacho ? u.conf : u.dev) * i.envio * Math.max(0, dOff - 1);
    if (have < Kdep - 0.005) {
      const m = Kdep - have;
      bank -= m; depToday = m;
      if (dOff === 0) wallet += m; else { trDropi += m; toDropi.push({ day: t + dOff, amount: m }); }
    } else if (++sinceWd >= Math.max(1, Math.round(i.retiroCada)) && wallet > K + 0.005) {
      // 6) retiro del excedente de Dropi al banco, cada cierto número de días
      const m = wallet - K; wallet -= m; wdToday = m; sinceWd = 0;
      const off = bizOffset(date, i.transfer);
      if (off === 0) bank += m; else { trBank += m; toBank.push({ day: t + off, amount: m }); }
    }
    minBank = Math.min(minBank, bank); minWallet = Math.min(minWallet, wallet);
    if (failDay === null && (bank < -0.005 || wallet < -0.005)) { failDay = t; failWhy = bank < -0.005 ? "banco" : "dropi"; adsOn = false; }
    const pending = batches.filter(b => b.day > t);
    const committed = pending.reduce((s, b) => s + b.ads + b.ship, 0);
    peakCommitted = Math.max(peakCommitted, committed);
    const totalNow = bank + wallet + locked + trBank + trDropi + inventory;
    if (totalNow < total0 - 0.01) dipped = true;
    if (dipped && paybackDay === null && totalNow >= total0 - 0.01) paybackDay = t;
    rows.push({ t, date, bank, wallet, locked, inTr: trBank + trDropi, ads: adsToday, otros: i.otros, ship: shipToday, prod: prodToday,
      unlocked: unlockedToday, recovered, committed, total: totalNow, K, dep: depToday, wd: wdToday });
  }
  return { rows, failDay, failWhy, orders: u.orders, conf: u.conf, ent: u.ent, dev: u.dev, perDay: u.perDay, minBank, minWallet,
    firstRecovery, paybackDay: dipped ? paybackDay : 0, peakCommitted, K: R[0] || 0, Kmin: Math.min(...R), payDel: u.payDel,
    ingresosDia: u.ent * i.precio,
    gastosDia: i.adsDia + i.otros + u.conf * i.envio + u.ent * i.costo + u.ent * u.com };
}

// Capital necesario: Dropi con su reserva y cuánto banco hace falta para pagar ads y depósitos
export function capitalNeeded(i, lag, days = HORIZON) {
  const K = reserveDropi(i, lag, days);
  const big = 1e9;
  const s = simulate({ ...i, banco: big, dropi: K }, lag, days);
  const banco = Math.max(0, big - s.minBank);
  return { dropi: K, banco, total: K + banco };
}
// Mayor inversión diaria que sostiene tu dinero actual (cada cuenta por separado)
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
  const risk = s.failDay !== null ? "alto" : s.minBank < Math.max(ads * 3, 1) ? "medio" : "bajo";
  return { ads, s, need, risk, autonomia: s.failDay, pedidos30: s.orders * 30, entregas30: s.ent * 30,
    ingresos30: s.ingresosDia * 30, gastos30: s.gastosDia * 30, neta30: s.perDay * 30 };
}

// Optimización del dinero: cuánto tener en cada cuenta para que Dropi nunca se quede sin saldo
// y no haya dinero parado de más. Dropi se recarga cada `every` días con lo que van a costar los
// envíos hasta la siguiente recarga (más los días que tarda el depósito); lo que sobra vuelve al banco.
export function optimizeCash(i, lag, every = 3, days = 30, today = startOfToday()) {
  const u = unit(i);
  const L = days + 40;
  const parts = {};
  const flow = walletFlow(i, lag, L, days + 30, today, parts);
  const total = i.banco + i.dropi;
  // Dropi debe tener los envíos de [t, t+w) ya en su saldo, SIN contar cobros que todavía no llegan:
  // si un día no alcanza el saldo, no se despacha y se pierde un día de campaña.
  const needAt = (t, w) => { let c = 0; for (let k = t; k < t + w && k < L; k++) c += parts.ship[k]; return c; };
  const dLag = i.deposito > 0 ? Math.round(i.deposito) : 0;
  const MARGEN = 0; // sin colchón extra: ya se exige tener los envíos antes de que ocurran
  const w = Math.max(1, Math.round(every)) + dLag + MARGEN;
  let wallet = 0, bank = 0, minBank = Infinity, minWallet = Infinity, sumW = 0, cubre = true, minBankDate = today;
  const toBank = [], moves = [], rows = [];
  const need0 = needAt(0, w);
  wallet = Math.min(total, need0); bank = total - wallet;           // reparto de hoy
  const hoy = { banco: bank, dropi: wallet, necesita: need0, alcanza: total >= need0 - 0.005 };
  const ev = Math.max(1, Math.round(every));
  for (let t = 0; t < days; t++) {
    const date = addDays(today, t);
    for (const x of toBank) if (x.day === t) bank += x.amount;
    const adsHoy = (u.orders > 0 ? i.adsDia : 0) + i.otros + (u.prepagaCosto ? u.conf * i.costo : 0);
    bank -= adsHoy;
    wallet += flow[t];
    const mv0 = moves.length;
    // al cierre de cada ciclo se deja Dropi listo para el siguiente (o se devuelve lo que sobra)
    if ((t + 1) % ev === 0) {
      const need = needAt(t + 1, w), delta = need - wallet;
      if (delta > 0.005) { const m = Math.min(delta, Math.max(0, bank)); bank -= m; wallet += m; if (m > 0.005) moves.push({ t: t + 1, date, amount: m, dir: "dropi" }); }
      else if (delta < -0.005) { const m = -delta; wallet -= m; const off = bizOffset(date, i.transfer); if (off === 0) bank += m; else toBank.push({ day: t + off, amount: m }); moves.push({ t: t + 1, date, amount: m, dir: "banco" }); }
    }
    if (wallet < parts.ship[t + 1] - 0.005) cubre = false; // mañana no se podrían despachar todos los pedidos
    if (bank < minBank) minBankDate = date;
    minBank = Math.min(minBank, bank); minWallet = Math.min(minWallet, wallet);
    sumW += Math.max(0, wallet);
    const mv = moves.slice(mv0).reduce((a, m) => a + (m.dir === "dropi" ? m.amount : -m.amount), 0);
    rows.push({ t, date, bank, wallet, ads: adsHoy, ship: parts.ship[t], shipN: parts.shipN[t], pay: parts.pay[t], entN: parts.entN[t], mv });
  }
  const first = flow.findIndex((v, k) => k > 0 && v > 0);
  return { hoy, moves, minBank, minWallet, ok: minBank >= -0.005 && minWallet >= -0.005 && cubre, avgDropi: sumW / days, every: Math.max(1, Math.round(every)), firstPay: first < 0 ? null : first, rows, falta: Math.max(0, -minBank, -minWallet), faltaFecha: minBankDate };
}
// Elige la recarga más espaciada (menos trabajo para el usuario) con la que ninguna cuenta se queda sin saldo
export function bestPlan(i, lag, days = 30, today = startOfToday()) {
  let last = null;
  for (const e of [5, 3, 2, 1]) { last = optimizeCash(i, lag, e, days, today); if (last.ok) return last; }
  return last;
}
