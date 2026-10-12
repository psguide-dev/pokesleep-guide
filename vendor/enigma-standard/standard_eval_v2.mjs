// PSN standard-reference adapter. No simulator or real standard data included.
export const CONDITIONS = Object.freeze({ticket: true, collectionHours: 4,
  awakeHours: 16, sleepHours: 8, startEnergy: 100, meals: 3,
  fieldBonus: false, favoriteBonus: false, exBonus: false,
  eventBonus: false, externalSupport: false});
export const AXES = ['berry', 'ingredient', 'skill'];
const FIELDS = ['species', 'form', 'level', 'ingredients', 'skillLevel',
  'ribbon', 'evolutionStage', 'engineVersion', 'referenceVersion'];
export function contextKey(context) {
  for (const field of FIELDS) {
    if (context[field] === undefined || context[field] === null)
      throw new Error(`Missing context: ${field}`);
  }
  return JSON.stringify(FIELDS.map(field => context[field]));
}
function sameConditions(value) {
  return Object.entries(CONDITIONS).every(([key, expected]) => value?.[key] === expected);
}
function valid(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
// Build-time helper only: samples must be legal configurations from the current engine.
// No implicit equal-probability assumption: caller must provide justified weights.
export function buildReference(context, specialty, samples, provenance) {
  if (!AXES.includes(specialty)) throw new Error('Unsupported specialty');
  const key = contextKey(context);
  if (!provenance?.population || !provenance?.weighting || !samples.length)
    throw new Error('Population and weighting are required');
  let total = 0;
  for (const sample of samples) {
    if (!sample.legal || !valid(sample.value) || !valid(sample.weight) || sample.weight === 0
      || !sample.configuration || contextKey(sample.context) !== key
      || !sameConditions(sample.conditions)) throw new Error('Invalid sample');
    total += sample.weight;
  }
  const sorted = [...samples].sort((a,b) => a.value - b.value);
  let cumulative = 0;
  const standard = sorted.find(sample => (cumulative += sample.weight) >= total / 2);
  const ideal = sorted.at(-1);
  return {key, specialty, conditions: {...CONDITIONS}, standard: standard.value,
    ideal: ideal.value, standardConfiguration: standard.configuration,
    idealConfiguration: ideal.configuration, provenance,
    idealScope: 'maximum within supplied population', rankBands: null};
}
// Cheap runtime path: lookup + ratios only. No ablation, enumeration or simulation.
export function simpleEvaluate(context, specialty, actual, reference) {
  const pending = reason => ({status: 'pending', reason, rank: null,
    standardIndex: null, idealPercent: null, type: null});
  if (!AXES.includes(specialty)) return pending('unsupported_specialty');
  if (!reference) return pending('reference_missing');
  if (reference.key !== contextKey(context) || reference.specialty !== specialty)
    return pending('reference_mismatch');
  if (!sameConditions(actual.conditions) || !sameConditions(reference.conditions))
    return pending('conditions_mismatch');
  const value = actual.values?.[specialty];
  if (!valid(value) || !valid(reference.standard) || reference.standard === 0
    || !valid(reference.ideal) || reference.ideal === 0) return pending('value_unavailable');
  if (reference.ideal < reference.standard || value > reference.ideal + 1e-9)
    return pending('reference_needs_review');
  const index = value / reference.standard * 100;
  const bands = reference.rankBands;
  let rank = null;
  if (bands) {
    if (!bands.length || bands.at(-1).min !== 0 || bands.some((band, i) =>
      !valid(band.min) || !band.rank || (i > 0 && bands[i - 1].min <= band.min)))
      throw new Error('Invalid rank bands');
    rank = bands.find(band => index >= band.min)?.rank ?? null;
  }
  return {status: 'ready', specialty, rank, standardIndex: index,
    standardDifferencePercent: index - 100,
    idealPercent: value / reference.ideal * 100,
    value, standard: reference.standard, ideal: reference.ideal,
    type: null, detailStatus: 'not_evaluated', key: reference.key};
}
