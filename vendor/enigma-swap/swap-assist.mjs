import {modifiers,selectSlots,InputError,countEvents,BASELINE} from './daily-supply.mjs';
export const VERSION='swap-assist-v1';
const EPS=1e-8;
const need=(ok,field,code='needs_input')=>{if(!ok)throw new InputError(code,field);};
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const add=(to,from)=>{for(const [k,v]of Object.entries(from))to[k]=(to[k]??0)+v;};
const emptyDist=cap=>{const d=new Float64Array(cap+1);d[0]=1;return d;};
const mult=e=>e>80?.45:e>60?.52:e>40?.58:e>1?.66:1;
export function recipeDemand(recipe,meals=3){
  need(Number.isInteger(meals)&&meals>0,'meals','invalid_input');
  need(Array.isArray(recipe?.['必要食材'])&&recipe['必要食材'].length>0,'recipe');
  const result={};for(const x of recipe['必要食材']){
    need(typeof x['食材']==='string'&&Number.isInteger(x['個数'])&&x['個数']>0,'recipe.ingredients','invalid_input');
    result[x['食材']]=(result[x['食材']]??0)+x['個数']*meals;
  }return result;
}
// Ordinary fields only: fieldBonusFraction=.60 means +60%, favoriteMultiplier=2 means favorite.
export function berryUnitEnergy(species,level,{fieldBonusFraction,favoriteMultiplier,berryZoneFraction=0}){
  need(finite(species?.['きのみ基礎エナジー'],1,Infinity),'berryBase');
  need(Number.isInteger(level)&&level>=1&&level<=100,'level','invalid_input');
  need(finite(fieldBonusFraction,0,Infinity)&&[1,2].includes(favoriteMultiplier)&&finite(berryZoneFraction,0,Infinity),'berryEnvironment','invalid_input');
  const base=Math.max(species['きのみ基礎エナジー']+level-1,species['きのみ基礎エナジー']*1.025**(level-1));
  return base*(1+fieldBonusFraction)*(1+berryZoneFraction)*favoriteMultiplier;
}
function prepare(request,solo=false){
  need(request&&typeof request==='object','request');
  const {members,teamIds,collectionHours,demand}=request;
  need(Array.isArray(members)&&members.length>=(solo?1:5),'members');
  need(members.every(m=>typeof m?.boxId==='string'&&m.boxId.length>0)&&new Set(members.map(m=>m.boxId)).size===members.length,'boxId','invalid_input');
  need(Array.isArray(teamIds)&&teamIds.length===(solo?1:5)&&new Set(teamIds).size===teamIds.length,'teamIds[5]','invalid_input');
  // Reuse the previous module's validation for clock/collection assumptions.
  countEvents(86400,{wakeEnergy:0,collectionHours,recoveryEvents:[]});
  need(demand&&typeof demand==='object'&&!Array.isArray(demand)&&Object.keys(demand).length>0&&Object.values(demand).every(v=>finite(v,0,Infinity)),'demand','invalid_input');
  const map=new Map(members.map(m=>[m.boxId,m]));
  need(teamIds.every(id=>map.has(id)),'teamIds.members','invalid_input');
  return {map};
}
function stateFor(member){
  need(member?.species&&member.individual,'member');
  need(!['ミュウ','ダークライ'].includes(member.species['名前']),'mythicalIndividualState','unsupported');
  const m=modifiers(member.species,member.individual);
  need(finite(member.initialEnergy,0,150),`${member.boxId}.initialEnergy`);
  need(Array.isArray(member.recoveryEvents),`${member.boxId}.recoveryEvents`);
  need(member.recoveryEvents.every((r,j)=>finite(r?.hour,0,24)&&finite(r.actualGain,0,150)&&(j===0||r.hour>member.recoveryEvents[j-1].hour)),`${member.boxId}.recoveryEvents`,'invalid_input');
  need(member.berryEnergyPerUnit===null||finite(member.berryEnergyPerUnit,0,Infinity),`${member.boxId}.berryEnergyPerUnit`);
  return {member,m,slots:selectSlots(member.species,member.individual.level,member.individual.configuration),
    energy:member.initialEnergy,anchor:0,active:false,nextHelp:Infinity,held:emptyDist(m.capacity),
    ingredients:{},berries:0,helps:0,activeHours:0,enteredAt:null};
}
function energyAt(s,hour){return s.active?Math.max(0,s.energy-Math.floor(((hour-s.anchor)*3600+EPS)/600)):s.energy;}
function help(s){
  const {capacity:cap,berryCount:berry,ingredientProbability:p}=s.m;
  const next=new Float64Array(cap+1);
  for(let held=0;held<=cap;held++){
    const mass=s.held[held];if(!mass)continue;
    if(held===cap){next[cap]+=mass;s.berries+=mass*berry;continue;}
    // Normal berry overflow is fed; a full inventory draws berries only.
    next[Math.min(cap,held+berry)]+=mass*(1-p);s.berries+=mass*(1-p)*berry;
    for(const slot of s.slots){
      const probability=mass*p/s.slots.length,taken=Math.min(slot.count,cap-held);
      next[held+taken]+=probability;s.ingredients[slot.ingredient]=(s.ingredients[slot.ingredient]??0)+probability*taken;
    }
  }s.held=next;s.helps++;
}
function assess(demand,supply){
  return Object.fromEntries(Object.entries(demand).map(([i,qty])=>[i,{required:qty,expected:supply[i]??0,
    deficit:Math.max(0,qty-(supply[i]??0)),surplus:Math.max(0,(supply[i]??0)-qty)}]));
}
function run(request,swap,{timeline=false,solo=false}={}){
  const {map}=prepare(request,solo);
  if(swap){
    need(request.teamIds.includes(swap.outId)&&map.has(swap.inId)&&!request.teamIds.includes(swap.inId),'swap.members','invalid_input');
    need(finite(swap.startHour,0,24)&&finite(swap.endHour,0,24)&&swap.endHour>swap.startHour,'swap.hours','invalid_input');
  }
  const ids=[...request.teamIds,...(swap?[swap.inId]:[])];
  const states=new Map(ids.map(id=>[id,stateFor(map.get(id))]));
  for(const s of states.values())s.collected={};
  const snapshots=[];
  let active=[...request.teamIds];
  const actions=[];
  for(const hour of request.collectionHours)actions.push({hour,type:'collect'});
  for(const s of states.values())for(const r of s.member.recoveryEvents)actions.push({hour:r.hour,type:'recover',id:s.member.boxId,gain:r.actualGain});
  if(swap)actions.push({hour:swap.startHour,type:'swapIn'},{hour:swap.endHour,type:'swapOut'});
  actions.sort((a,b)=>a.hour-b.hour);
  for(const id of active){const s=states.get(id);s.active=true;s.enteredAt=0;}
  let actionIndex=0;const teamHistory=[];
  function schedule(hour){
    const bonus=active.filter(id=>states.get(id).m.activeSubskills.includes('おてつだいボーナス')).length;
    for(const id of active){
      const s=states.get(id);
      s.m=modifiers(s.member.species,s.member.individual,{teamHelpingBonusCount:bonus});
      if(s.nextHelp===Infinity)s.nextHelp=hour+s.m.teamSeconds*mult(energyAt(s,hour))/3600;
    }
    if(!teamHistory.length||teamHistory.at(-1).count!==bonus)teamHistory.push({hour,count:bonus});
  }
  // Starting at 0 allows recovery and a swap at 0 BEFORE the first cycle starts.
  while(true){
    const nextAction=actions[actionIndex]?.hour??Infinity;
    const nextHelp=Math.min(...active.map(id=>states.get(id).nextHelp));
    const hour=Math.min(nextAction,nextHelp);
    if(!Number.isFinite(hour)||hour>24+EPS)break;
    const current=[];
    while(actionIndex<actions.length&&Math.abs(actions[actionIndex].hour-hour)<EPS)current.push(actions[actionIndex++]);
    for(const a of current.filter(a=>a.type==='recover')){
      const s=states.get(a.id);if(!s.active)continue;
      s.energy=Math.min(150,energyAt(s,hour)+a.gain);s.anchor=hour;
    }
    // Helps ending exactly at a collection/swap time are credited before collection.
    for(const id of active){const s=states.get(id);if(Math.abs(s.nextHelp-hour)<EPS){help(s);s.nextHelp=Infinity;}}
    if(current.some(a=>a.type==='collect'))for(const id of active){const s=states.get(id);s.collected={...s.ingredients};s.held=emptyDist(s.m.capacity);}
    for(const a of current.filter(a=>a.type==='swapIn'||a.type==='swapOut')){
      const out=a.type==='swapIn'?swap.outId:swap.inId,inId=a.type==='swapIn'?swap.inId:swap.outId;
      const leaving=states.get(out),joining=states.get(inId);
      leaving.energy=energyAt(leaving,hour);leaving.anchor=hour;leaving.activeHours+=hour-leaving.enteredAt;
      leaving.active=false;leaving.enteredAt=null;leaving.nextHelp=Infinity;
      leaving.held=emptyDist(leaving.m.capacity); // Collect outgoing only; the other four retain inventory.
      leaving.collected={...leaving.ingredients};
      joining.active=true;joining.anchor=hour;joining.enteredAt=hour;joining.nextHelp=Infinity;
      active=active.map(id=>id===out?inId:id);
    }
    if(timeline&&current.some(a=>['collect','swapIn','swapOut'].includes(a.type))){
      const collected={};for(const s of states.values())add(collected,s.collected);
      snapshots.push({hour,ingredients:collected});
    }
    schedule(hour);
  }
  const ingredients={},byMember=[];let berryEnergy=0,knownBerry=true;
  for(const s of states.values()){
    if(s.active)s.activeHours+=24-s.enteredAt;
    add(ingredients,s.ingredients);
    const energy=s.member.berryEnergyPerUnit===null?null:s.berries*s.member.berryEnergyPerUnit;
    if(energy===null&&s.helps>0)knownBerry=false;else berryEnergy+=energy??0;
    byMember.push({boxId:s.member.boxId,speciesId:s.member.species.id,name:s.member.species['名前'],
      activeHours:s.activeHours,helpCount:s.helps,ingredients:s.ingredients,berryCount:s.berries,berryEnergy:energy,
      finalEnergy:energyAt(s,24)});
  }
  const requirements=assess(request.demand,ingredients);
  return {status:'estimated',ingredients,requirements,feasible:Object.values(requirements).every(x=>x.deficit<=1e-7),
    berryEnergy:knownBerry?berryEnergy:null,byMember,teamHelpingBonusHistory:teamHistory,...(timeline?{snapshots}:{})};
}
function safe(fn){try{return fn();}catch(e){if(e instanceof InputError)return {status:e.code,field:e.field};throw e;}}
export function simulateTeam(request){return safe(()=>run(request,null));}
function mealTimes(request,result){
  const foods={};
  for(const [name,required]of Object.entries(request.demand)){
    const reached=result.snapshots.find(s=>(s.ingredients[name]??0)+1e-7>=required);
    const expected=result.ingredients[name]??0;
    foods[name]={required,expected,hour:reached?.hour??null,status:reached?'ready':expected>0?'over_day':'no_provider'};
  }
  return {foods,hour:Object.values(foods).every(f=>f.hour!==null)?Math.max(...Object.values(foods).map(f=>f.hour)):null};
}
export function mealTiming(request,swap=null){return safe(()=>{const result=run(request,swap,{timeline:true});return {...result,timing:mealTimes(request,result)}})}
// App extension: improve one bottleneck without requiring every food to be ready.
export async function findMealOptionsAsync(request,{candidateIds,focus,startHour=0,endHour=16,stepHours=.5,maxEvaluations=1500,maxResults=5},{signal,onProgress=()=>{},yieldToUI=()=>new Promise(r=>setTimeout(r,0))}={}){
 return await (async()=>{try{
  const baseline=run(request,null,{timeline:true}),timing=mealTimes(request,baseline);
  need(Object.hasOwn(request.demand,focus),'focus','invalid_input');
  need(Array.isArray(candidateIds)&&new Set(candidateIds).size===candidateIds.length,'candidateIds','invalid_input');
  need(finite(startHour,0,24)&&finite(endHour,0,24)&&endHour>startHour&&finite(stepHours,1/60,24)&&Number.isInteger(maxEvaluations)&&maxEvaluations>0,'searchGrid','invalid_input');
  const options=[],rejected=[];let tested=0,complete=true;
  search:for(const inId of candidateIds){
   const member=request.members.find(m=>m.boxId===inId);
   const ready=safe(()=>{need(member&&!request.teamIds.includes(inId),'candidateIds.members','invalid_input');stateFor(member);return {status:'ready'}});
   if(ready.status!=='ready'){rejected.push({inId,...ready});continue}
   for(const outId of request.teamIds){
    let best=null;
    const finishes=[];for(let h=startHour+stepHours;h<endHour-EPS;h+=stepHours)finishes.push(h);finishes.push(endHour);
    for(const end of finishes){
     if(signal?.aborted)return {status:'cancelled'};
     if(tested>=maxEvaluations){complete=false;if(best)options.push(best);break search}
     const swap={outId,inId,startHour,endHour:end,durationHours:end-startHour};
     const alternative=run(request,swap,{timeline:true}),after=mealTimes(request,alternative);tested++;
     const beforeFood=timing.foods[focus],afterFood=after.foods[focus];
     const faster=(afterFood.hour??Infinity)<(beforeFood.hour??Infinity);
     const partial=beforeFood.hour===null&&afterFood.hour===null&&afterFood.expected>beforeFood.expected+1e-7;
     if(faster||partial){
      const option={...swap,timing:after,ingredients:alternative.ingredients,energy:energyDifference(baseline,alternative),partial};
      const rank=x=>[x.timing.foods[focus].hour??Infinity,x.timing.hour??Infinity,x.partial?-x.timing.foods[focus].expected:x.durationHours,x.partial?x.durationHours:-x.timing.foods[focus].expected];
      const better=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++){if(x[i]<y[i])return true;if(x[i]>y[i])return false}return false};
      if(!best||better(option,best))best=option;
     }
     if(tested%10===0){onProgress({tested,found:options.length+(best?1:0)});await yieldToUI()}
    }
    if(best)options.push(best);
   }
  }
  options.sort((a,b)=>(a.timing.foods[focus].hour??Infinity)-(b.timing.foods[focus].hour??Infinity)||(a.timing.hour??Infinity)-(b.timing.hour??Infinity)||b.timing.foods[focus].expected-a.timing.foods[focus].expected||a.durationHours-b.durationHours||a.outId.localeCompare(b.outId));
  return {status:'estimated',baseline:{...baseline,timing},options:options.slice(0,maxResults),tested,searchComplete:complete,rejected};
 }catch(e){if(e instanceof InputError)return {status:e.code,field:e.field};throw e}})();
}
export function energyDifference(baseline,alternative,skillEstimates=null){
  const berryDelta=baseline.berryEnergy===null||alternative.berryEnergy===null?null:alternative.berryEnergy-baseline.berryEnergy;
  let skillDelta=null;
  if(skillEstimates!==null){
    need([skillEstimates.baseline,skillEstimates.alternative].every(x=>finite(x?.directEnergy,0,Infinity)&&typeof x.source==='string'&&x.source.length>0),'skillEstimates','invalid_input');
    skillDelta=skillEstimates.alternative.directEnergy-skillEstimates.baseline.directEnergy;
  }
  return {sign:'交代あり − 交代なし',berryDelta,skillDelta,
    scope:'通常きのみ収集＋外部入力の直接スキルエナジー。間接スキル効果は含まない。',
    nonCookingDelta:berryDelta===null||skillDelta===null?null:berryDelta+skillDelta,
    skillStatus:skillDelta===null?'needs_skill_estimate':'provided',skillEstimates,
    cookingDelta:null,netIncludingCooking:null};
}
export function evaluateSwap(request,swap,{skillEstimates=null}={}){
  return safe(()=>{
    const baseline=run(request,null),alternative=run(request,swap);
    const ingredientDelta={};for(const i of new Set([...Object.keys(baseline.ingredients),...Object.keys(alternative.ingredients)]))ingredientDelta[i]=(alternative.ingredients[i]??0)-(baseline.ingredients[i]??0);
    return {status:'estimated',version:VERSION,swap:{...swap,durationHours:swap.endHour-swap.startHour},
      baseline,alternative,ingredientDelta,energy:energyDifference(baseline,alternative,skillEstimates),
      assumptions:{collectionHours:request.collectionHours,stock:'参照しない',boxEnergyDecay:false,
        outgoingCollectedAtSwap:true,initialInventory:'全個体空',pendingCycle:'残る4匹は進行中周期を保持、再加入は新周期'},
      limitations:['24時間合計の期待値、食事時点の成立保証なし','通常おてつだいのみ・ランダム周期と待機キューは未再現','同一日中の1枠1往復交代だけ','回復は明示入力、待機中の回復イベントは適用しない','代替料理・料理増分・総合損得は推測しない']};
  });
}
function* searchOptions(request,{candidateIds,startHours=[0],stepHours=.5,endHour=15.5,maxResults=5,maxEvaluations=5000}={}){
    const baseline=run(request,null);
    need(Array.isArray(candidateIds)&&new Set(candidateIds).size===candidateIds.length,'candidateIds','invalid_input');
    need(Array.isArray(startHours)&&startHours.length>0&&startHours.every(h=>finite(h,0,endHour)&&h<endHour),'startHours','invalid_input');
    need(finite(stepHours,1/60,24)&&finite(endHour,0,24)&&Number.isInteger(maxResults)&&maxResults>=1&&Number.isInteger(maxEvaluations)&&maxEvaluations>=1,'searchGrid','invalid_input');
    if(baseline.feasible)return {status:'already_sufficient',version:VERSION,baseline,options:[],tested:0};
    const options=[],rejected=[];let tested=0,searchComplete=true;
    search: for(const inId of candidateIds){
      const member=request.members.find(m=>m.boxId===inId);
      const ready=safe(()=>{need(member&&!request.teamIds.includes(inId),'candidateIds.members','invalid_input');stateFor(member);return {status:'ready'};});
      if(ready.status!=='ready'){rejected.push({inId,...ready});continue;}
      for(const outId of request.teamIds)for(const startHour of startHours){
        const ends=[];for(let h=startHour+stepHours;h<endHour-EPS;h+=stepHours)ends.push(h);ends.push(endHour);
        // Scan, never binary-search: replacing a provider can make another ingredient worse.
        for(const finish of ends){
          if(tested>=maxEvaluations){searchComplete=false;break search;}
          const alternative=run(request,{outId,inId,startHour,endHour:finish});tested++;
          yield {tested,found:options.length};
          if(alternative.feasible){options.push({outId,inId,startHour,endHour:finish,durationHours:finish-startHour,
            requirements:alternative.requirements,energy:energyDifference(baseline,alternative),
            ingredients:alternative.ingredients,teamHelpingBonusHistory:alternative.teamHelpingBonusHistory});break;}
        }
      }
    }
    options.sort((a,b)=>a.durationHours-b.durationHours||(b.energy.berryDelta??-Infinity)-(a.energy.berryDelta??-Infinity)||a.startHour-b.startHour||a.outId.localeCompare(b.outId)||a.inId.localeCompare(b.inId));
    return {status:options.length?(searchComplete?'estimated_options':'estimated_partial_options'):(searchComplete?'no_option_on_grid':'search_limit_reached'),version:VERSION,baseline,options:options.slice(0,maxResults),
      tested,rejected,searchComplete,grid:{startHours,stepHours,endHour,maxEvaluations},feasibleOptions:options.length,
      searchScope:'入力候補・開始時刻・時間刻み内の1枠1往復。見つからない場合も多枠交代や別時刻の不可能とは断定しない。',
      displayNote:'約○時間で3食分を補える見込み。1日合計の予測で、食事の時刻にそろう保証はありません。'};
}
export function findSwapOptions(request,options){
  return safe(()=>{const iterator=searchOptions(request,options);let step;do{step=iterator.next();}while(!step.done);return step.value;});
}
// Use the async entry in mobile UI to yield between batches and permit cancellation.
export async function findSwapOptionsAsync(request,options,{batchSize=25,onProgress=()=>{},signal,yieldToUI=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
  try{
    need(Number.isInteger(batchSize)&&batchSize>=1,'batchSize','invalid_input');
    const iterator=searchOptions(request,options);let count=0;
    while(true){
      if(signal?.aborted){iterator.return();return {status:'cancelled',version:VERSION};}
      const step=iterator.next();if(step.done)return step.value;
      if(++count%batchSize===0){onProgress(step.value);await yieldToUI();}
    }
  }catch(e){if(e instanceof InputError)return {status:e.code,field:e.field};throw e;}
}

// Independent reserve estimate: no outgoing member or other-team bonuses assumed.
export function supplementTiming(member,collectionHours,demand){return safe(()=>{
 const request={members:[member],teamIds:[member.boxId],collectionHours,demand};
 const result=run(request,null,{timeline:true,solo:true});
 return {...result,timing:mealTimes(request,result)};
});}
