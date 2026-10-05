const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{},structuredClone,Map,console};vm.createContext(ctx);
vm.runInContext(read('vendor/enigma-special/special_skill_kernel.mjs').replace(/\bexport /g,'')+'\nconst tables='+read('vendor/enigma-special/effect_tables.json')+';window.PS_SPECIAL_ENGINE={kernel:createKernel(tables),tables,ingredientNames:{coffee:"coffee"},initialState,provisionalCountDistribution};',ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
function baseline(skill,meals=0,initial=200){
 ctx.items=[{id:'a',no:1,name:'minus',level:1,skillLevel:7},{id:'b',no:2,name:'plus',level:1,skillLevel:7}];ctx.ids=['a','b'];
 ctx.catalog={pokemon:{1:{no:1,type:'でんき',berry:'berry',specialty:'スキル',mainSkillId:skill,ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]},2:{no:2,type:'でんき',berry:'berry',mainSkillId:'plus_ingredient_magnet_s',ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]}},berries:{berry:10},skills:{[skill]:{id:skill,name:skill,effectType:skill==='cooking_power_up_s'?'cooking_pot_capacity':'reference_only',maxLevel:7,levels:{7:{capacity:31}}},plus_ingredient_magnet_s:{id:'plus_ingredient_magnet_s',name:'plus',effectType:'reference_only',maxLevel:7,levels:{7:{}}}}};
 ctx.teamSpeedContext=()=>({members:new Map(ctx.items.map((x,i)=>[x.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:i?0:100,energyFactor:1}]))});ctx.meals=meals;ctx.input={skill:initial};
 const r=vm.runInContext('dailyBaseline(ids,items,catalog,1,0,false,meals,[],0,{},input)',ctx);assert.equal(ctx.input.skill,initial);return r;
}
const atCap=baseline('minus_cooking_power_up_s',0,200),empty=baseline('minus_cooking_power_up_s',0,0);
assert(atCap.members[0].skillTriggers>0);assert.equal(atCap.members[0].skillTriggers,empty.members[0].skillTriggers);
assert(atCap.members[1].specialRecoveryNet>0);assert.equal(atCap.foods.get('coffee'),empty.foods.get('coffee'));
assert(!Object.hasOwn(atCap,'potForecast'));assert(!Object.hasOwn(atCap.members[0],'pendingPotStock'));
ctx.member=atCap.members[0];const display=vm.runInContext('dailySkillDisplay(member,items[0],catalog)',ctx);assert.equal(display.potAmount,24);
const meals=baseline('minus_cooking_power_up_s',3,200);assert(meals.foods.get('coffee')>atCap.foods.get('coffee'));
const normal=baseline('cooking_power_up_s',3,200);ctx.member=normal.members[0];assert.equal(vm.runInContext('dailySkillDisplay(member,items[0],catalog).potAmount',ctx),31);
assert(!read('templates/team/02-food-view.html').includes('dailyBaseline('),'Recipe rendering must not run another daily forecast');
assert(!read('templates/21-day-calculator.html').includes('dailyCollectPot('));
console.log('Simplified pot skills: trigger counts independent of pot cap, Minus recovery retained, meal recovery retained, per-activation effects and no duplicate recipe simulation passed.');
