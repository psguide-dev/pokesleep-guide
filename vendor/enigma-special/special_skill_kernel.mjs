// PSN provisional special-skill kernel. No UI, storage mutations or game-exact claim.
// Tables supplied by the Enigma handoff; calculation assumptions are separate.
const clone = x => structuredClone(x);
const finite = (x, name, min=0) => { if (!Number.isFinite(x) || x<min) throw new Error(`invalid ${name}`); return x; };
const add = (map,key,value) => { map[key]=(map[key]??0)+value; };
export function createKernel(tables) {
  const skills = new Map(tables.skills.map(s=>[s.skillId,s]));
  const nativePartner = (team,id) => team.some(m=>m.id!==id && ['plus','minus'].includes(m.nativeSkillFamily));
  function row(skillId,level) {
    const s=skills.get(skillId); if (!s) return null;
    if (!Number.isInteger(level)||level<1) throw new Error('invalid skill level');
    return s.levels[Math.min(level,s.levels.length)-1];
  }
  function validate(team,state,casterId) {
    if (!Array.isArray(team)||team.length<1||team.length>5) throw new Error('team size 1..5 required');
    if(new Set(team.map(m=>m.id)).size!==team.length || team.some(m=>typeof m.id!=='string'||!m.id)) throw new Error('unique individual IDs required');
    for(const m of team) {
      if(!Array.isArray(m.types)||!Number.isInteger(m.nationalDex)||m.nationalDex<1) throw new Error('types and nationalDex required');
      finite(state.energy[m.id],'energy'); if(state.energy[m.id]>150) throw new Error('energy above 150');
      finite(m.recoveryFactor,'recoveryFactor');
      finite(m.berryEnergyBase,'berryEnergyBase'); finite(m.favoriteFactor,'favoriteFactor');
    }
    if(!team.some(m=>m.id===casterId)) throw new Error('caster outside team');
    finite(state.zonePP,'zonePP'); finite(state.pot,'pot');
    if(state.zonePP>24||state.pot>200) throw new Error('state above provisional cap');
  }
  function reward(){return {directEnergy:0,berryEnergy:0,berriesByDonor:{},ingredients:{},instantHelps:{},candyExpectedByMember:{},heldBerryEnergyTransferred:0};}
  function blank(state){return {probability:1,state:clone(state),reward:reward(),omitted:[],assumptions:[],actions:[],activationConsumed:true};}
  function heal(o,m,amount){
    const before=o.state.energy[m.id];
    o.state.energy[m.id]=Math.min(150,before+amount*m.recoveryFactor);
    if(o.state.energy[m.id]>before)o.actions.push({kind:'reset_decay_clock',individualId:m.id});
  }
  function berries(o,m,count,fb){
    add(o.reward.berriesByDonor,m.id,count);
    // Zone applies to Mago berries only. Host uses these same assumptions for normal berries.
    const zone=m.berryId==='mago'?o.state.zonePP/100:0;
    o.reward.berryEnergy+=count*m.berryEnergyBase*(1+zone)*(1+fb)*m.favoriteFactor;
  }
  function extraHelps(o,m,count){
    add(o.reward.instantHelps,m.id,count);
    if(!m.helpYield){o.omitted.push(`instant_help_yield:${m.id}`);return;}
    finite(m.helpYield.berries,'help berries');
    berries(o,m,m.helpYield.berries*count,o.fieldBonus);
    for(const [id,amount] of Object.entries(m.helpYield.ingredients??{})) add(o.reward.ingredients,id,finite(amount,'help ingredient')*count);
    // No recursively generated skill activations or EX ingredient bonus here.
  }
  function variants(base,sets,fn){
    if(!sets.length){base.omitted.push('no_eligible_targets');return [base];}
    return sets.map(targets=>{const o=clone(base);o.probability=1/sets.length;fn(o,targets);return o;});
  }
  function distinct(team,type){return Math.max(1,new Set(team.filter(m=>m.types.includes(type)).map(m=>m.nationalDex)).size);}
  function basicBurst(o,team,caster,self,other,fb){for(const m of team)berries(o,m,m.id===caster.id?self:other,fb);}
  function dispatch(input,depth=0){
    const {team,state,casterId,skillId,level,context={}}=input;
    validate(team,state,casterId);
    const fb=finite(context.fieldBonus??0,'fieldBonus');
    const caster=team.find(m=>m.id===casterId), r=row(skillId,level), o=blank(state);
    o.fieldBonus=fb;
    o.assumptions.push('provisional_tables','no_intermediate_rounding','unlimited_ingredient_bag');
    if(!r){o.omitted.push(`unsupported_skill:${skillId}`);return [o];}
    switch(skillId){
      case 'plus_ingredient_magnet_s': {
        const pool=[...new Set(context.obtainedIngredientIds??[])];
        if(pool.length)for(const id of pool)add(o.reward.ingredients,id,r.randomIngredientTotalBase/pool.length);
        else o.omitted.push('obtained_ingredient_pool_missing');
        if(nativePartner(team,casterId)){
          const id=caster.firstIngredientId, qty=r.additionalByFirstIngredient[id];
          if(qty===undefined)o.omitted.push('plus_additional_quantity_unknown');
          else add(o.reward.ingredients,id,qty);
        }
        o.assumptions.push('uniform_ingredient_expectation_not_actual_equal_distribution'); return [o];
      }
      case 'minus_cooking_power_up_s': {
        o.assumptions.push('at_200_block_whole_activation_retain_stock','uniform_other_targets');
        if(o.state.pot===200){o.activationConsumed=false; o.actions.push({kind:'retain_pending_activation',individualId:casterId});return [o];}
        o.state.pot=Math.min(200,o.state.pot+r.potIncrease);
        return nativePartner(team,casterId)?variants(o,team.filter(m=>m.id!==casterId).map(m=>[m]),(b,[m])=>heal(b,m,r.conditionalRecovery)):[o];
      }
      case 'psystrike_berry_zone': {
        const held=context.heldBerryEnergyAtPriorZone;
        if(held===undefined)o.omitted.push('held_berry_consumption_not_modelled');
        else o.reward.heldBerryEnergyTransferred=finite(held,'held berry energy');
        o.actions.push({kind:'consume_held_berries',useZonePP:state.zonePP,ledger:'transfer_only_do_not_double_add'});
        o.reward.directEnergy=r.directEnergy*(1+fb);
        o.state.zonePP=Math.min(24,o.state.zonePP+r.zoneIncreasePercentagePoints);
        o.assumptions.push('old_zone_for_held_berries','zone_cap_24'); return [o];
      }
      case 'stockpile_energy_charge_s': {
        const count=state.stockpile[casterId]??0;
        if(!Number.isInteger(count)||count<0||count>10)throw new Error('stockpile integer 0..10 required');
        const spit=clone(o);spit.probability=count===10?1:.25;
        spit.reward.directEnergy=r.spitEnergyByStoredCount[count]*(1+fb);spit.state.stockpile[casterId]=0;
        spit.assumptions.push('spit_probability_0.25_unverified');
        if(count===10)return [spit];
        const stock=clone(o);stock.probability=.75;stock.state.stockpile[casterId]=count+1;
        stock.assumptions.push('spit_probability_0.25_unverified');return [spit,stock];
      }
      case 'disguise_berry_burst': {
        const eligible=state.disguiseEligible[casterId]??true;
        if(typeof eligible!=='boolean')throw new Error('disguise eligibility must be boolean');
        basicBurst(o,team,caster,r.selfBerries,r.berriesPerOtherMember,fb);
        if(!eligible)return [o];
        const normal=clone(o);normal.probability=.8;
        const great=clone(o);great.probability=.2;great.state.disguiseEligible[casterId]=false;
        great.reward.berryEnergy*=3;
        for(const id in great.reward.berriesByDonor)great.reward.berriesByDonor[id]*=3;
        normal.assumptions.push('great_probability_0.2_unverified');great.assumptions.push('great_probability_0.2_unverified');return [normal,great];
      }
      case 'nightmare_energy_charge_m': {
        o.reward.directEnergy=r.directEnergy*(1+fb);
        for(const m of team)if(!m.types.includes('dark'))o.state.energy[m.id]=Math.max(0,o.state.energy[m.id]-12);
        o.assumptions.push('loss_fixed_12_no_nature');return [o];
      }
      case 'lunar_blessing_energy_for_everyone_s': {
        const n=distinct(team,'psychic');
        for(const m of team)heal(o,m,r.recoveryPerTeamMember);
        basicBurst(o,team,caster,r.selfBerriesByDistinctCount[n],r.berriesPerOtherMemberByDistinctCount[n],fb);
        o.assumptions.push('diversity_national_dex_not_form');return [o];
      }
      case 'draco_meteor_berry_burst': {
        const n=distinct(team,'dragon');
        const partner=caster.partnerEffectUnlocked===true&&team.some(m=>m.id!==casterId&&m.nationalDex===380);
        basicBurst(o,team,caster,r.selfBerriesByDistinctCount[n]+(partner?r.conditionalExtraSelfBerries:0),r.berriesPerOtherMemberByDistinctCount[n],fb);
        if(caster.partnerEffectUnlocked==null)o.omitted.push('latias_partner_unlock_unknown');
        o.assumptions.push('diversity_national_dex_not_form');return [o];
      }
      case 'healing_pulse_energy_cheer_s': {
        const pairs=[];for(let i=0;i<team.length;i++)for(let j=i+1;j<team.length;j++)pairs.push([team[i],team[j]]);
        if(team.length===1)pairs.push([team[0]]); // provisional reduced-team fallback
        const partner=caster.partnerEffectUnlocked===true&&team.some(m=>m.id!==casterId&&m.nationalDex===381);
        if(caster.partnerEffectUnlocked==null)o.omitted.push('latios_partner_unlock_unknown');
        o.assumptions.push('uniform_distinct_targets_include_caster','no_recursive_instant_skill','no_EX_ingredient_extra');
        return variants(o,pairs,(b,targets)=>{for(const m of targets){heal(b,m,r.recoveryPerTarget);extraHelps(b,m,r.instantHelpsPerTarget+(partner?r.conditionalAdditionalHelpsPerTarget:0));}});
      }
      case 'nuzzle_energy_cheer_s': {
        o.omitted.push('nuzzle_bonus_skill_not_added');o.assumptions.push('uniform_target_include_caster');
        return variants(o,team.map(m=>[m]),(b,[m])=>heal(b,m,r.recovery));
      }
      case 'almighty': {
        for(const m of team)add(o.reward.candyExpectedByMember,m.id,1/team.length);
        o.assumptions.push('base_candy_1_uniform_recipient');o.omitted.push('occasional_extra_candy_not_added');
        const selected=caster.selectedSkillId;
        if(!selected || selected==='almighty' || depth>=2){o.omitted.push('selected_skill_missing_or_recursion');return [o];}
        // Unknown ordinary skills are delegated to a pure host callback; never guessed.
        let results=skills.has(selected)?dispatch({...input,skillId:selected},depth+1):context.resolveSelectedEffect?.({...input,skillId:selected});
        if(!results){o.omitted.push(`selected_effect_adapter_missing:${selected}`);return [o];}
        return results.map(b=>{const out=clone(b);for(const [id,q] of Object.entries(o.reward.candyExpectedByMember))add(out.reward.candyExpectedByMember,id,q);out.omitted.push(...o.omitted);out.assumptions.push(...o.assumptions);return out;});
      }
    }
    throw new Error('missing handler');
  }
  return {activate:dispatch,skillIds:[...skills.keys()]};
}

