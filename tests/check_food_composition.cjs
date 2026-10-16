const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8'),strip=source=>source.replace(/<\/?script[^>]*>/g,''),catalog=JSON.parse(read('review.html').match(/window.PS_CATALOG=(.*);\n/)[1]);
let camp=true,baseRender=0,baseBind=0;
const ctx={window:{PS_CATALOG:catalog,PS_IMAGE_FILES:{berries:{}}},boxEsc:s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),evaluationPage:true,evaluationLink:item=>'<a class="psg-evaluation-page-link">詳しい評価を見る</a>',evaluationGoodCamp:()=>camp,evaluationCampLabel:()=>`キャンチケ${camp?'あり':'なし'}`,renderIndividualEvaluation:()=>{baseRender++;return '<p>収集力</p>'},bindIndividualEvaluation:()=>{baseBind++},speciesKey:p=>ctx.window.PS_SPECIES_CATALOG.key(p),berryRoleLevel:item=>[50,60,70,80].includes(item.berryEvaluationLevel)?item.berryEvaluationLevel:50,skillRoleLevel:item=>[50,60,70,80].includes(item.skillEvaluationLevel)?item.skillEvaluationLevel:50};
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
assert.equal(ctx.renderIndividualEvaluation(item,p,{compact:true}),'<p>収集力</p>');ctx.evaluationPage=false;const pendingEntry=ctx.renderIndividualEvaluation(item,p);assert(pendingEntry.includes('psg-evaluation-page-link'));assert(!pendingEntry.includes('食材構成の料理適性'));ctx.evaluationPage=true;
assert.equal(ctx.foodCompositionLevel({berryEvaluationLevel:70},{specialty:'きのみ'}),70);assert.equal(ctx.foodCompositionLevel({skillEvaluationLevel:60},{specialty:'スキル'}),60);assert.equal(ctx.foodCompositionLevel({},p),80);
camp=false;const off=ctx.renderIndividualEvaluation(item,p);assert.notEqual(off,html);assert.match(off,/通常最大鍋81 → 81個/);camp=true;assert.equal(ctx.renderIndividualEvaluation(item,p),html);
// Model code is present exactly once in every generated document; cooking is still lazy.
for(const name of ['review','pokemon','evaluation','ingredients','recipes','fields']){const doc=read(name+'.html');assert.equal((doc.match(/id="psg-food-environment-model"/g)||[]).length,1);if(name==='evaluation')assert(!doc.includes('<script src="packages/cooking-view-'))}
console.log(`Food composition: ${count} condition/pattern checks across ${distinct.size} identities; A/AB/ABC, duplicate food weights, missing data, zero/null, read-only inputs, level/camp UI, separate role axis and single shared model passed`);
