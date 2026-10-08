// Average daily production treated as constant flow, not stochastic arrival time.
const quantity = v => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new TypeError('finite nonnegative quantity required');
  return v;
};
const object = v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new TypeError('object required');
  return v;
};
const canonical = v => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  if (v === undefined || typeof v === 'number' && !Number.isFinite(v)) throw new TypeError('JSON condition values required');
  return v;
};
function validateForecast(f) {
  object(f); object(f.foodsPerDay); object(f.conditions);
  if (!Array.isArray(f.memberIds) || f.memberIds.length > 5 || new Set(f.memberIds).size !== f.memberIds.length || f.memberIds.some(id => typeof id !== 'string' || !id)) throw new TypeError('up to five distinct individual IDs required');
  for (const v of Object.values(f.foodsPerDay)) if (v !== null) quantity(v);
}
export function estimate(requirements, forecast, stock = {}, meals = 1, deadlineHours = 24) {
  object(requirements); object(stock); validateForecast(forecast);
  if (!Number.isInteger(meals) || meals < 1) throw new TypeError('positive integer meals required');
  quantity(deadlineHours); Object.values(stock).forEach(quantity);
  const foods = Object.entries(requirements).map(([food, q]) => {
    const required = quantity(quantity(q) * meals), available = stock[food] ?? 0;
    const deficit = Math.max(0, required - available);
    const rate = Object.hasOwn(forecast.foodsPerDay, food) ? forecast.foodsPerDay[food] : null;
    const status = deficit === 0 ? 'available' : rate === null ? 'unconfirmed' : rate === 0 ? 'not_produced' : 'estimate';
    const hours = status === 'available' ? 0 : status === 'estimate' ? quantity(24 * deficit / rate) : null;
    return {food, required, stock: available, deficit, perDay: rate, hours, status,
      shortageAtDeadline: rate === null ? null : Math.max(0, required - available - rate * deadlineHours / 24)};
  });
  const unknownFoods = foods.filter(r => r.status === 'unconfirmed').map(r => r.food);
  const notProducedFoods = foods.filter(r => r.status === 'not_produced').map(r => r.food);
  const hours = unknownFoods.length || notProducedFoods.length ? null : Math.max(0, ...foods.map(r => r.hours));
  const bottlenecks = hours === null || hours === 0 ? [] : foods.filter(r => r.hours !== null && Math.abs(r.hours - hours) <= 1e-12 * Math.max(Math.abs(r.hours), Math.abs(hours))).map(r => r.food);
  return {status: unknownFoods.length ? 'unconfirmed' : notProducedFoods.length ? 'unavailable' : hours === 0 ? 'available' : 'estimate', hours, bottlenecks, unknownFoods, notProducedFoods, meals, deadlineHours, foods, model: 'mean_daily_rate_constant_flow', potAndMealScheduleChecked: false};
}
export function compareSwaps(requirements, current, alternatives, stock = {}, meals = 1, deadlineHours = 24) {
  const base = estimate(requirements, current, stock, meals, deadlineHours);
  const results = alternatives.map(alternative => {
    validateForecast(alternative);
    if (JSON.stringify(canonical(alternative.conditions)) !== JSON.stringify(canonical(current.conditions))) throw new TypeError('forecast conditions must match');
    const removed = current.memberIds.filter(id => !alternative.memberIds.includes(id));
    const added = alternative.memberIds.filter(id => !current.memberIds.includes(id));
    if (current.memberIds.length !== alternative.memberIds.length || removed.length !== 1 || added.length !== 1) throw new TypeError('exactly one individual replacement required');
    if (typeof alternative.id !== 'string' || !alternative.id) throw new TypeError('forecast ID required');
    const result = estimate(requirements, alternative, stock, meals, deadlineHours);
    const hoursSaved = base.hours === null || result.hours === null ? null : base.hours - result.hours;
    return {forecastId: alternative.id, removed, added, result, hoursSaved,
      improves: result.hours !== null && (base.status === 'unavailable' || hoursSaved !== null && hoursSaved > 1e-12)};
  });
  results.sort((a,b) => Number(a.result.hours === null) - Number(b.result.hours === null) || (a.result.hours ?? 0) - (b.result.hours ?? 0) || a.forecastId.localeCompare(b.forecastId));
  return {current: base, alternatives: results, requirement: 'each alternative must contain a recomputed whole-team forecast; never sum marginal ranking contributions'};
}
// Callback must return a complete, recomputed whole-team forecast in this contract.
export async function evaluateRecipe({requirements, memberIds, conditions, stock = {}, meals = 1, deadlineHours = 24, swaps = [], forecastTeam}) {
  if (typeof forecastTeam !== 'function') throw new TypeError('forecastTeam callback required');
  const snapshot = structuredClone({requirements, memberIds, conditions, stock, meals, deadlineHours, swaps});
  const obtain = async (ids, id) => {
    const f = await forecastTeam({memberIds: [...ids], conditions: structuredClone(snapshot.conditions)});
    validateForecast(f);
    if (f.complete !== true || JSON.stringify(canonical(f.conditions)) !== JSON.stringify(canonical(snapshot.conditions)) || f.memberIds.length !== ids.length || ids.some(x => !f.memberIds.includes(x))) throw new TypeError('complete matching whole-team forecast required');
    return {...structuredClone(f), id};
  };
  // Validate before invoking production calculations.
  validateForecast({memberIds: snapshot.memberIds, conditions: snapshot.conditions, foodsPerDay: {}});
  const plans = snapshot.swaps.map((s, i) => {
    if (!snapshot.memberIds.includes(s.removeId) || typeof s.addId !== 'string' || !s.addId || snapshot.memberIds.includes(s.addId)) throw new TypeError('valid one-individual swap required');
    return {id: `swap-${i}`, ids: snapshot.memberIds.map(id => id === s.removeId ? s.addId : id)};
  });
  const current = await obtain(snapshot.memberIds, 'current');
  const alternatives = [];
  for (const plan of plans) alternatives.push(await obtain(plan.ids, plan.id));
  return compareSwaps(snapshot.requirements, current, alternatives, snapshot.stock, snapshot.meals, snapshot.deadlineHours);
}
export function formatHours(value) {
  quantity(value);
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  const digits = BigInt(mantissa.replace('.', ''));
  const shift = Number(exponent) - fraction + 1;
  const divisor = shift < 0 ? 10n ** BigInt(-shift) : 1n;
  const tenths = shift >= 0 ? digits * 10n ** BigInt(shift) : (digits + divisor / 2n) / divisor;
  return `${tenths / 10n}.${tenths % 10n}`;
}
export function displaySummary(result) {
  const text = result.status === 'available' ? '必要食材は在庫でそろっています' : result.status === 'unconfirmed' ? '収集量が未確認です' : result.status === 'unavailable' ? 'この編成の予想では必要食材がそろいません' : `必要食材がそろうまで約${formatHours(result.hours)}時間`;
  return {text, note: '平均収集量からの目安。回収時刻・鍋・調理時刻は別途確認。', shortages: result.foods.filter(r => r.deficit > 0).map(r => ({food: r.food, remaining: r.deficit, status: r.status})), bottlenecks: result.bottlenecks};
}
