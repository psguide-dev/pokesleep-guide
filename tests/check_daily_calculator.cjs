// Run: node tests/check_daily_calculator.cjs
// A zero-energy, uncapped 24-hour fixture has exactly 24 helps; no game rates are assumed.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const kernel=require('./daily_kernel.cjs');const ctx={team:['one'],state:{box:[{id:'one',no:1,name:'test',level:30}]},window:{PS_CATALOG:{pokemon:{1:{ingredientSlots:[{unlock:1,candidates:[{name:'a',qty:2}]},{unlock:30,candidates:[{name:'b',qty:4}]}],berry:'berry',mainSkillId:'s',specialty:'食材'}},berries:{berry:30},skills:{s:{maxLevel:1,name:'s',effectType:'random_ingredients',levels:{1:{amount:6}}}}}},teamSpeedContext:()=>({members:new Map([['one',{speed:3600,carry:10000,food:50,berryQty:1,skill:100,energyFactor:1}]])})};vm.createContext(ctx);vm.runInContext(kernel,ctx);const known=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);assert.equal(known.foods.get('a'),12);assert.equal(known.foods.get('b'),24);assert.equal(known.members[0].berries,12);assert.equal(known.members[0].skillTriggers,5);const camp=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,true,false)',ctx);assert.equal(camp.foods.get('a'),14,'28 completed helps in 24 hours; unfinished help is retained');const cap=vm.runInContext('expectedStoredSkills(10000,100,2)',ctx);assert.equal(cap,2);

ctx.teamSpeedContext=()=>({members:new Map([['one',{speed:3600,carry:1,food:0,berryQty:1,skill:100,energyFactor:1}]])});
const full=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
assert.equal(full.members[0].berries,24);assert.equal(full.members[0].overflow,19);assert.equal(full.foods.get('a'),0);
ctx.state.box[0].ingredients={};ctx.window.PS_CATALOG.pokemon[1].ingredientSlots[1].candidates.push({name:'c',qty:6});
const missing=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);assert.equal(missing.members[0].missing,true);assert.equal(missing.foods.size,0);
console.log('Daily calculator: fixed production, camp, stock cap, overflow and missing selection passed.');

ctx.window.PS_CATALOG.pokemon[1].ingredientSlots[1].candidates.pop();
ctx.window.PS_CATALOG.pokemon[1].type='ほのお';
ctx.teamSpeedContext=()=>({members:new Map(ctx.state.box.map((item,i)=>[item.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:i?0:100,energyFactor:1}]))});
ctx.window.PS_CATALOG.skills.s={maxLevel:1,name:'boost',effectType:'helper_boost_fire',levels:{1:{helps:2,bonusByUniqueFire:[0,0,0,1,2,4]}}};
let boost=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
assert.equal(boost.members[0].skillExtraHelps,10);assert.equal(boost.foods.get('a'),17);assert.equal(boost.members[0].skillTriggers,5);
ctx.state.box.push({id:'two',no:1,name:'duplicate',level:30});ctx.team.push('two');
boost=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
assert.equal(boost.members[0].boost.unique,1);assert.equal(boost.members[1].skillExtraHelps,10);
ctx.window.PS_CATALOG.pokemon[2]={...ctx.window.PS_CATALOG.pokemon[1],type:'みず'};ctx.state.box[1].no=2;
boost=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
assert.equal(boost.members[0].boost.unique,1);assert.equal(boost.members[1].skillExtraHelps,10);
assert.equal(vm.runInContext("helperBoostContext('helper_boost_fire',{helps:5,bonusByUniqueFire:[0,0,1,3,4,6]},[{no:1},{no:3},{no:4},{no:5}],{pokemon:{1:{type:'ほのお'},3:{type:'ほのお'},4:{type:'ほのお'},5:{type:'ほのお'}}}).helps",ctx),9);
ctx.window.PS_CATALOG.skills.s={maxLevel:1,name:'support',effectType:'extra_help',levels:{1:{helps:6}}};
let support=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
assert.equal(support.members[0].skillExtraHelps,15);assert.equal(support.members[1].skillExtraHelps,15);
ctx.teamSpeedContext=()=>({members:new Map(ctx.state.box.map((item,i)=>[item.id,{speed:3600,carry:1,food:50,berryQty:1,skill:i?0:100,energyFactor:1}]))});
support=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);assert(support.members[1].skillExtraHelps>0);assert(support.foods.get('a')>1);
ctx.window.PS_CATALOG.skills.s={maxLevel:1,name:'magnet',effectType:'random_ingredients',levels:{1:{amount:6}}};
ctx.teamSpeedContext=()=>({members:new Map(ctx.state.box.map((item,i)=>[item.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:i?0:100,energyFactor:1}]))});
const magnet=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);assert.equal(magnet.randomIngredients,30);assert.equal(magnet.foods.get('a'),24);
console.log('Boost species count, mixed types, support distribution, overflow bypass, no recursion, random-food separate totals passed.');

