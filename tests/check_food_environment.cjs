const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const catalog=JSON.parse(fs.readFileSync('review.html','utf8').match(/window.PS_CATALOG=(.*);\n/)[1]);
const model=fs.readFileSync('templates/00-food-environment.html','utf8').replace(/<\/?script[^>]*>/g,'');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(model,ctx);const {build,composition}=ctx.window.PS_FOOD_ENVIRONMENT;
const cats=['カレー・シチュー','サラダ','デザート・ドリンク'],names=Object.keys(catalog.ingredientAssets),recipes=Object.values(catalog.recipes),before=JSON.stringify(recipes);
const fields=fs.readFileSync('templates/core/08-fields.html','utf8'),potCode=fields.slice(fields.indexOf('function calculatePotCapacity('),fields.indexOf('function cookingContext('));
const potContext={potCapacities:[21,69,81]};vm.createContext(potContext);vm.runInContext(potCode,potContext);const pot=potContext.calculatePotCapacity;
assert.equal(pot(81,1,0,false,true),122);assert.equal(pot(81),81);
assert.equal(pot(21,1,10,false,true),47);assert.equal(pot(69,1.5,0,true,false),208);assert.equal(pot(81,1,200,true,true),543);
assert.equal(pot(84),null);assert.equal(pot(81,1.0001),null);assert.equal(pot(81,1,-1),null);assert.equal(pot(81,Number.MAX_VALUE),null);
const results={};
for(const goodCamp of [false,true]){
 const capacity=pot(81,1,0,false,goodCamp),result=results[goodCamp]=build(recipes,names,{capacity,baseCapacity:81,goodCamp});
 for(const cat of cats){
  const selected=recipes.filter(r=>r.category===cat&&r.energy?.max?.level===70&&Number.isFinite(r.energy.max.value)&&r.energy.max.value>0&&r.ingredients.length&&r.ingredients.every(i=>Number.isFinite(i.qty)&&i.qty>0)&&r.ingredients.reduce((s,i)=>s+i.qty,0)<=capacity).sort((a,b)=>b.energy.max.value-a.energy.max.value||a.id.localeCompare(b.id)).slice(0,5);
  assert.deepEqual(Array.from(result.top[cat],r=>r.id),selected.map(r=>r.id));
  for(const name of names){const row=result.ingredients[name][cat],expected=selected.filter(r=>r.ingredients.some(i=>i.name===name));assert.equal(row.total,selected.length);assert.equal(row.count,expected.length);assert.equal(row.coverage,selected.length?100*expected.length/selected.length:null);assert.equal(row.meanQuantity,selected.length?expected.reduce((sum,r)=>sum+r.ingredients.filter(i=>i.name===name).reduce((s,i)=>s+i.qty,0),0)/selected.length:null)}
 }
}
assert.notEqual(JSON.stringify(results.false.top),JSON.stringify(results.true.top),'camp changes selected recipes');assert.equal(JSON.stringify(recipes),before,'canonical recipe order/data remains unchanged');
const recipe=(id,value,qty=10,name='A',category=cats[0])=>({id,name:id,category,ingredients:[{name,qty}],energy:{max:{level:70,value}}});
const probes=[recipe('b',100,81),recipe('a',100,80),recipe('over',999,82),recipe('unknown',1000,null),recipe('zero',900,0),recipe('negative',900,-1),recipe('nan',NaN),{...recipe('missing',999),energy:{}},recipe('salad',80,10,'B',cats[1])];
const few=build(probes,['A','B'],{capacity:81});assert.deepEqual(Array.from(few.top[cats[0]],r=>r.id),['a','b']);assert.equal(few.ingredients.A[cats[0]].coverage,100);assert.equal(few.ingredients.B[cats[0]].coverage,0);assert.equal(few.ingredients.B[cats[1]].total,1);assert.equal(few.ingredients.A[cats[2]].coverage,null);assert.equal(few.ingredients.A[cats[2]].meanQuantity,null);
for(const capacity of [null,0,NaN,81.5])assert.equal(build(probes,['A'],{capacity}).ingredients.A[cats[0]].coverage,null);
const weighted=composition(few,[{name:'A',qty:2},{name:'B',qty:4},{name:'A',qty:6}]);assert.equal(weighted[cats[0]],(2/12+6/12)*100);assert.equal(weighted[cats[1]],4/12*100);assert.equal(weighted[cats[2]],null);
for(const slots of [[],[{name:'C',qty:2}],[{name:'A',qty:0}],[{name:'A',qty:null}],[{name:'A',qty:Infinity}]])assert.equal(composition(few,slots),null);
assert.equal(build([...probes,recipe('new',1001,10,'B')],['A','B'],{capacity:81}).top[cats[0]][0].id,'new','rebuild reads updated recipe data');
// DOM surrogate verifies state and event wiring without browser automation.
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.events={};this.value='';this.open=false;this._text=''}
 append(...children){this.children.push(...children)}replaceChildren(...children){this.children=children}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(c=>c.textContent??'').join('')}
 setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.events[k]=v}
 querySelector(sel){return this.children.find(c=>sel==='details'&&c.tagName==='details')||null}
 querySelectorAll(sel){return sel===':scope > details[open]'?this.children.filter(c=>c.tagName==='details'&&c.open):[]}
}
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,new Element('div'));return nodes.get(id)},events={},opened=[];
let camp=true;
const ui={window:{PS_FOOD_ENVIRONMENT:ctx.window.PS_FOOD_ENVIRONMENT,PS:{getGoodCamp:()=>camp,calculatePotCapacity:pot},PS_OPEN_RECIPE:id=>opened.push(id),addEventListener:(name,fn)=>events[name]=fn},document:{createElement:tag=>new Element(tag),getElementById:node},catalog,recipes,ingredientNames:names,ingredientSort:node('ingredientIndexSort'),dailyLevel:node('ingredientSupplyLevel'),tiersView:node('ingredientDailyTiers'),normalizeIngredient:s=>s.normalize('NFKC'),currentSupply:()=>({tiers:{}}),icon:()=>new Element('img'),supplyNumber:String,providerGroup:()=>new Element('div'),openSupplyReference:()=>{}};
ui.ingredientSort.value='energy';ui.dailyLevel.value='30';vm.createContext(ui);
for(const file of ['00-environment','02-details','03-list-view','04-events'])vm.runInContext(fs.readFileSync(`templates/ingredients/${file}.html`,'utf8'),ui);
assert.equal(ui.tiersView.children.length,19);assert.match(node('ingredientEnvironmentBasis').textContent,/通常最大鍋 81 → 122個/);assert.equal(ui.window.PS_FOOD_ENVIRONMENT_DATA.condition.goodCamp,true);
assert(!fs.readFileSync('templates/06-ingredients.html','utf8').includes('ingredientSearch'));assert.equal(ui.tiersView.children.length,19);
const card=ui.tiersView.children[0];card.open=true;card.events.toggle();assert.match(card.textContent,/全料理での使用/);
const walk=el=>[el,...el.children.flatMap(walk)];const links=walk(card).filter(el=>el.dataset.ingredientRecipe);assert(links.length);links[0].events.click();assert.equal(opened[0],links[0].dataset.ingredientRecipe);
const onData=ui.window.PS_FOOD_ENVIRONMENT_DATA;camp=false;events['psg-camp-change']();assert.equal(ui.ingredientSort.value,'energy');assert.equal(ui.tiersView.children.length,19);assert.equal(ui.tiersView.children[0].open,true);assert.match(node('ingredientEnvironmentBasis').textContent,/通常最大鍋 81 → 81個/);assert.equal(ui.window.PS_FOOD_ENVIRONMENT_DATA.condition.goodCamp,false);
camp=true;events['psg-camp-change']();assert.equal(ui.window.PS_FOOD_ENVIRONMENT_DATA,onData,'condition cache never mixes ON/OFF');
const noRows=build([],names,{capacity:81});// Render missing recipe data with a separate fixture.
const viewSource=fs.readFileSync('templates/ingredients/00-environment.html','utf8');const emptyUI={...ui,window:{...ui.window,PS_FOOD_ENVIRONMENT:{current:()=>noRows}}};vm.createContext(emptyUI);vm.runInContext(viewSource,emptyUI);const emptyView=vm.runInContext("ingredientEnvironmentView('ワカクサ大豆')",emptyUI);assert.equal(walk(emptyView).filter(e=>e.tagName==='meter').length,0);assert.match(emptyView.textContent,/未評価/);
console.log('Food environment: 19×3×2 canonical coverage, pot round-half-up/boundaries, missing data/null, ties, raw A/B/C weights, immutable recipes, camp cache/UI state and recipe links passed');

require('./check_rate_update_and_supply.cjs');

// The ingredient index includes every recipe, separately from the top-five role model.
const all=build(recipes,names,{capacity:1,allRecipes:true});
for(const cat of cats){assert.equal(all.top[cat].length,recipes.filter(r=>r.category===cat).length);for(const name of names){assert.equal(all.ingredients[name][cat].count,recipes.filter(r=>r.category===cat&&r.ingredients.some(i=>i.name===name)).length)}}
assert.equal(all.metric,'all_recipe_coverage');assert.equal(results.true.metric,'top5_recipe_coverage');assert(all.top[cats[0]].length>5);
