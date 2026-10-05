// Independent reference model. No dependencies or app-specific Box identifiers.
export const VERSION = 'box-daily-v1';
export const UNLOCKS = [10, 25, 50, 70, 80];
const natureRows = [
  ['がんばりや','さみしがり','いじっぱり','やんちゃ','ゆうかん'],
  ['ずぶとい','すなお','わんぱく','のうてんき','のんき'],
  ['ひかえめ','おっとり','てれや','うっかりや','れいせい'],
  ['おだやか','おとなしい','しんちょう','きまぐれ','なまいき'],
  ['おくびょう','せっかち','ようき','むじゃき','まじめ'],
];
export const NATURES = Object.fromEntries(natureRows.flatMap((row, up) => row.map((name, down) => [name, {
  time: up === down ? 1 : up === 0 ? .9 : down === 0 ? 1.075 : 1,
  recovery: up === down ? 1 : up === 1 ? 1.2 : down === 1 ? .88 : 1,
  ingredient: up === down ? 1 : up === 2 ? 1.2 : down === 2 ? .8 : 1,
  skill: up === down ? 1 : up === 3 ? 1.2 : down === 3 ? .8 : 1,
}])));
export const SUBSKILLS = {
  'おてつだいスピードS': {speed:.07}, 'おてつだいスピードM': {speed:.14},
  '食材確率アップS': {ingredient:.18}, '食材確率アップM': {ingredient:.36},
  'スキル確率アップS': {skill:.18}, 'スキル確率アップM': {skill:.36},
  '最大所持数アップS': {capacity:6}, '最大所持数アップM': {capacity:12},
  '最大所持数アップL': {capacity:18}, 'きのみの数S': {berry:1},
  'おてつだいボーナス': {helpingBonus:1}, 'げんき回復ボーナス': {sleepRecovery:true},
  'スキルレベルアップS': {}, 'スキルレベルアップM': {},
  '睡眠EXPボーナス': {}, 'ゆめのかけらボーナス': {}, 'リサーチEXPボーナス': {},
};
export class InputError extends Error {
  constructor(code, field) { super(`${code}: ${field}`); this.code=code; this.field=field; }
}
function requireInput(ok, field, code='needs_input') { if (!ok) throw new InputError(code,field); }
function finite(value, min, max) { return Number.isFinite(value) && value>=min && value<=max; }
export function ribbon(sleepHours, remainingEvolutions) {
  requireInput(finite(sleepHours,0,Infinity),'sleepHours');
  requireInput(Number.isInteger(remainingEvolutions) && remainingEvolutions>=0 && remainingEvolutions<=2,'remainingEvolutions');
  const capacity = sleepHours>=2000 ? 8 : sleepHours>=1000 ? 6 : sleepHours>=500 ? 3 : sleepHours>=200 ? 1 : 0;
  const time = sleepHours>=2000 ? [1,.88,.75][remainingEvolutions] : sleepHours>=500 ? [1,.95,.89][remainingEvolutions] : 1;
  return {capacity,time};
}
export function modifiers(species, individual, context={}) {
  const i=individual;
  requireInput(Number.isInteger(i.level) && i.level>=1 && i.level<=100,'level');
  requireInput(Object.hasOwn(NATURES,i.nature),'nature');
  requireInput(typeof i.mintNeutralized==='boolean','mintNeutralized');
  requireInput(Array.isArray(i.subskills) && i.subskills.length===5,'subskills[5]');
  const names=i.subskills.filter(x=>x!==null);
  requireInput(names.every(x=>Object.hasOwn(SUBSKILLS,x)) && new Set(names).size===names.length,'subskills','invalid_input');
  // null means explicitly no skill (reference/empty mythical slot); undefined is unknown.
  const active=i.subskills.filter((x,j)=>x!==null && i.level>=UNLOCKS[j]);
  const effects=active.map(x=>SUBSKILLS[x]);
  const sum=k=>effects.reduce((s,x)=>s+(typeof x[k]==='number'?x[k]:0),0);
  const nature=i.mintNeutralized ? NATURES['まじめ'] : NATURES[i.nature];
  const rib=ribbon(i.sleepHours,i.remainingEvolutions);
  const ownBonus=sum('helpingBonus');
  const teamBonus=context.teamHelpingBonusCount ?? ownBonus; // Includes the individual's bonus.
  requireInput(Number.isInteger(teamBonus) && teamBonus>=ownBonus && teamBonus<=5,'teamHelpingBonusCount','invalid_input');
  requireInput(finite(species['基準おてつだい時間秒'],1,Infinity),'species.baseSeconds');
  requireInput(Number.isInteger(species['初期最大所持数']) && species['初期最大所持数']>0,'species.capacity');
  requireInput(finite(species['食材確率推定pct'],0,100),'species.ingredientProbability');
  requireInput(Number.isInteger(species['きのみ個数']) && species['きのみ個数']>0,'species.berryCount');
  const base=species['基準おてつだい時間秒']*(1-.002*(i.level-1))*nature.time*rib.time;
  const individualSeconds=base*(1-Math.min(.35,sum('speed')));
  const teamSeconds=base*(1-Math.min(.35,sum('speed')+.05*teamBonus));
  const ingredientProbability=species['食材確率推定pct']/100*nature.ingredient*(1+sum('ingredient'));
  requireInput(ingredientProbability<=1,'ingredientProbability>1','unsupported');
  return {individualSeconds,teamSeconds,ingredientProbability,
    capacity:species['初期最大所持数']+rib.capacity+sum('capacity'),
    berryCount:species['きのみ個数']+sum('berry'), activeSubskills:active,
    nature,ribbon:rib,teamHelpingBonusCount:teamBonus,
    sleepRecoveryBonusActive:effects.some(x=>x.sleepRecovery),
    skillProbabilityMultiplier:nature.skill*(1+sum('skill'))};
}
export function selectSlots(species, level, configuration) {
  requireInput(typeof configuration==='string' && /^[ABC]{1,3}$/.test(configuration) && configuration[0]==='A','configuration','invalid_input');
  const levels=[1,30,60];
  requireInput(configuration.length>=levels.filter(x=>x<=level).length,'configuration');
  requireInput(Array.isArray(species['食材候補']),'species.ingredientCandidates');
  const slots=[];
  for(let j=0;j<configuration.length;j++) {
    const candidate=species['食材候補'].find(x=>x['候補']===configuration[j]);
    const count=candidate?.[`Lv${levels[j]}`];
    requireInput(Number.isInteger(count) && count>0,`configuration.slot${j+1}`,'unsupported');
    if(level>=levels[j]) slots.push({ingredient:candidate['食材'],count});
  }
  return slots;
}
export const BASELINE = Object.freeze({wakeEnergy:100, collectionHours:[0,3,6,9,12,15,15.5,24], recoveryEvents:[]});
// Recovery inputs are actual gains AFTER nature and other recovery modifiers.
// The caller supplies observed/assumed wake energy; no sleep-score inference.
export function countEvents(seconds, assumptions=BASELINE) {
  requireInput(finite(seconds,1,Infinity),'seconds','invalid_input');
  const {wakeEnergy,collectionHours,recoveryEvents}=assumptions;
  requireInput(finite(wakeEnergy,0,150),'wakeEnergy');
  requireInput(Array.isArray(collectionHours) && collectionHours.length>=2 && collectionHours[0]===0 && collectionHours.at(-1)===24 && collectionHours.every((h,j)=>finite(h,0,24) && (j===0 || h>collectionHours[j-1])),'collectionHours','invalid_input');
  requireInput(Array.isArray(recoveryEvents),'recoveryEvents');
  requireInput(recoveryEvents.every((r,j)=>finite(r.hour,0,24) && finite(r.actualGain,0,150) && (j===0 || r.hour>recoveryEvents[j-1].hour)),'recoveryEvents','invalid_input');
  const states=[{time:0,energy:wakeEnergy}];
  const energyAt=t=>{
    let state=states[0]; for(const s of states) if(s.time<=t+1e-8) state=s; else break;
    return Math.max(0,state.energy-Math.floor((t-state.time+1e-8)/600));
  };
  for(const r of recoveryEvents) {
    const time=r.hour*3600;
    states.push({time,energy:Math.min(150,energyAt(time)+r.actualGain)});
  }
  const counts=Array(collectionHours.length-1).fill(0); let t=0, interval=0;
  while(true) {
    const e=energyAt(t), mult=e>80?.45:e>60?.52:e>40?.58:e>1?.66:1;
    t+=seconds*mult;
    if(t>86400+1e-8) break;
    while(interval<counts.length-1 && t>collectionHours[interval+1]*3600+1e-8) interval++;
    counts[interval]++;
  }
  return counts;
}
export function expectedYield(probability,counts,capacity,berryCount,slots) {
  requireInput(finite(probability,0,1),'probability','invalid_input');
  requireInput(Number.isInteger(capacity) && capacity>0 && capacity<=10000,'capacity','invalid_input');
  requireInput(Number.isInteger(berryCount) && berryCount>0,'berryCount','invalid_input');
  requireInput(Array.isArray(counts) && counts.every(n=>Number.isInteger(n)&&n>=0),'counts','invalid_input');
  requireInput(Array.isArray(slots) && slots.length>0 && slots.every(s=>typeof s.ingredient==='string' && Number.isInteger(s.count)&&s.count>0),'slots','invalid_input');
  const outcomes=[{p:1-probability,q:berryCount},...slots.map(s=>({p:probability/slots.length,q:s.count,i:s.ingredient}))];
  const actual={},noCapacityLoss={},cache=new Map();
  for(const s of slots) { actual[s.ingredient]=0; noCapacityLoss[s.ingredient]=(noCapacityLoss[s.ingredient]??0)+counts.reduce((a,b)=>a+b,0)*probability/slots.length*s.count; }
  for(const n of counts) {
    if(!cache.has(n)) {
      let d=new Float64Array(capacity+1); d[0]=1; const gains={};
      for(let step=0;step<n;step++) {
        const next=new Float64Array(capacity+1);
        for(let held=0;held<=capacity;held++) {
          if(d[held]===0) continue;
          if(held===capacity) {next[capacity]+=d[held];continue;}
          for(const o of outcomes) {
            const taken=Math.min(o.q,capacity-held),mass=d[held]*o.p;
            next[held+taken]+=mass;
            if(o.i!==undefined) gains[o.i]=(gains[o.i]??0)+mass*taken;
          }
        }
        d=next;
      }
      cache.set(n,gains);
    }
    for(const [i,v] of Object.entries(cache.get(n))) actual[i]=(actual[i]??0)+v;
  }
  return {actual,noCapacityLoss};
}
export function calculateIndividual(species, individual, context={}, assumptions=BASELINE) {
  try {
    requireInput(species!==null && typeof species==='object','species');
    requireInput(individual!==null && typeof individual==='object','individual');
    requireInput(context!==null && typeof context==='object','context');
    requireInput(assumptions!==null && typeof assumptions==='object','assumptions');
    // These species need a separate state adapter; do not guess their layouts.
    requireInput(!['ミュウ','ダークライ'].includes(species['名前']),'mythicalIndividualState','unsupported');
    const m=modifiers(species,individual,context);
    const slots=selectSlots(species,individual.level,individual.configuration);
    const counts=countEvents(m.teamSeconds,assumptions);
    const yields=expectedYield(m.ingredientProbability,counts,m.capacity,m.berryCount,slots);
    return {status:'estimated',version:VERSION,speciesId:species.id,modifiers:m,slots,intervalHelpCounts:counts,
      helpCount:counts.reduce((a,b)=>a+b,0),ingredientsPerDay:yields.actual,noCapacityLossPerDay:yields.noCapacityLoss,
      assumptions,limitations:['通常おてつだいのみ','24時間合計・食事時点の成立保証なし','げんき0〜1は低速側','日境界の周期・待機キュー・ランダム周期は未再現','スキル発動回数・エナジーは未計算']};
  } catch(error) {
    if(error instanceof InputError) return {status:error.code,field:error.field,version:VERSION,ingredientsPerDay:null};
    throw error;
  }
}
