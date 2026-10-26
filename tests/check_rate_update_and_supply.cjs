const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(process.cwd(),false);ctx.speciesKey=ctx.window.PS_SPECIES_CATALOG.key;
for(const name of ['13-role-model-helpers','15-gengar-reference','15-food-role','15-food-rank'])vm.runInContext(fs.readFileSync(`templates/core/${name}.html`,'utf8'),ctx);
const p=catalog.pokemon[94];assert.equal(p.foodRate,16.6);assert.equal(p.foodEvaluationReferencePending,false);
const requests=[];ctx.fetch=async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(url.split('?')[0],'utf8'))}};
(async()=>{
 let checked=0;
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;await ctx.loadFoodRoleReferences();
  const references=ctx.activeFoodRoleReferences(p);assert.equal(references.foodRate,16.6);assert.equal(references.conditions.camp,camp);assert.notEqual(references.engineFingerprint,ctx.activeFoodRoleReferences(catalog.pokemon[1]).engineFingerprint);
  for(const level of [60,70,80]){
   await ctx.loadFoodRankReferences(p,level);
   for(const ref of Object.values(references.entries).filter(r=>r.level===level)){
    const item={id:'gengar-updated',no:94,speciesId:'0094_default',level:1,foodEvaluationLevel:level,...structuredClone(ref.ideal.record)},before=JSON.stringify(item),e=ctx.foodRoleEvaluation(item,p);
    assert.equal(e.status,'ready',JSON.stringify(e));assert(Math.abs(e.percent-100)<1e-8);assert.equal(ctx.foodRankEvaluation(e,p).rank,'SS');assert.equal(e.camp,camp);assert.equal(JSON.stringify(item),before);checked++;
   }
  }
 }
 assert.equal(checked,36);assert.equal(requests.filter(x=>x.includes('/0094_default_')).length,3,'both camp states share validated distribution bytes');
 ctx.teamGoodCamp=true;const key=ctx.foodRankKey(p,80),ref=ctx.activeFoodRoleReferences(p).entries['["0094_default",80,"AAA"]'],item={id:'cache',no:94,foodEvaluationLevel:80,...ref.ideal.record},on=ctx.foodRoleEvaluation(item,p);
 ctx.teamGoodCamp=false;assert.equal(ctx.foodRankEvaluation(on,p).status,'pending');const off=ctx.foodRoleEvaluation(item,p);assert.notEqual(off.ideal,on.ideal);ctx.teamGoodCamp=true;assert.equal(ctx.foodRoleEvaluation(item,p),on);
 for(const edit of [d=>d.foodRate=16.1,d=>d.sourceCommit='stale',d=>d.engineFingerprint='stale',d=>d.conditions.sleepHours=8.5]){const bad=structuredClone(ctx.activeFoodRoleReferences(p));edit(bad);assert.throws(()=>ctx.validateGengarMetadata(bad))}
 // The schema has no unqualified fallback. Both camp states and all six scenarios are live.
 let camp=false;const supply=JSON.parse(fs.readFileSync('master/cooking/daily-supply.json','utf8')),ui={catalog:{dailySupply:supply},document:{getElementById:()=>({})},window:{PS:{getGoodCamp:()=>camp}}};vm.createContext(ui);
 vm.runInContext(fs.readFileSync('templates/recipes/03-daily-supply.html','utf8').split('\n').slice(0,3).join('\n'),ui);
 for(const c of [false,true]){camp=c;for(const id of Object.keys(supply.camps[c?'on':'off'].scenarios)){vm.runInContext(`supplyScenario=${JSON.stringify(id)}`,ui);assert.equal(vm.runInContext('currentSupply()',ui),supply.camps[c?'on':'off'].scenarios[id])}}
 const source=fs.readFileSync('templates/06-ingredients.html','utf8');assert(source.indexOf('id="ingredientDailyTiers"')<source.indexOf('id="ingredientSupplyBasis"'));
 console.log('Gengar: 36 ideal/SS checks, two isolated camp caches, stale metadata rejected; supply: all 12 explicit camp/scenario selections.');
})().catch(e=>{console.error(e);process.exitCode=1});