export function initialState(team){return {energy:Object.fromEntries(team.map(m=>[m.id,m.initialEnergy??100])),pot:0,zonePP:0,stockpile:{},disguiseEligible:{},nuzzleBonus:{}};}
export function resetState(state,event,individualId){
  const s=clone(state);
  if(event==='field_move'){s.zonePP=0;s.nuzzleBonus={};}
  else if(event==='sleep_research'||event==='manual_sleep_registration'){
    s.disguiseEligible={};if(event==='sleep_research')s.nuzzleBonus={};
  }else if(event==='team_change')s.nuzzleBonus={};
  else if(event==='caster_removed'){delete s.stockpile[individualId];s.nuzzleBonus={};}
  else if(event==='cooking')s.pot=0;
  else throw new Error('unknown reset event');
  return s;
}
// Exact scenario enumerator: integer events, no fractional activation exponent.
// Advance/ordinaryEffect must be pure and return updated state + rewards.
// Do not replace a state distribution with its mean before nonlinear continuation.
export function runTimeline(kernel,{team,state,events,endSeconds,context={},advance,ordinaryEffect,maxBranches=50000}){
  finite(endSeconds,'endSeconds');
  const ids=new Set(team.map(m=>m.id));
  events.forEach(e=>{finite(e.at,'event time');if(e.at>endSeconds)throw new Error('event beyond end');if(e.kind==='skill'&&!ids.has(e.casterId))throw new Error('caster missing');});
  const ordered=events.map((e,i)=>({...e,index:i})).sort((a,b)=>a.at-b.at||a.index-b.index);
  let branches=[{probability:1,state:clone(state),totals:{directEnergy:0,berryEnergy:0,ingredients:{},berriesByDonor:{},instantHelps:{},candyExpectedByMember:{},heldBerryEnergyTransferred:0},omitted:[],assumptions:[],actions:[],time:0}];
  function merge(b,o){const x=clone(b);x.probability*=o.probability;x.state=clone(o.state);for(const [key,value] of Object.entries(o.reward)){if(typeof value==='number')x.totals[key]+=value;else for(const [id,q] of Object.entries(value))add(x.totals[key],id,q);}x.omitted.push(...o.omitted);x.assumptions.push(...o.assumptions);x.actions.push(...o.actions);if(x.state.nextDecayAt)for(const a of o.actions)if(a.kind==='reset_decay_clock')x.state.nextDecayAt[a.individualId]=x.time+600;return x;}
  for(const e of [...ordered,{at:endSeconds,kind:'end'}]){
    let next=[];
    for(let b of branches){
      if(advance&&e.at>b.time)b=merge(b,{probability:1,...advance({team,state:clone(b.state),from:b.time,to:e.at,context}),omitted:[],assumptions:[],actions:[]});
      b.time=e.at;
      if(e.kind==='end'){next.push(b);continue;}
      if(e.kind==='reset'){b.state=resetState(b.state,e.reset,e.individualId);next.push(b);continue;}
      const outcomes=e.kind==='skill'?kernel.activate({team,state:b.state,casterId:e.casterId,skillId:e.skillId,level:e.level,context}):ordinaryEffect?.({team,state:clone(b.state),event:e,context});
      if(!outcomes)throw new Error('ordinary event adapter required');
      const mass=outcomes.reduce((s,o)=>s+o.probability,0);if(Math.abs(mass-1)>1e-9||outcomes.some(o=>o.probability<0))throw new Error('invalid outcome probabilities');
      for(const o of outcomes)next.push(merge(b,o));
    }
    if(next.length>maxBranches)throw new Error('scenario branch budget exceeded: use per-trial sampling in host, never silently truncate');
    branches=next;
  }
  const totals={directEnergy:0,berryEnergy:0,ingredients:{},berriesByDonor:{},instantHelps:{},candyExpectedByMember:{},heldBerryEnergyTransferred:0};
  for(const b of branches)for(const [k,v] of Object.entries(b.totals)){if(typeof v==='number')totals[k]+=b.probability*v;else for(const [id,q] of Object.entries(v))add(totals[k],id,b.probability*q);}
  return {expected:totals,terminalBranches:branches,omitted:[...new Set(branches.flatMap(b=>b.omitted))],assumptions:[...new Set(branches.flatMap(b=>b.assumptions))],mode:'fixed_timeline_exact_branch_expectation'};
}

