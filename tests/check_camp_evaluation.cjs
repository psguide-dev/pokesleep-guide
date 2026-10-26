const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),root=path.resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root);ctx.speciesKey=ctx.window.PS_SPECIES_CATALOG.key;
require('./historical_food_catalog.cjs')(catalog);
ctx.renderIndividualEvaluation=()=>'';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPageMarkup=html=>html;
for(const name of ['13-individual-simple','13-role-model-helpers','14-berry-role','15-skill-role','15-food-role','15-food-role-details','15-food-role-view','15-food-role-controller'])vm.runInContext(fs.readFileSync(root+'/templates/core/'+name+'.html','utf8'),ctx);
let requests=[];ctx.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(root+'/'+url.split('?')[0]))}};
(async()=>{
 let checked=0,foodRefs=0,totalRefs=0;const onOff=[];
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;
  await ctx.loadFoodRoleReferences();const refs=ctx.activeFoodRoleReferences();assert.equal(refs.conditions.camp,camp);
  assert.equal(Object.keys(refs.species).length,83);assert.equal(Object.keys(refs.entries).length,1482);
  for(const [key,entry] of Object.entries(refs.entries)){
   const [id,level]=JSON.parse(key),p=ctx.window.PS_SPECIES({no:entry.no,speciesId:id}),item={id:'camp-food',no:entry.no,speciesId:id,level:1,foodEvaluationLevel:level,skillLevel:7,ribbonHours:2000,...structuredClone(entry.ideal.record)},before=JSON.stringify(item),e=ctx.foodRoleEvaluation(item,p);
   assert.equal(e.status,'ready',key);assert.equal(e.camp,camp);assert(Math.abs(e.percent-100)<1e-8,key);assert.equal(JSON.stringify(item),before);assert.equal(e.value,entry.ideal.value);foodRefs++;
  }
  for(const kind of ['berry','skill']){
   const manifest=JSON.parse(fs.readFileSync(root+'/assets/evaluation/'+kind+'_manifest_v'+(kind==='berry'?6:2)+(camp?'':'_off')+'.json'));
   for(const [id,meta] of Object.entries(manifest.species)){
    await (kind==='berry'?ctx.loadBerryModelReferences(id):ctx.loadSkillModelReferences(id));const table=ctx.window[kind==='berry'?'PS_BERRY_MODEL_DATA':'PS_SKILL_MODEL_DATA'];
    const part=JSON.parse(fs.readFileSync(root+'/'+meta.file)),p=ctx.window.PS_SPECIES({no:meta.no,speciesId:id});
    for(const entry of Object.values(part.entries)){
     const item={id:'camp-model',no:meta.no,speciesId:id,level:1,[kind+'EvaluationLevel']:entry.level,ribbonHours:2000,skillLevel:7,...structuredClone(entry.idealRecord),ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,entry.idealRecord.ingredients[i]]).filter(([l,n])=>n))},before=JSON.stringify(item),e=kind==='berry'?ctx.berryRoleEvaluation(item,p,entry.skillLevel):ctx.skillRoleEvaluation(item,p);
     assert.equal(e.status,'ready',id);assert.equal(e.value,entry.ideal,JSON.stringify({camp,kind,id,level:entry.level,skill:entry.skillLevel}));assert.equal(e.idealPercent,100);assert.equal(e.strongerUpper,0);assert.equal(JSON.stringify(item),before);checked++;
     if(id==='0026_default'&&entry.level===80)onOff.push(e.value);
    }
    if(kind==='berry')for(const entry of Object.values(part.totalEntries)){
     const item={id:'camp-total',no:meta.no,speciesId:id,level:1,berryEvaluationLevel:entry.level,ribbonHours:0,skillLevel:entry.skillLevel,...structuredClone(entry.idealRecord),ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,entry.idealRecord.ingredients[i]]).filter(([l,n])=>n))},e=ctx.berryRoleEvaluation(item,p,entry.skillLevel),total=ctx.berryTotalComparison(e);
     assert.equal(total.status,'ready',id);assert.equal(total.value,entry.ideal);assert.equal(total.strongerUpper,0);totalRefs++;
    }
   }
  }
 }
 assert.equal(checked,1368);assert.equal(foodRefs,2964);assert.equal(totalRefs,2072);assert.equal(onOff.length,2);assert(onOff[0]>onOff[1]);
 const before=requests.length;ctx.teamGoodCamp=true;await ctx.loadFoodRoleReferences();await ctx.loadBerryModelReferences('0026_default');await ctx.loadSkillModelReferences('0181_default');assert.equal(requests.length,before,'switching back reuses only the matching condition');
 const p=catalog.pokemon[6],entry=Object.values(ctx.activeFoodRoleReferences().entries).find(e=>e.no===6&&e.level===80),item={id:'cache-toggle',no:6,speciesId:'0006_default',level:1,foodEvaluationLevel:80,...entry.ideal.record},on=ctx.foodRoleEvaluation(item,p),keyOn=ctx.individualTrialKey(item,p);
 ctx.teamGoodCamp=false;const off=ctx.foodRoleEvaluation(item,p);assert.notEqual(ctx.individualTrialKey(item,p),keyOn);assert(on.value>off.value);assert.notEqual(off.ideal,on.ideal);ctx.teamGoodCamp=true;assert.equal(ctx.foodRoleEvaluation(item,p),on);
 // An OFF response arriving after switching back must not replace the ON table.
 vm.runInContext('campReferenceStore(false).values.PS_SKILL_MODEL_DATA=null;campReferenceStore(false).loads.clear()',ctx);ctx.teamGoodCamp=false;let release;const pending=[];
 ctx.fetch=url=>new Promise(resolve=>{pending.push({url,resolve});release=resolve});
 const late=ctx.loadSkillModelReferences();await Promise.resolve();assert.equal(pending.length,1);ctx.teamGoodCamp=true;const saved=ctx.window.PS_SKILL_MODEL_DATA;release({ok:true,json:async()=>JSON.parse(fs.readFileSync(root+'/'+pending[0].url))});await late;assert.equal(ctx.window.PS_SKILL_MODEL_DATA,saved);assert(ctx.window.PS_SKILL_MODEL_DATA.conditions.ticket!==false);
 console.log(JSON.stringify({foodIdeals:foodRefs,berrySkillIdeals:checked,convertedBerryIdeals:totalRefs,conditions:2,cacheIsolation:true,lateResponseIsolation:true,immutableRecords:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
