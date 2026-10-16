const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root);
ctx.speciesKey=p=>ctx.window.PS_SPECIES_CATALOG.key(p);ctx.renderIndividualEvaluation=()=>'<p>legacy</p>';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPageMarkup=html=>html;
for(const file of ['13-role-model-helpers','15-food-role','15-food-role-details','15-food-role-view','15-food-role-controller'])vm.runInContext(fs.readFileSync(root+'/templates/core/'+file+'.html','utf8'),ctx);
const parts=['food_direct_v3','food_recovery_v4'].flatMap(group=>[60,70,80].map(level=>JSON.parse(fs.readFileSync(root+'/assets/evaluation/'+group+'_'+level+'.json'))));
const refs={...parts[0],version:4,species:Object.assign({},...parts.map(part=>part.species)),entries:Object.assign({},...parts.map(part=>part.entries))},inventory=JSON.parse(fs.readFileSync(root+'/research/food-expansion-prep/inventory.json'));
parts.forEach((part,i)=>{assert.equal(part.level,[60,70,80][i%3]);assert.equal(part.engineFingerprint,refs.engineFingerprint)});
const digest=crypto.createHash('sha256').update(JSON.stringify(catalog)).update(require('./daily_kernel.cjs'));
for(const file of inventory.sourceFiles)digest.update(fs.readFileSync(root+'/'+file));
assert.equal(digest.digest('hex'),refs.engineFingerprint,'Reference inputs or daily engine changed; regenerate references');
assert.equal(refs.version,4);assert.equal(refs.axis,'normalFoodsFixedPattern');assert.equal(refs.scope.fullExpansion,false);
const direct=inventory.rows.filter(row=>row.stage==='direct');assert.equal(direct.length,58);assert.equal(Object.keys(refs.species).length,83);assert.equal(Object.keys(refs.entries).length,1482);
ctx.refs=refs;vm.runInContext('foodRoleReferences=refs',ctx);
let count=0;
for(const row of inventory.rows){
 const p=ctx.window.PS_SPECIES({no:row.no,speciesId:row.id});
 assert.equal(ctx.foodRoleSupported(p),['direct','recovery'].includes(row.stage),'Eligibility must preserve form identity and stage');
 if(!['direct','recovery'].includes(row.stage))continue;
 for(const level of [60,70,80]){
  const entries=Object.entries(refs.entries).filter(([key])=>{const [id,lv]=JSON.parse(key);return id===row.id&&lv===level});assert.equal(entries.length,row.patterns);
  for(const [key,ref] of entries){
   const item={id:'expanded-food',no:row.no,speciesId:row.id,level:1,foodEvaluationLevel:level,ribbonHours:2000,skillLevel:7,...structuredClone(ref.ideal.record)},before=JSON.stringify(item),e=ctx.foodRoleEvaluation(item,p);
   assert.equal(e.status,'ready',key);assert(Math.abs(e.percent-100)<1e-8,key);assert.equal(e.pattern,JSON.parse(key)[2]);
   assert.equal(JSON.stringify(item),before);assert(Math.abs(Object.values(e.foods).reduce((sum,q)=>sum+q,0)-e.value)<1e-8);
   assert.equal(ctx.foodRoleEvaluation({...item,ingredients:{}},p).status,'pending');count++;
   if(row.stage==='recovery'&&e.pattern==='AAA')for(const nature of ['がんばりや','おっとり','しんちょう']){
    const candidate={...item,nature,subskills:['きのみの数S','スキル確率アップM','食材確率アップM','おてつだいボーナス','最大所持数アップL']},result=ctx.foodRoleEvaluation(candidate,p);
    assert.equal(result.status,'ready',row.id+' '+level+' '+nature);assert(result.percent<=100+1e-8);
   }
  }
 }
}
const old=JSON.parse(fs.readFileSync(root+'/assets/evaluation/food_fixed_pattern_v2.json'));
for(const [key,ref] of Object.entries(old.entries))assert.deepEqual(refs.entries[key],ref,'Existing three-species ideal changed');
assert.equal(ctx.foodRoleLevel({}),80);assert.equal(ctx.foodRoleLevel({foodEvaluationLevel:60}),60);assert.equal(ctx.foodRoleLevel({foodEvaluationLevel:70}),70);
assert(ctx.renderIndividualEvaluation({no:122,level:20},catalog.pokemon[122]).includes('legacy'));
console.log(`Food expansion: ${count} ideal references for 83 identities, missing inputs, immutable inputs, unchanged 54 original references and exact engine fingerprint passed`);
// Exercise the actual asynchronous six-part production loader and its failure/retry path.
(async()=>{
 let invalid=true;const requested=[];
 ctx.fetch=url=>{requested.push(url);const level=Number(url.match(/_(60|70|80)\.json$/)?.[1]),part=structuredClone(parts.find(p=>p.level===level&&p.version===(url.includes('recovery')?4:3)));if(invalid&&level===70)part.version=0;return Promise.resolve({ok:true,json:()=>Promise.resolve(part)})};
 vm.runInContext('foodRoleReferences=null;foodRoleLoading=null;foodRoleError=null',ctx);
 await assert.rejects(ctx.loadFoodRoleReferences());
 invalid=false;const loaded=await ctx.loadFoodRoleReferences();assert.equal(Object.keys(loaded.entries).length,1482);assert.equal(requested.length,12);
 const ref=Object.values(loaded.entries).find(r=>r.no===1&&r.level===80),item={id:'default-80',no:1,speciesId:'0001_default',level:1,...structuredClone(ref.ideal.record)},before=JSON.stringify(item),e=ctx.foodRoleEvaluation(item,catalog.pokemon[1]);
 assert.equal(e.level,80);assert.equal(e.status,'ready');assert.equal(JSON.stringify(item),before);
 console.log('Food expansion loader: six level parts, mismatched version rejection, retry and initial Lv80 passed');
})().catch(error=>{console.error(error);process.exitCode=1});
