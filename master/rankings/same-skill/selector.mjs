export function selectSkillRanking(data, {scenario = data.defaultScenario, skillId, scope = data.defaultScope} = {}) {
  if (!Object.hasOwn(data.scenarios, scenario)) throw new RangeError('Unknown scenario');
  if (!['all','skillSpecialists'].includes(scope)) throw new RangeError('Unknown scope');
  const group = data.groups.find(g => g.scenario === scenario && g.skillId === skillId);
  if (!group) throw new RangeError('Unknown skill');
  return {scenario, skillId, scope, conditions: data.scenarios[scenario].conditions, unit: data.unit,
    entries: group[scope], totalCandidates: scope === 'all' ? group.allCount : group.specialistCount,
    emptyMessage: group[scope].length ? null : 'この条件の対象はいません'};
}
// 未丸め値で競技順位を決め、5位の同点を全件保持。表示値からは順位を作らない。
export function rankTopFive(rows) {
  if (rows.some(r => !Number.isFinite(r.skillTriggersPerDay))) throw new TypeError('Missing trigger estimate');
  const sorted = [...rows].sort((a,b) => b.skillTriggersPerDay-a.skillTriggersPerDay);
  let previous, rank;
  return sorted.map((row,i) => {
    if (i === 0 || row.skillTriggersPerDay !== previous) rank = i + 1;
    previous = row.skillTriggersPerDay;
    return {...row, rank};
  }).filter(row => row.rank <= 5);
}
