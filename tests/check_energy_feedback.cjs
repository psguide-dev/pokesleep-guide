const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{},structuredClone,console};vm.createContext(ctx);
vm.runInContext(read('vendor/enigma-special/special_skill_kernel.mjs').replace(/\bexport /g,'')+'\nconst tables='+read('vendor/enigma-special/effect_tables.json')+';window.PS_SPECIAL_ENGINE={kernel:createKernel(tables),tables,ingredientNames:{coffee:"coffee"},initialState,provisionalCountDistribution};',ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
function run(id,{dark=false,energy=0,carry=10000,rate=100,selected}={}){
 ctx.items=Array.from({length:5},(_,i)=>({id:'id'+i,no:i+1,name:'m'+i,level:1,skillLevel:6,mythicalState:{selectedEffect:selected}}));ctx.ids=ctx.items.map(x=>x.id);
 ctx.catalog={pokemon:Object.fromEntries(ctx.items.map((x,i)=>[x.no,{no:x.no,type:!i||dark?'あく':'ノーマル',berry:i?'berry':'マゴのみ',mainSkillId:i?'normal':id,specialty:'スキル',ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]}])),berries:{berry:10,'マゴのみ':10},skills:{[id]:{id,name:id,effectType:'reference_only',maxLevel:8,levels:{6:{}}},normal:{id:'normal',name:'normal',effectType:'fixed_energy',maxLevel:1,levels:{1:{energy:100}}},rec:{id:'rec',name:'rec',effectType:'team_energy_recovery',maxLevel:7,levels:{6:{recovery:30}}}}};
 ctx.teamSpeedContext=()=>({members:new Map(ctx.items.map((item,i)=>[item.id,{speed:3600,carry,food:50,berryQty:1,skill:i?0:rate,energyFactor:1}]))});ctx.energy=energy;ctx.zones={'マゴのみ':12};
 const r=vm.runInContext('dailyBaseline(ids,items,catalog,1,energy,false,0,[],80,zones)',ctx);assert.equal(ctx.zones['マゴのみ'],12);return r;
}
// Same clock and reward fixture with/without healing, isolating the feedback itself.
vm.runInContext("tables.skills.find(s=>s.skillId==='healing_pulse_energy_cheer_s').levels[5].recoveryPerTarget=0",ctx);
const noHeal=run('healing_pulse_energy_cheer_s');
const noRecoverySkill=run('normal'),skillsOff=run('healing_pulse_energy_cheer_s',{rate:0});
assert.deepEqual(noHeal.members.map(m=>m.normalHelps),noRecoverySkill.members.map(m=>m.normalHelps),'skill category must not change help clock');
assert.deepEqual(noHeal.members.map(m=>m.normalHelps),skillsOff.members.map(m=>m.normalHelps),'skill OFF must retain the same clock');
vm.runInContext("tables.skills.find(s=>s.skillId==='healing_pulse_energy_cheer_s').levels[5].recoveryPerTarget=22",ctx);
const heal=run('healing_pulse_energy_cheer_s');assert(heal.members[1].normalHelps>noHeal.members[1].normalHelps);assert(heal.members[0].skillTriggers>noHeal.members[0].skillTriggers);assert(heal.foods.get('coffee')>noHeal.foods.get('coffee'));
const immune=run('nightmare_energy_charge_m',{dark:true,energy:80}),nightmare=run('nightmare_energy_charge_m',{energy:80});assert(nightmare.members[1].normalHelps<immune.members[1].normalHelps);assert.equal(nightmare.members[0].normalHelps,immune.members[0].normalHelps);assert(nightmare.members.every(m=>m.energy>=0));
const capped=run('nuzzle_energy_cheer_s',{energy:150});assert(capped.members.every(m=>m.energy<=150));
const full=run('healing_pulse_energy_cheer_s',{carry:1});assert(full.members[0].overflow>0);assert(full.members[0].skillTriggers<=17*(1/1.5)+1e-8);assert(full.members[0].skillTriggers<heal.members[0].skillTriggers);
const mew=run('almighty',{selected:'rec'});assert(mew.members.some(m=>m.specialRecoveryNet>0));assert(mew.members[0].specialCandy>0);
const psy=run('psystrike_berry_zone');assert(!psy.members[0].energyLinked);assert.equal(psy.members[0].zoneFactor,1.12);assert(psy.members[0].skillOmitted.includes('zone_input_fixed'));
// Input-owned state and an unfinished help are never increased/restarted by recovery.
ctx.member={energy:100,stats:{speed:3600},pendingHelpSeconds:3000};assert.equal(vm.runInContext('dailyAdvanceLinkedMember(member,1/6,0,[],false)',ctx),0);assert.equal(ctx.member.pendingHelpSeconds,2400);
ctx.member={energy:0,stats:{speed:3600},pendingHelpSeconds:3600};assert.equal(vm.runInContext('dailyAdvanceLinkedMember(member,1,0,[],false)',ctx),1);
const start=Date.now();for(let i=0;i<20;i++)run('healing_pulse_energy_cheer_s');assert(Date.now()-start<3000,'Feedback latency regression');
console.log('Energy feedback: recovery increases helps/trigger opportunities, dark immunity, caps, carry/stock limits, Mew, fixed zone, unfinished helps and bounded runtime passed.');
