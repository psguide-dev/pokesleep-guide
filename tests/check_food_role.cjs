const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),root=require('node:path').resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root);
ctx.speciesKey=p=>ctx.window.PS_SPECIES_CATALOG.key(p);
ctx.renderIndividualEvaluation=()=>'<p>legacy</p>';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPageMarkup=html=>html;
vm.runInContext(fs.readFileSync(root+'/templates/core/13-role-model-helpers.html','utf8'),ctx);
vm.runInContext(fs.readFileSync(root+'/templates/core/15-food-role.html','utf8'),ctx);
const refs=JSON.parse(fs.readFileSync(root+'/assets/evaluation/food_fixed_pattern_v2.json'));
ctx.references=refs;vm.runInContext('foodRoleReferences=references',ctx);
const provenance=JSON.parse(fs.readFileSync(root+'/research/food-role-v2/engine-source-sha256.json'));
assert.equal(refs.engineCommit,provenance.referenceCommit);
for(const [file,hash] of Object.entries(provenance.sources))assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex'),hash,'Reference engine changed; review or regenerate food references: '+file);
let count=0;
for(const [key,ref] of Object.entries(refs.entries)){
 const [id,level,pattern]=JSON.parse(key),p=catalog.pokemon[ref.no];
 const item={id:'production-food',no:ref.no,speciesId:id,level:20,skillLevel:7,ribbonHours:2000,...structuredClone(ref.ideal.record),foodEvaluationLevel:level};
 const before=JSON.stringify(item),result=ctx.foodRoleEvaluation(item,p);
 assert.equal(result.status,'ready');assert.equal(result.pattern,pattern);assert(Math.abs(result.percent-100)<1e-8);assert.equal(JSON.stringify(item),before);
 assert(Math.abs(Object.values(result.foods).reduce((a,b)=>a+b,0)-result.value)<1e-8);
 assert.equal(ctx.foodRoleEvaluation({...item,skillLevel:1,ribbonHours:0},p).value,result.value);
 assert.equal(ctx.foodRoleEvaluation({...item,ingredients:{}},p).status,'pending');
 assert.equal(ctx.foodRoleEvaluation({...item,nature:''},p).status,'pending');
 const html=ctx.renderIndividualEvaluation(item,p);assert(html.includes('同構成の理想比'));assert(html.includes('個体／日'));assert(html.includes('理想／日'));
 assert(!html.includes('スキル適性'));assert(!html.includes('上回る構成 <b>'));
 if(level===60){const locked={...item,subskills:[...item.subskills,'','']};assert.equal(ctx.foodRoleEvaluation(locked,p).status,'ready','inactive empty slots do not invalidate active subskills')}
 count++;
}
assert.equal(count,54);assert.equal(ctx.renderIndividualEvaluation({level:20},catalog.pokemon[1]),'<p>legacy</p>','unsupported ingredient species keep their current evaluation');
assert.equal(ctx.foodRoleSupported({...catalog.pokemon[9],speciesId:'0009_costume'}),false);
console.log('Food production integration: 54 ideals, fixed patterns, daily totals, missing inputs, inactive slots, immutable registration and unchanged reference engine passed');