// Baseline handoff when only fractional mean activations are available.
// Interpolate adjacent integer counts as an explicit provisional distribution.
// This is NOT a measured distribution, and is not suitable for recovery/pot/zone timing.
export function provisionalCountDistribution(mean){finite(mean,'activation mean');const n=Math.floor(mean),f=mean-n;return f===0?[{count:n,probability:1}]:[{count:n,probability:1-f},{count:n+1,probability:f}];}
export function sampleOutcome(outcomes,uniform01){if(!(uniform01>=0&&uniform01<1))throw new Error('uniform01 must be 0..1 exclusive');let p=0;for(const o of outcomes){p+=o.probability;if(uniform01<p)return clone(o);}throw new Error('invalid outcome probability sum');}

// Bounded Monte Carlo for a supplied timeline. Dynamic activation scheduling still
// belongs to the host's frequency/stock simulator and may call activate/sampleOutcome.
export function runSampledTimeline(kernel,options,{trials=256,seed=20261005}={}){
  if(!Number.isInteger(trials)||trials<1||trials>10000||!Number.isInteger(seed))throw new Error('invalid trials/seed');
  let rng=seed>>>0;
  const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const choose=outcomes=>{const o=sampleOutcome(outcomes,random());o.probability=1;return [o];};
  const sampledKernel={activate:input=>choose(kernel.activate(input))};
  const wrappedOrdinary=options.ordinaryEffect?input=>choose(options.ordinaryEffect(input)):undefined;
  const totals={directEnergy:0,berryEnergy:0,ingredients:{},berriesByDonor:{},instantHelps:{},candyExpectedByMember:{},heldBerryEnergyTransferred:0};
  const omitted=new Set(),assumptions=new Set();
  for(let i=0;i<trials;i++){
    const result=runTimeline(sampledKernel,{...options,ordinaryEffect:wrappedOrdinary});
    for(const [k,v] of Object.entries(result.expected)){if(typeof v==='number')totals[k]+=v/trials;else for(const [id,q] of Object.entries(v))add(totals[k],id,q/trials);}
    result.omitted.forEach(x=>omitted.add(x));result.assumptions.forEach(x=>assumptions.add(x));
  }
  return {expected:totals,omitted:[...omitted],assumptions:[...assumptions],mode:'seeded_fixed_timeline_monte_carlo',trials,seed};
}

