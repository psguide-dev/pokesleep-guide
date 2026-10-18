const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8'),strip=source=>source.replace(/<\/?script[^>]*>/g,''),catalog=JSON.parse(read('review.html').match(/window.PS_CATALOG=(.*);\n/)[1]);
let camp=true,baseRender=0,baseBind=0;
const ctx={window:{PS_CATALOG:catalog,PS_IMAGE_FILES:{berries:{}}},boxEsc:s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),placeEvaluationControls:()=>{},evaluationPage:true,evaluationLink:item=>'<a class="psg-evaluation-page-link">詳しい評価を見る</a>',evaluationGoodCamp:()=>camp,evaluationCampLabel:()=>`キャンチケ${camp?'あり':'なし'}`,renderIndividualEvaluation:()=>{baseRender++;return '<div class="psg-food-role"><p>収集力</p></div>'},bindIndividualEvaluation:()=>{baseBind++},speciesKey:p=>ctx.window.PS_SPECIES_CATALOG.key(p),berryRoleLevel:item=>[50,60,70,80].includes(item.berryEvaluationLevel)?item.berryEvaluationLevel:50,skillRoleLevel:item=>[50,60,70,80].includes(item.skillEvaluationLevel)?item.skillEvaluationLevel:50};
vm.createContext(ctx);
for(const file of ['templates/00-number-format.html','templates/01-species-catalog.html','templates/00-food-environment.html','templates/core/15-food-role.html'])vm.runInContext(strip(read(file)),ctx);
const fields=read('templates/core/08-fields.html');ctx.potCapacities=catalog.cooking.pot['拡張表'].map(r=>r['容量']);vm.runInContext(fields.slice(fields.indexOf('function calculatePotCapacity('),fields.indexOf('function cookingContext(')),ctx);
vm.runInContext(read('templates/core/16-food-composition.html'),ctx);
const environment=()=>ctx.window.PS_FOOD_ENVIRONMENT.current(catalog,camp,ctx.calculatePotCapacity),plain=value=>JSON.parse(JSON.stringify(value));
let count=0,distinct=new Set();
const species=[...Object.values(catalog.pokemon),...(catalog.forms.species||[]).map(p=>ctx.window.PS_SPECIES(p))].filter(p=>p?.ingredientSlots?.length&&!p.mythicalSettings);
for(const p of species){
 const active=p.ingredientSlots.filter(slot=>slot.unlock<=80);if(active.some(slot=>!slot.candidates?.length))continue;
 function visit(index,ingredients){
  if(index<active.length){const slot=active[index];for(const candidate of slot.candidates)visit(index+1,{...ingredients,[slot.unlock]:candidate.name});return}
  const item={level:1,ingredients,nature:'',subskills:[]},before=JSON.stringify(item);
  for(const goodCamp of [false,true]){camp=goodCamp;const env=environment(),e=ctx.foodCompositionEvaluation(item,p,80,env);assert.equal(e.status,'ready',p.name+JSON.stringify(ingredients));
   const total=active.reduce((sum,slot)=>sum+slot.candidates.find(c=>c.name===ingredients[slot.unlock]).qty,0);
   for(const category of env.categories){const expected=active.reduce((sum,slot)=>{const candidate=slot.candidates.find(c=>c.name===ingredients[slot.unlock]);return sum+candidate.qty/total*env.ingredients[candidate.name][category].coverage},0);assert.equal(e.scores[category],expected)}
   const matchBefore=JSON.stringify([env,e.slots]),fit=ctx.window.PS_FOOD_ENVIRONMENT.matchRecipes(env,e.slots);
   for(const category of env.categories){
    const expected=env.top[category].filter(recipe=>recipe.ingredients.some(food=>e.slots.some(slot=>slot.name===food.name)));
    assert.deepEqual(plain(fit[category].recipes.map(recipe=>recipe.id)),plain(expected.map(recipe=>recipe.id)));
    for(const recipe of fit[category].recipes){
     assert.equal(recipe.rank,env.top[category].findIndex(row=>row.id===recipe.id)+1);
     const original=env.top[category][recipe.rank-1];assert.equal(recipe.energy,original.energy.max.value);
     assert.deepEqual(plain([...recipe.matched,...recipe.other].sort((a,b)=>a.name.localeCompare(b.name))),plain(original.ingredients.map(food=>({name:food.name,recipeQuantity:food.qty})).sort((a,b)=>a.name.localeCompare(b.name))));
    }
   }
   assert.equal(JSON.stringify([env,e.slots]),matchBefore,'recipe matching is read only');
   assert(Math.abs(e.foods.reduce((sum,row)=>sum+row.share,0)-100)<1e-10);count++;
  }
  assert.equal(JSON.stringify(item),before);distinct.add(p.name);
 }
 visit(0,{});
}
camp=true;const env=environment(),p={specialty:'食材',ingredientSlots:[{unlock:1,candidates:[{name:'リラックスカカオ',qty:2}]},{unlock:30,candidates:[{name:'リラックスカカオ',qty:5},{name:'モーモーミルク',qty:4}]},{unlock:60,candidates:[{name:'リラックスカカオ',qty:7},{name:'モーモーミルク',qty:8},{name:'あまいミツ',qty:6}]}]},item={id:'unchanged',level:1,ingredients:{1:'リラックスカカオ',30:'モーモーミルク',60:'あまいミツ'},subskills:[],nature:''};
const e80=ctx.foodCompositionEvaluation(item,p,80,env);assert.equal(e80.pattern,'ABC');assert.equal(e80.slots.length,3);
const e30=ctx.foodCompositionEvaluation({...item,ingredients:{1:'リラックスカカオ',30:'モーモーミルク'}},p,30,env);assert.equal(e30.pattern,'AB');assert.equal(e30.slots.length,2);assert.equal(ctx.foodCompositionEvaluation({ingredients:{}},p,1,env).status,'ready','sole candidates fill only their own unlocked slots');assert.equal(ctx.foodCompositionEvaluation({ingredients:{}},p,30,env).status,'pending','multi-candidate slots remain unknown');
const aaa=ctx.foodCompositionEvaluation({...item,ingredients:{1:'リラックスカカオ',30:'リラックスカカオ',60:'リラックスカカオ'}},p,80,env);assert.equal(aaa.foods.length,1);assert.equal(aaa.foods[0].qty,14);assert.equal(aaa.foods[0].share,100);assert.equal(aaa.pattern,'AAA');
assert.deepEqual(plain(ctx.foodCompositionEvaluation({...item,nature:'れいせい',subskills:['食材確率アップM'],ribbonHours:2000},p,80,env).scores),plain(e80.scores));
assert.equal(ctx.foodCompositionEvaluation(item,{...p,mythicalSettings:{}},80,env).status,'pending');
for(const qty of [null,0,NaN])assert.equal(ctx.foodCompositionEvaluation(item,{...p,ingredientSlots:[{unlock:1,candidates:[{name:'リラックスカカオ',qty}]}]},80,env).status,'pending');
const empty=ctx.window.PS_FOOD_ENVIRONMENT.build([],Object.keys(catalog.ingredientAssets),{capacity:81}),emptyResult=ctx.foodCompositionEvaluation(item,p,80,empty);assert(Object.values(emptyResult.scores).every(v=>v===null));
assert(Object.values(ctx.foodCompositionEvaluation({ingredients:{1:'おいしいシッポ'}},{ingredientSlots:[{unlock:1,candidates:[{name:'おいしいシッポ',qty:1}]}]},80,env).scores).every(v=>v===0),'known non-use is zero, not null');
ctx.foodRoleSupported=species=>species===p; // Exercise integration with a supported food specialist, without daily-model work.
const html=ctx.renderIndividualEvaluation(item,p);assert.match(html,/食材構成の料理適性/);assert.match(html,/Lv.80（予測）/);assert.match(html,/ABC/);assert.match(html,/収集力/);assert.match(html,/3食分の供給/);assert(!html.includes('SS〜C'));
const before=JSON.stringify(item);const at60=ctx.renderIndividualEvaluation({...item,foodEvaluationLevel:60},p);assert.match(at60,/評価Lv.60の解放枠/);assert.equal(JSON.stringify(item),before);
assert.equal(ctx.renderIndividualEvaluation(item,p,{compact:true}),'<div class="psg-food-role"><p>収集力</p></div>');
ctx.evaluationPage=false;
assert.equal(ctx.renderIndividualEvaluation(item,p),'<div class="psg-food-role"><p>収集力</p></div>','box rendering leaves heading entry ownership to the page controller');
let controlCalls=0;
const host={};ctx.placeEvaluationControls=(givenHost,givenItem,givenSpecies)=>{assert.equal(givenHost,host);assert.equal(givenItem,item);assert.equal(givenSpecies,p);controlCalls++};
ctx.bindIndividualEvaluation(host,item,p);ctx.bindIndividualEvaluation(host,item,p);assert.equal(controlCalls,2,'binding always synchronizes the persistent heading for pending and ready panels');
ctx.evaluationPage=true;
assert.equal(ctx.foodCompositionLevel({berryEvaluationLevel:70},{specialty:'きのみ'}),70);assert.equal(ctx.foodCompositionLevel({skillEvaluationLevel:60},{specialty:'スキル'}),60);assert.equal(ctx.foodCompositionLevel({},p),80);
camp=false;const off=ctx.renderIndividualEvaluation(item,p);assert.notEqual(off,html);assert.match(off,/通常最大鍋81 → 81個/);camp=true;assert.equal(ctx.renderIndividualEvaluation(item,p),html);
// Model code is present exactly once in every generated document; cooking is still lazy.
for(const name of ['review','pokemon','evaluation','ingredients','recipes','fields']){const doc=read(name+'.html');assert.equal((doc.match(/id="psg-food-environment-model"/g)||[]).length,1);if(name==='evaluation')assert(!doc.includes('<script src="packages/cooking-view-'))}
console.log(`Food composition: ${count} condition/pattern checks across ${distinct.size} identities; A/AB/ABC, duplicate food weights, missing data, zero/null, read-only inputs, level/camp UI, separate role axis and single shared model passed`);

