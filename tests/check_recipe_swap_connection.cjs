const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const module=await import('../master/calculations/recipe-time.mjs');
 const box=[{id:'one',no:1,name:'a',level:30},{id:'two',no:2,name:'b',level:30},{id:'reserve',no:3,name:'support',level:30}];
 const pokemon={};for(const [no,name] of [[1,'a'],[2,'b'],[3,'a']])pokemon[no]={no,ingredientSlots:[{unlock:1,candidates:[{name,qty:2}]}],berry:'berry',mainSkillId:no===3?'support':'off',specialty:'食材'};
 const catalog={pokemon,berries:{berry:30},skills:{off:{maxLevel:1,name:'off',effectType:'random_ingredients',levels:{1:{amount:0}}},support:{maxLevel:1,name:'support',effectType:'extra_help',levels:{1:{helps:6}}}}};
 class Node{constructor(tag){this.tagName=tag;this.children=[];this.value='';this.disabled=false}append(...xs){this.children.push(...xs)}replaceChildren(){this.children=[]}setAttribute(){} }
 let resolveImport;const deferred=new Promise(resolve=>resolveImport=resolve);
 const ctx={structuredClone,team:['one','two'],state:{box},window:{PS_CATALOG:catalog,PS_NUMBERS:{display:n=>n.toFixed(1)}},document:{createElement:tag=>new Node(tag),getElementById:()=>({value:'4'})},fieldProfile:{selectedFieldId:'normal',areaBonuses:{}},teamInitialEnergy:0,teamGoodCamp:false,teamMeals:0,activeFieldBerries:()=>[],activeBerryZones:()=>({}),dailyExContext:()=>null,loadModule:()=>deferred,teamSpeedContext:(ids,items)=>({members:new Map(items.filter(i=>ids.includes(i.id)).map(i=>[i.id,{speed:3600,carry:10000,food:50,berryQty:1,skill:i.no===3?100:0,energyFactor:1}]))})};
 vm.createContext(ctx);vm.runInContext(require('./daily_kernel.cjs'),ctx);
 vm.runInContext(fs.readFileSync('templates/core/02-team.html','utf8').split('function normalizeTeam')[0],ctx);
 const source=fs.readFileSync('templates/team/12-recipe-swap.html','utf8');
 vm.runInContext(source.replace("import('./master/calculations/recipe-time.mjs')",'loadModule()'),ctx);
 const conditions=ctx.recipeForecastConditions(),foods=['a','b','none'];
 const forecast=ids=>ctx.recipeWholeTeamForecast(ids,conditions,box,catalog,foods);
 const base=forecast(['one','two']),changed=forecast(['reserve','two']);
 assert.equal(base.foodsPerDay.a,24);assert.equal(base.foodsPerDay.b,24);assert.equal(base.foodsPerDay.none,0);
 assert(changed.foodsPerDay.b>base.foodsPerDay.b,'support changes retained teammate; whole team must be recalculated');
 const snapshot=JSON.stringify(box);
 const comparison=await module.evaluateRecipe({requirements:{a:24,b:24},memberIds:['one','two'],conditions,swaps:[{removeId:'one',addId:'reserve'}],forecastTeam:({memberIds})=>forecast(memberIds)});
 assert.equal(comparison.current.hours,24);assert(comparison.alternatives[0].hoursSaved>0);assert.equal(JSON.stringify(box),snapshot);assert.deepEqual(ctx.team,['one','two']);
 assert.throws(()=>forecast(['one','one']));assert.throws(()=>forecast(['missing']));
 pokemon[2].ingredientSlots[0].candidates.push({name:'c',qty:3});
 const partial=forecast(['one','two']);assert.equal(partial.complete,false);assert.equal(partial.foodsPerDay.a,null);
 await assert.rejects(module.evaluateRecipe({requirements:{a:24},memberIds:['one','two'],conditions,forecastTeam:()=>partial}),/complete matching/);
 pokemon[2].ingredientSlots[0].candidates.pop();
 const stocks={a:0,b:0},meals={value:'1'},panel=ctx.recipeSwapPanel({ingredients:[{name:'a',qty:24},{name:'b',qty:24}]},stocks,meals,()=>true);
 const controls=panel.children[1],outgoing=controls.children[0].children[0],incoming=controls.children[1].children[0],button=panel.children[2],output=panel.children[3];
 outgoing.value='one';incoming.value='reserve';const pending=button.onclick();assert(button.disabled);
 // User changes quantity while import is pending; stale output must never appear.
 meals.value='3';panel.invalidateRecipeSwap();resolveImport(module);await pending;assert.equal(output.children.length,0);assert(!button.disabled);
 outgoing.value='one';incoming.value='reserve';await button.onclick();assert(output.children.some(p=>p.textContent.includes('現在：約72.0時間')));
 stocks.a=100;stocks.b=100;panel.invalidateRecipeSwap();outgoing.value='one';incoming.value='reserve';await button.onclick();assert(output.children.some(p=>p.textContent.includes('在庫で食材が揃う')));
 const limited={...pokemon[1],specialTeamLimited:true};pokemon[1]=limited;pokemon[3]={...pokemon[3],specialTeamLimited:true};assert.throws(()=>forecast(['one','reserve']),/編成制限/);
 console.log('Recipe connection: real daily kernel, support effect on retained teammate, raw full-team times, 3 meals/stock, partial/duplicate/limited rejection, unchanged team and stale async output passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