// String formatting uses exact decimal HALF_UP, avoiding binary toFixed ties.
// Prefer an original decimal string from decimal arithmetic for money-like exactness.
export function roundHalfUp(raw,places){
  if(!Number.isInteger(places)||places<0||places>8)throw new Error('invalid places');
  const literal=String(raw),scientific=literal.match(/^(-?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  let normalized=literal;
  if(scientific){
    const [,sign,whole,part='',exponent]=scientific,shift=Number(exponent);
    if(!Number.isSafeInteger(shift)||Math.abs(shift)>400)throw new Error('exponent out of range');
    const digits=whole+part,point=whole.length+shift;
    normalized=sign+(point<=0?'0.'+'0'.repeat(-point)+digits:point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point)+'.'+digits.slice(point));
  }
  const match=normalized.match(/^(-?)(\d+)(?:\.(\d*))?$/);if(!match)throw new Error('finite decimal required');
  const [,sign,whole,part='']=match, digits=part.padEnd(places+1,'0');
  let scaled=BigInt(whole+digits.slice(0,places));if(Number(digits[places])>=5)scaled++;
  const value=scaled.toString().padStart(places+1,'0'),out=places?value.slice(0,-places)+'.'+value.slice(-places):value;
  return (scaled!==0n?sign:'')+out;
}