const expectedFits=JSON.parse(read('tests/fixtures/recipe-fit-preview-v1.json'));
let previewCount=0;
for(const goodCamp of [false,true]){
 camp=goodCamp;const env=environment();
 for(const [name,expected] of Object.entries(expectedFits[String(env.condition.capacity)])){
  const [speciesName,pattern]=name.split(' '),p=species.find(p=>p.name===speciesName);assert(p,speciesName);
  const ingredients=Object.fromEntries(p.ingredientSlots.map((slot,index)=>[slot.unlock,slot.candidates[pattern.charCodeAt(index)-65].name]));
  const evaluation=ctx.foodCompositionEvaluation({ingredients},p,80,env);
  assert.deepEqual(plain(ctx.window.PS_FOOD_ENVIRONMENT.matchRecipes(env,evaluation.slots)),expected,name+' '+goodCamp);previewCount++;
 }
}
const match=ctx.window.PS_FOOD_ENVIRONMENT.matchRecipes;
assert.equal(match(env,[]),null);assert.equal(match(env,[{name:'unknown',qty:1}]),null);assert.equal(match(env,[{name:'あまいミツ',qty:0}]),null);
const missing=match(empty,[{name:'あまいミツ',qty:1}]);assert(Object.values(missing).every(row=>row.status==='pending'&&row.recipes.length===0));
const noUse=match(env,[{name:'おいしいシッポ',qty:1}]);assert(Object.values(noUse).every(row=>row.status==='ready'&&row.recipes.length===0));
assert.deepEqual(plain(match(env,[{name:'あまいミツ',qty:1},{name:'あまいミツ',qty:4}])),plain(match(env,[{name:'あまいミツ',qty:1}])));
const rendered=ctx.renderCompositionRecipes(env,e80.slots);assert.match(rendered,/必要な食材を見る/);assert.match(rendered,/料理エナジー（Lv70）/);assert.match(rendered,/この構成で拾える材料/);assert.match(rendered,/data-composition-disclosure/);
console.log(`Recipe fit: ${count} conditions, ${previewCount} preview parity examples; category ranks, energy, materials, no duplicates, missing versus no matches passed`);
