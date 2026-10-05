const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tables=JSON.parse(read('vendor/enigma-special/effect_tables.json'));
const ctx={window:{},structuredClone,console,speciesFor:(item,catalog)=>catalog.pokemon[item.no]};vm.createContext(ctx);
vm.runInContext(read('vendor/enigma-special/special_skill_kernel.mjs').replace(/\bexport /g,'')+'\nwindow.PS_SPECIAL_ENGINE={kernel:createKernel('+JSON.stringify(tables)+'),tables:'+JSON.stringify(tables)+',ingredientNames:{coffee:"coffee",moomoo_milk:"milk"},initialState,provisionalCountDistribution};',ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
function fixture(id,count=1,options={}){
 const members=[{id:'one',name:'one',level:1,skillId:id,skillLevel:1,skillTriggers:count,stats:{energyFactor:1,berryQty:1},slots:[{name:'coffee',qty:2}],chance:.5,berryName:options.berry||'berry',berryBase:10,foods:new Map(),randomIngredients:0},...Array.from({length:4},(_,i)=>({id:'other'+i,level:1,skillId:'normal',skillLevel:1,skillTriggers:0,stats:{energyFactor:1,berryQty:1},slots:[{name:'milk',qty:2}],chance:.5,berryName:'berry',berryBase:10,foods:new Map(),randomIngredients:0}))];
 const items=members.map((m,i)=>({id:m.id,no:i+1,mythicalState:{selectedEffect:options.selected}}));
 const catalog={pokemon:Object.fromEntries(items.map((x,i)=>[x.no,{no:x.no,type:i?'ノーマル':options.type||'エスパー',mainSkillId:i?options.partner||'normal':id}])),skills:{energy:{id:'energy',name:'charge',effectType:'fixed_energy',maxLevel:1,levels:{1:{energy:100}}}}};
 ctx.members=members;ctx.items=items;ctx.catalog=catalog;ctx.factor=options.factor||1;ctx.favorites=new Set(options.favorites||[]);ctx.zones=options.zones||{};
 const result=vm.runInContext('dailySpecialSkills(members,items,catalog,factor,favorites,zones)',ctx);return {result,member:members[0],members};
}
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const s of tables.skills){const f=fixture(s.skillId);assert(f.member.specialResult,s.skillId);assert(Number.isFinite(f.result.energy));}
near(fixture('psystrike_berry_zone',2,{factor:1.8}).result.energy,1408*2*1.8);
near(fixture('nightmare_energy_charge_m',2,{factor:1.8}).result.energy,2640*2*1.8);
near(fixture('almighty',2).result.candy,2);near(fixture('almighty',2,{selected:'charge',factor:1.8}).result.energy,360);
const plus=fixture('plus_ingredient_magnet_s',2,{partner:'minus_cooking_power_up_s',factor:1.8});near(plus.member.randomIngredients,10);near(plus.member.foods.get('coffee'),12);
const healing=fixture('healing_pulse_energy_cheer_s');near(healing.member.specialInstantHelps,2);near([...healing.member.foods.values()].reduce((a,b)=>a+b,0),2);near(healing.result.energy,10);
near(fixture('draco_meteor_berry_burst',1,{type:'ドラゴン'}).result.energy,160);
near(fixture('lunar_blessing_energy_for_everyone_s').result.energy,90);
near(fixture('disguise_berry_burst',2).result.energy,120*(1.4+1.32));
near(fixture('stockpile_energy_charge_s',1).result.energy,150);
near(fixture('stockpile_energy_charge_s',2).result.energy,378.75);
near(fixture('stockpile_energy_charge_s',1.5).result.energy,(150+378.75)/2);
near(fixture('draco_meteor_berry_burst',1,{type:'ドラゴン',berry:'マゴのみ',favorites:['マゴのみ'],factor:1.8,zones:{'マゴのみ':24}}).result.energy,(12*10*2*1.24+4*10)*1.8);
for(const id of ['minus_cooking_power_up_s','nuzzle_energy_cheer_s']){const f=fixture(id);assert(f.member.specialBasicText);assert(f.member.specialDeferred);assert(vm.runInContext('dailySkillOmissionText(members[0])',ctx).includes('未対応'));}
// A special member no longer halts another member's known production.
ctx.team=['one','two'];ctx.items=[{id:'one',no:1,name:'special',level:1},{id:'two',no:2,name:'ordinary',level:1}];
ctx.catalog={pokemon:{1:{no:1,type:'エスパー',berry:'berry',mainSkillId:'psystrike_berry_zone',specialty:'スキル',ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]},2:{no:2,type:'ノーマル',berry:'berry',mainSkillId:'normal',ingredientSlots:[{unlock:1,candidates:[{name:'milk',qty:2}]}]}},berries:{berry:10},skills:{psystrike_berry_zone:{id:'psystrike_berry_zone',name:'psy',effectType:'reference_only',maxLevel:6,levels:{1:{}}},normal:{id:'normal',maxLevel:1,levels:{1:{}}}}};
ctx.teamSpeedContext=()=>({members:new Map(ctx.items.map(item=>[item.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:item.id==='one'?100:0,energyFactor:1}]))});
const mixed=vm.runInContext('dailyBaseline(team,items,catalog,4,0,false,0,[],80)',ctx);assert(!mixed.pendingReason);assert(mixed.members.every(m=>!m.missing));assert(mixed.foods.get('milk')>0);near(mixed.skillEnergy,mixed.members[0].skillTriggers*1408*1.8);
const start=Date.now();for(let i=0;i<20;i++)fixture('stockpile_energy_charge_s',20);assert(Date.now()-start<5000,'Bounded state calculation regressed');
console.log('11 special skills: basic rewards, mixed production, single FB/ingredient ledger, discrete stock/disguise states, omissions and bounded calculation passed.');
