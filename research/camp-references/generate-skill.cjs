// Offline only: finite, equal-weight design population. Never a capture probability.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createRuntime}=require(require('node:path').join(require('node:path').resolve(process.argv[2]),'tests/skill_model_runtime.cjs'));
const {catalog,ctx,commit}=createRuntime(process.argv[2]);
ctx.teamGoodCamp=false;
const output=process.argv[3],names=catalog.subskills.map(s=>s.name),natures=catalog.natures.rows.flat(),levels=[50,60,70,80];
const key=p=>ctx.window.PS_SPECIES_CATALOG.key(p);
function layouts(count){const rows=[];function visit(start,row){if(row.length===count){rows.push([...row,...names.filter(n=>!row.includes(n)).slice(0,5-count)]);return}for(let i=start;i<=names.length-count+row.length;i++)visit(i+1,[...row,names[i]])}visit(0,[]);return rows}
const layoutsByLevel=Object.fromEntries(levels.map(l=>[l,layouts([10,25,50,70,80].filter(x=>x<=l).length)]));
function patterns(p,l){let rows=[{}];for(const s of p.ingredientSlots.filter(s=>s.unlock<=l))rows=rows.flatMap(r=>s.candidates.map(c=>({...r,[s.unlock]:c.name})));return rows}
function compact(rows,total){
 const bins=[];let used=0;
 for(const [value,freq] of rows){let remaining=freq;while(remaining){const f=used/total,limit=f<.95?.95:f<.99?.99:f<.999?.999:1,width=f<.95?Math.ceil(total/256):f<.99?Math.ceil(total/2048):f<.999?Math.ceil(total/20000):1,cap=Math.min(width,Math.max(1,Math.ceil(limit*total)-used));let b=bins.at(-1);if(!b||b[3]!==cap||b[2]>=cap){b=[value,value,0,cap];bins.push(b)}const take=Math.min(remaining,cap-b[2]);b[1]=value;b[2]+=take;remaining-=take;used+=take}}
 const merged=[];for(const b of bins){const last=merged.at(-1);if(last&&last[0]===b[0]&&last[1]===b[1])last[2]+=b[2];else merged.push(b.slice(0,3))}return merged;
}
const data={version:2,engineCommit:process.env.PSN_REFERENCE_COMMIT||commit,axis:'skillTriggers',conditions:{ticket:false,collectionHours:4,awakeHours:16,sleepHours:8,startEnergy:100,meals:3,ribbonHours:0,externalSupport:false,fieldBonus:false,favoriteBonus:false,exBonus:false,eventBonus:false},population:'25 natures x distinct active subskill combinations x all unlocked ingredient patterns; equal design weights, not capture rates',model:'one-member shared daily engine; default skill level = evolution stage +1; stock limit2; skill potency and team contribution not scored',species:{},entries:{},unsupported:[],checks:0,combinations:0};
const selection=process.argv[4];
const species=[...new Map(ctx.window.PS_SPECIES_CATALOG.all().filter(p=>p.specialty==='スキル'&&key(p)===selection).map(p=>[key(p),p])).values()];
for(const p of species){
 const natureRestrictions=Object.values(JSON.parse(fs.readFileSync(require('node:path').join(process.argv[2],'master/pokemon/0848/data.json'))).evolutionTransitions||[]).find(e=>e.targetSpeciesId===key(p))?.allowedNatures;
 const effectiveNatures=natureRestrictions?natures.filter(n=>natureRestrictions.includes(n)):natures;

 if(p.boxEligible===false||p.mythicalSettings||!Number.isFinite(p.skillRate)||!Number.isFinite(p.help)||!Number.isFinite(p.carry)||!catalog.skills[p.mainSkillId]){data.unsupported.push({species:key(p),name:p.name,reason:'complete ordinary individual inputs required'});continue}
 const skillLevel=Math.min(1+ctx.speciesEvolutionStage(p),catalog.skills[p.mainSkillId].maxLevel||1);
 data.species[key(p)]={no:p.no,name:p.name,defaultSkillLevel:skillLevel,...(natureRestrictions?{allowedNatures:natureRestrictions}:{}),effectType:catalog.skills[p.mainSkillId].effectType,modelNote:catalog.skills[p.mainSkillId].effectType==='moonlight_energy_recovery'?'自身への基本回復を反映。大成功時の追加回復は未反映です。':catalog.skills[p.mainSkillId].effectType==='random_main_skill'?'効果抽選による回復・おてつだい変化を含めない発動回数モデルです。':''};
 for(const level of levels){
  const frequencies=new Map(),cache=new Map(),foodPatterns=patterns(p,level);let ideal=-Infinity,idealRecord=null,count=0;
  const states=new Map();for(const nature of effectiveNatures)for(const subskills of layoutsByLevel[level]){const stats=ctx.individualCorrections({no:p.no,speciesId:key(p),level,ribbonHours:0,nature,subskills},p,subskills.slice(0,[10,25,50,70,80].filter(l=>l<=level).length).includes('おてつだいボーナス')?.05:0),signature=JSON.stringify([stats.speed,stats.carry,stats.food,stats.skill,stats.berryQty,stats.energyFactor]);const old=states.get(signature);if(old)old.weight++;else states.set(signature,{nature,subskills,stats,weight:1})}
  for(const ingredients of foodPatterns)for(const {nature,subskills,stats,weight} of states.values()){ 
   const item={id:'reference',no:p.no,...(p.speciesId?{speciesId:p.speciesId}:{}),level,skillLevel,ribbonHours:0,ingredients,nature,subskills};
   
   const qty=p.ingredientSlots.filter(s=>s.unlock<=level).map(s=>s.candidates.find(c=>c.name===ingredients[s.unlock]).qty);
   const cacheKey=JSON.stringify([stats.speed,stats.carry,stats.food,stats.skill,stats.berryQty,stats.energyFactor,qty]);
   let value=cache.get(cacheKey);if(value===undefined){const snap=ctx.calculateIndividualTrial(item);assert(!snap.reasons,JSON.stringify(snap.reasons));value=snap.values.skill;assert(Number.isFinite(value)&&value>=0&&value<=10);cache.set(cacheKey,value)}
   frequencies.set(value,(frequencies.get(value)||0)+weight);count+=weight;
   if(value>ideal){ideal=value;idealRecord={nature,subskills,ingredients:[1,30,60].map(l=>ingredients[l]||null)}}
  }
  const rows=[...frequencies].sort((a,b)=>a[0]-b[0]),bins=compact(rows,count);
  assert.equal(count,effectiveNatures.length*layoutsByLevel[level].length*foodPatterns.length);assert.equal(bins.reduce((n,r)=>n+r[2],0),count);data.checks+=2;
  const item={id:'ideal',no:p.no,...(p.speciesId?{speciesId:p.speciesId}:{}),level,skillLevel,ribbonHours:0,...idealRecord,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,idealRecord.ingredients[i]]).filter(([l,n])=>n))};
  assert.equal(ctx.calculateIndividualTrial(item).values.skill,ideal);data.checks++;
  for(const fraction of [.25,.5,.8,.99,1]){const v=ideal*fraction,exact=rows.reduce((n,r)=>n+(r[0]>v+1e-9?r[1]:0),0),lo=bins.reduce((n,r)=>n+(r[0]>v+1e-9?r[2]:0),0),hi=bins.reduce((n,r)=>n+(r[1]>v+1e-9?r[2]:0),0);assert(lo<=exact&&exact<=hi);data.checks++}
  data.entries[JSON.stringify([key(p),level])]={no:p.no,level,skillLevel,count,patternCount:foodPatterns.length,ideal,idealRecord,distributionBounds:bins};data.combinations+=count;
  console.log(`${p.name} ${key(p)} Lv${level}: ${ideal.toFixed(3)} calls/day; ${count} configurations; ${cache.size} engine states`);
  fs.writeFileSync(output,JSON.stringify(data));
 }
}
console.log(JSON.stringify({species:Object.keys(data.species).length,groups:Object.keys(data.entries).length,unsupported:data.unsupported,checks:data.checks,combinations:data.combinations}));