// Aura Sphere: field bonus applies only to energy; shards are a separate resource.
ctx.window.PS_CATALOG.skills.s={maxLevel:8,name:'aura',effectType:'fixed_dream_shards_energy',levels:{1:{shards:240,energy:200},8:{shards:2500,energy:2042}}};
ctx.state.box[0].skillLevel=1;
let aura=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false,[],50)',ctx);
assert.equal(aura.members[0].skillTriggers,5);assert.equal(aura.dreamShards,1200);assert.equal(aura.skillEnergyBase,1000);assert.equal(aura.skillEnergy,1500);
ctx.state.box[0].skillLevel=8;
aura=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false,[],50)',ctx);
assert.equal(aura.dreamShards,12500);assert.equal(aura.skillEnergy,15315);
ctx.window.PS_CATALOG.skills.s={maxLevel:8,name:'shards',effectType:'fixed_dream_shards',levels:{8:{shards:2500}}};
const shards=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false,[],50)',ctx);
assert.equal(shards.dreamShards,12500);assert.equal(shards.skillEnergy,0);
console.log('Aura Sphere Lv.1/8, separate dream shards, field bonus only on energy and fixed-shard skill passed.');

ctx.window.PS_CATALOG.skills.s={maxLevel:8,name:'random shards',effectType:'variable_dream_shards',levels:{1:{min:120,max:480},8:{min:1150,max:4600}}};
ctx.state.box[0].skillLevel=1;
let randomShards=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false,[],50)',ctx);
assert.equal(randomShards.dreamShards,1500);assert.equal(randomShards.skillEnergy,0);
ctx.state.box[0].skillLevel=8;
randomShards=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false,[],50)',ctx);
assert.equal(randomShards.dreamShards,14375);assert.equal(randomShards.skillEnergy,0);
console.log('Random dream shards Lv.1/8 midpoint estimate, no field bonus or energy conversion passed.');

const hourly=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,1,0,false,false)',ctx);
assert.equal(hourly.interval,1);assert.equal(hourly.periods.length,17);
assert.equal(hourly.periods.reduce((a,b)=>a+b,0),24);
const settingsSource=fs.readFileSync(path.join(__dirname,'../templates/core/08-fields.html'),'utf8').split('function readDaySettings')[0];
vm.runInContext(settingsSource,ctx);
assert.equal(vm.runInContext('normalizeDaySettings({}).initialEnergy',ctx),100);
assert.equal(vm.runInContext('normalizeDaySettings({initialEnergy:0}).initialEnergy',ctx),0);
assert.equal(vm.runInContext('normalizeDaySettings({initialEnergy:200}).initialEnergy',ctx),150);
assert.equal(vm.runInContext('normalizeDaySettings({collectionHours:3}).collectionHours',ctx),4);
console.log('Hourly collection and normalized saved settings passed.');
for(const id of ['super_luck_ingredient_select_s','hyper_cutter_ingredient_select_s']){
 const skill=JSON.parse(fs.readFileSync(path.join(__dirname,'../master/skills',id,'data.json'),'utf8'));
 ctx.window.PS_CATALOG.skills.s=skill;ctx.state.box[0].skillLevel=7;
 const uncertain=vm.runInContext('dailyBaseline(team,state.box,window.PS_CATALOG,4,0,false,false)',ctx);
 assert.equal(uncertain.randomIngredients,0);assert.equal(uncertain.dreamShards,0);assert.equal(uncertain.skillEnergy,0);
 assert(uncertain.members[0].skillTriggers>0);assert(uncertain.members[0].skillCalculationNote.includes('未確定'));
}
console.log('Uncertain ingredient/shard draws are excluded; trigger estimate and explicit note retained.');

// Meal-count migration and timing must preserve existing ON/OFF forecasts.
for(const [value,expected] of [[true,3],[false,0],[0,0],[1,1],[2,2],[3,3],[9,3]]){
 assert.equal(vm.runInContext(`normalizeDaySettings({meals:${value}}).meals`,ctx),expected);
}
ctx.team=['one'];ctx.state.box=[{id:'one',no:1,name:'meal test',level:30}];
ctx.window.PS_CATALOG.skills.s={maxLevel:1,name:'s',effectType:'random_ingredients',levels:{1:{amount:6}}};
ctx.teamSpeedContext=()=>({members:new Map([['one',{speed:3600,carry:10000,food:50,berryQty:1,skill:0,energyFactor:1}]])});
let recoveryCalls=[];ctx.mealRecoveryAtEnergy=energy=>{recoveryCalls.push(energy);return 5};
for(let count=0;count<=3;count++){
 recoveryCalls=[];
 const result=vm.runInContext(`dailyBaseline(team,state.box,window.PS_CATALOG,4,100,false,${count})`,ctx);
 assert.equal(result.mealCount,count);assert.equal(recoveryCalls.length,count);
 // With this fixture, the later meals are at 12h (2 meals) or 6h and 12h (3 meals).
 assert.deepEqual(recoveryCalls,[[],[100],[100,33],[100,69,38]][count]);
}
for(const [legacy,count] of [[true,3],[false,0]]){
 const old=vm.runInContext(`dailyBaseline(team,state.box,window.PS_CATALOG,4,100,false,${legacy})`,ctx);
 const next=vm.runInContext(`dailyBaseline(team,state.box,window.PS_CATALOG,4,100,false,${count})`,ctx);
 assert.equal(old.berryEnergy,next.berryEnergy);
}
console.log('Meal counts 0–3: saved boolean migration, recovery timing and legacy forecast equivalence passed.');
