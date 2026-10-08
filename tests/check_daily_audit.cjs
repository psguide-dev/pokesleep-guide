const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const input=JSON.parse(fs.readFileSync(__dirname+'/../data-import/daily-audit-inputs-v449.json','utf8'));
const ctx={window:{},structuredClone,console};vm.createContext(ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
ctx.window.PS_SPECIES=(item,c)=>c.pokemon[item.speciesId];
ctx.teamSpeedContext=(ids,box,c)=>({members:new Map(box.filter(i=>ids.includes(i.id)).map(i=>{const p=c.pokemon[i.speciesId];return [i.id,{speed:Math.floor(p.help*(1-(i.level-1)*.002)),carry:p.carry,food:p.foodRate,berryQty:p.berryQty,skill:i.skillOff?0:p.skillRate,energyFactor:1}]}))});
const source=new Map(input.species.map(p=>[p.speciesId,p]));
function run({carry=14,hours=4,energy=100,fb=0,healer=false,skills=false,missingFood=false}={}){
 const p=structuredClone(source.get('0591_default'));p.carry=carry;if(missingFood)p.foodRate=null;
 const ps=[p];if(healer)ps.push(source.get('0700_default'));
 const box=ps.map((s,i)=>({id:'m'+i,no:s.no,speciesId:s.speciesId,name:s.name,level:60,skillLevel:input.skills[s.mainSkillId].maxLevel,skillOff:!skills,ingredients:Object.fromEntries(s.ingredientSlots.map(z=>[z.unlock,z.candidates[0].name]))}));
 const catalog={pokemon:Object.fromEntries(ps.map(s=>[s.speciesId,s])),skills:input.skills,berries:input.berries};
 const r=ctx.dailyBaseline(box.map(i=>i.id),box,catalog,hours,energy,false,3,[],fb,{});
 return {periods:r.periods,berryEnergy:r.berryEnergy,skillEnergy:r.skillEnergy,members:r.members.map(m=>({name:m.name,missing:!!m.missing,reasons:m.reasons,carry:m.stats?.carry,normalHelps:m.normalHelps,overflowBerries:m.overflow,berries:m.berries,skillTriggers:m.skillTriggers,berryEnergy:m.berryEnergy,endingEnergy:m.energy,foods:m.foods?Object.fromEntries(m.foods):null}))};
}
const cases=[];for(const carry of [14,19])for(const hours of [2,4,8])for(const energy of [0,100]){const settings={carry,hours,energy,skills:true};cases.push({settings,result:run(settings)});}
const food=r=>Object.values(r.members[0].foods||{}).reduce((a,b)=>a+b,0);
let checks=0;
for(const c of cases){const m=c.result.members[0];assert(!m.missing);assert([m.normalHelps,m.berries,m.skillTriggers,food(c.result)].every(Number.isFinite));assert.equal(c.result.periods.reduce((a,b)=>a+b,0),24);assert.equal(c.result.periods.at(-1),8);checks+=3;}
for(const hours of [2,4,8])for(const energy of [0,100]){const find=carry=>cases.find(c=>c.settings.carry===carry&&c.settings.hours===hours&&c.settings.energy===energy).result;assert(food(find(19))>=food(find(14)));assert(find(19).members[0].skillTriggers>=find(14).members[0].skillTriggers);checks+=2;}
const a=run({skills:true}),b=run({skills:true,fb:80});assert(Math.abs(b.berryEnergy-a.berryEnergy*1.8)<1e-7);assert(Math.abs(b.skillEnergy-a.skillEnergy*1.8)<1e-7);assert.deepEqual(a.members[0].foods,b.members[0].foods);checks+=3;
const off=run({healer:true,skills:false}),on=run({healer:true,skills:true});assert(on.members[0].normalHelps>off.members[0].normalHelps);checks++;
const missing=run({missingFood:true});assert(missing.members[0].missing);assert(missing.members[0].reasons.includes('食材確率'));checks++;
console.log(JSON.stringify({scope:'current daily kernel, fixture stats',assertionsPassed:checks,cases:cases.length}));
