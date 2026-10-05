const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{PS_CATALOG:{cooking:{pot:{'拡張表':[{容量:81},{容量:45}]}}}},structuredClone,Map,console};vm.createContext(ctx);
vm.runInContext(read('vendor/enigma-special/special_skill_kernel.mjs').replace(/\bexport /g,'')+'\nconst tables='+read('vendor/enigma-special/effect_tables.json')+';window.PS_SPECIAL_ENGINE={kernel:createKernel(tables),tables,ingredientNames:{coffee:"coffee"},initialState,provisionalCountDistribution};',ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
const source=read('templates/core/08-fields.html');vm.runInContext(source.slice(source.indexOf('const potCapacities'),source.indexOf('let cookingSettings'))+source.slice(source.indexOf('function calculatePotCapacity'),source.indexOf('function cookingContext')),ctx);
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
ctx.pot=vm.runInContext('dailyCreatePotForecast({skill:195},true)',ctx);ctx.m={id:'a',stockLimit:2,potConfig:{amount:24}};ctx.members=[ctx.m];ctx.triggers=new Map([['a',2]]);
vm.runInContext('dailyCollectPot(pot,members,triggers)',ctx);near(ctx.triggers.get('a'),1);near(ctx.m.pendingPotStock,1);near(ctx.m.potAdded,5);near(ctx.pot.states.get(200),1);
near(vm.runInContext('dailyPotNewStock(10,100,2,2)',ctx),0);
ctx.triggers=new Map([['a',1]]);vm.runInContext('dailyCollectPot(pot,members,triggers)',ctx);near(ctx.triggers.get('a'),0);near(ctx.m.pendingPotStock,2);
vm.runInContext('dailyPotAtMeal(pot,6);dailyCollectPot(pot,members,new Map([["a",0]]))',ctx);near(ctx.m.pendingPotStock,0);near(ctx.pot.meals[0].addition,200);near(ctx.pot.states.get(48),1);
ctx.pot=vm.runInContext('dailyCreatePotForecast({skill:190},true)',ctx);ctx.m={id:'a',stockLimit:1,potConfig:{amount:20}};ctx.members=[ctx.m];ctx.triggers=new Map([['a',.5]]);vm.runInContext('dailyCollectPot(pot,members,triggers);dailyPotAtMeal(pot,12)',ctx);near(ctx.pot.meals[0].states.get(190),.5);near(ctx.pot.meals[0].states.get(200),.5);
const split=vm.runInContext('dailyPotRecipeCheck(pot,{base:81,event:1,camp:false,sunday:false},276,calculatePotCapacity)',ctx);near(split[0].capacity,276);near(split[0].fits,.5); // A mean capacity alone must not imply certainty.
near(vm.runInContext('calculatePotCapacity(81,1,0,false,true)',ctx),121.5);near(vm.runInContext('calculatePotCapacity(45,1.123,7,true,true)',ctx),(45*1.123*2+7)*1.5);
assert.equal(vm.runInContext('calculatePotCapacity(null,1,0,false,true)',ctx),null);
function baseline(skill,meals=0,initial=200){
 ctx.items=[{id:'a',no:1,name:'minus',level:1,skillLevel:7},{id:'b',no:2,name:'plus',level:1,skillLevel:7}];ctx.ids=['a','b'];
 ctx.catalog={pokemon:{1:{no:1,type:'でんき',berry:'berry',specialty:'スキル',mainSkillId:skill,ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]},2:{no:2,type:'でんき',berry:'berry',mainSkillId:'plus_ingredient_magnet_s',ingredientSlots:[{unlock:1,candidates:[{name:'coffee',qty:2}]}]}},berries:{berry:10},skills:{[skill]:{id:skill,name:skill,effectType:skill==='cooking_power_up_s'?'cooking_pot_capacity':'reference_only',maxLevel:7,levels:{7:{capacity:31}}},plus_ingredient_magnet_s:{id:'plus_ingredient_magnet_s',name:'plus',effectType:'reference_only',maxLevel:7,levels:{7:{}}}}};
 ctx.teamSpeedContext=()=>({members:new Map(ctx.items.map((x,i)=>[x.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:i?0:100,energyFactor:1}]))});ctx.meals=meals;ctx.input={skill:initial};
 const r=vm.runInContext('dailyBaseline(ids,items,catalog,1,0,false,meals,[],0,{},input)',ctx);assert.equal(ctx.input.skill,initial);return r;
}
const blocked=baseline('minus_cooking_power_up_s');near(blocked.members[0].skillTriggers,0);near(blocked.members[0].pendingPotStock,2);near(blocked.members[1].specialRecoveryNet||0,0);
const resumed=baseline('minus_cooking_power_up_s',3);assert(resumed.members[0].skillTriggers>0);assert(resumed.members[1].specialRecoveryNet>0);assert.deepEqual(Array.from(resumed.potForecast.meals,m=>m.hour),[0,6,12]);
const normal=baseline('cooking_power_up_s',3,0);assert(normal.members[0].potAdded>0);assert(normal.potForecast.meals[1].addition>0);
ctx.pot=vm.runInContext('dailyCreatePotForecast({skill:0},true)',ctx);ctx.members=Array.from({length:5},(_,i)=>({id:''+i,stockLimit:2,potConfig:{amount:[7,10,12,17,31][i]}}));ctx.triggers=new Map(ctx.members.map(m=>[m.id,1.5]));const start=Date.now();for(let i=0;i<20;i++)vm.runInContext('dailyCollectPot(pot,members,triggers)',ctx);assert(ctx.pot.states.size<=201);assert(Date.now()-start<2000);
console.log('Pot feedback: cap clipping, blocked/pending stock, cooking reset, exact capacity probabilities, no mutation/rounding, shared pot, normal/Minus skills and bounded state space passed.');
