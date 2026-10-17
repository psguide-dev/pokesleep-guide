const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),root=require('node:path').resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root,false);
ctx.speciesKey=p=>ctx.window.PS_SPECIES_CATALOG.key(p);ctx.renderIndividualEvaluation=()=>'';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPageMarkup=html=>html;ctx.evaluationPage=false;
for(const file of ['13-role-model-helpers','15-food-role','15-food-rank','15-food-role-details','15-food-role-view','15-food-role-controller'])vm.runInContext(fs.readFileSync(`${root}/templates/core/${file}.html`,'utf8'),ctx);
const read=path=>JSON.parse(fs.readFileSync(`${root}/${path}`)),p=catalog.pokemon[405],catalogBefore=JSON.stringify(catalog);
let requests=[],failRank=false;
ctx.fetch=async url=>{requests.push(url);if(failRank&&url.includes('food_rank'))return {ok:false};return {ok:true,json:async()=>read(url.split('?')[0])}};
(async()=>{
 let checked=0;
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;const data=await ctx.loadFoodRankReferences(p,80),references=ctx.activeFoodRoleReferences();
  assert.equal(data.conditions.camp,camp);assert.equal(Object.keys(data.entries).length,6);assert.equal(data.count,154700);
  const before=JSON.stringify(data);
  for(const [pattern,row] of Object.entries(data.entries)){
   const ref=references.entries[JSON.stringify(['0405_default',80,pattern])],item={id:'rank-test',no:405,speciesId:'0405_default',level:62,foodEvaluationLevel:80,skillLevel:7,ribbonHours:2000,...structuredClone(ref.ideal.record)},itemBefore=JSON.stringify(item);
   const e=ctx.foodRoleEvaluation(item,p),rank=ctx.foodRankEvaluation(e,p);assert.equal(e.status,'ready');assert.equal(rank.status,'ready');assert.equal(rank.rank,'SS');assert.equal(rank.strongerCount,0);assert.equal(rank.strongerPercent,0);assert.equal(JSON.stringify(item),itemBefore);
   assert.equal(row.distribution.reduce((n,[,weight])=>n+weight,0),154700);assert.equal(row.ideal,e.ideal);
   let previous=100;
   for(let i=0;i<=20;i++){
    const value=row.ideal*i/20,r=ctx.foodRankEvaluation({...e,value},p),expected=row.distribution.reduce((n,[v,weight])=>n+(v>value+1e-9?weight:0),0);
    assert.equal(r.strongerCount,expected);assert.equal(r.strongerPercent,100*expected/154700);assert(r.strongerPercent<=previous);previous=r.strongerPercent;checked++;
   }
   for(const [value] of row.distribution){const r=ctx.foodRankEvaluation({...e,value},p);assert.equal(r.strongerCount,row.distribution.reduce((n,[v,weight])=>n+(v>value+1e-9?weight:0),0),'equal yield is not stronger');checked++}
   assert.equal(ctx.foodRankEvaluation({...e,value:row.ideal+1},p).status,'pending');assert.equal(ctx.foodRankEvaluation({...e,value:NaN},p).status,'pending');assert.equal(ctx.foodRankEvaluation({...e,camp:!camp},p).status,'pending');assert.equal(ctx.foodRankEvaluation({...e,skillLevel:7},p).status,'pending');assert.equal(ctx.foodRankEvaluation({...e,ideal:e.ideal+1},p).status,'pending');
   const html=ctx.renderFoodRole(item,p);assert.match(html,/SS（試作）/);assert.match(html,/上回る構成 0%/);assert(!html.includes('ランク準備中'));
   ctx.evaluationPage=true;const detail=ctx.renderFoodRole(item,p);assert.match(detail,/154,700構成/);assert.match(detail,/捕獲・厳選成功/);ctx.evaluationPage=false;
  }
  assert.equal(JSON.stringify(data),before,'ranking does not mutate reference data');
  const invalid=[];
  for(const change of [d=>d.conditions.camp=!camp,d=>d.engineFingerprint='stale',d=>d.count=1,d=>d.entries.AAA.distribution[0][1]++,d=>d.entries.AAA.distribution.reverse(),d=>d.entries.AAA.ideal++,d=>delete d.entries.ABC,d=>d.entries.AAA.distribution[0][0]=-1,d=>d.conditions.ribbonHours=1000]){const copy=structuredClone(data);change(copy);invalid.push(copy)}
  for(const bad of invalid)assert.throws(()=>ctx.validateFoodRankData(bad,camp,references,p,80));
 }
 const recovery=catalog.pokemon[71];
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;const data=await ctx.loadFoodRankReferences(recovery,80),references=ctx.activeFoodRoleReferences(),before=JSON.stringify(data);
  assert.equal(data.evaluatedSignatures,19551);assert.equal(data.speciesId,'0071_default');
  assert.throws(()=>ctx.validateFoodRankData(data,camp,references,p,80),'another species must not reuse the recovery distribution');
  for(const [pattern,row] of Object.entries(data.entries)){
   const ref=references.entries[JSON.stringify(['0071_default',80,pattern])],item={id:'recovery-rank-test',no:71,speciesId:'0071_default',level:62,foodEvaluationLevel:80,...structuredClone(ref.ideal.record)},before=JSON.stringify(item);
   const e=ctx.foodRoleEvaluation(item,recovery),rank=ctx.foodRankEvaluation(e,recovery);
   assert.equal(e.status,'ready');assert.equal(rank.status,'ready');assert.equal(rank.rank,'SS');assert.equal(rank.strongerCount,0);assert.equal(JSON.stringify(item),before);
   assert.equal(row.distribution.reduce((sum,[,weight])=>sum+weight,0),154700);assert(Math.abs(e.ideal-row.ideal)<1e-9);
   let remaining=row.count,next=0;
   for(const [value] of row.distribution){
    while(next<row.distribution.length&&row.distribution[next][0]<=value+1e-9)remaining-=row.distribution[next++][1];
    assert.equal(ctx.foodRankEvaluation({...e,value},recovery).strongerCount,remaining,'equal/tolerance yields excluded with original weights');checked++;
   }
   ctx.evaluationPage=true;assert.match(ctx.renderFoodRole(item,recovery),/自身の回復が通常食材収集へ与える影響/);ctx.evaluationPage=false;
  }
  assert.equal(JSON.stringify(data),before);await assert.rejects(ctx.loadFoodRankReferences(recovery,70));
 }
 ctx.teamGoodCamp=true;
 const recoveryItem={id:'rate-rank',no:71,level:62,foodEvaluationLevel:80,nature:'がんばりや',subskills:['食材確率アップM','食材確率アップS','おてつだいスピードM','おてつだいスピードS','リサーチEXPボーナス'],ingredients:Object.fromEntries(recovery.ingredientSlots.map(slot=>[slot.unlock,slot.candidates[0].name]))};
 const first=ctx.foodRoleEvaluation(recoveryItem,recovery),boosted=ctx.foodRoleEvaluation({...recoveryItem,subskills:[...recoveryItem.subskills.slice(0,4),'スキル確率アップM']},recovery);
 assert(boosted.value>first.value,'recovery-linked skill probability must survive grouping');assert(ctx.foodRankEvaluation(boosted,recovery).strongerCount<=ctx.foodRankEvaluation(first,recovery).strongerCount);
 await assert.rejects(ctx.loadFoodRankReferences(catalog.pokemon[122],80));
 assert.equal(JSON.stringify(catalog),catalogBefore);ctx.teamGoodCamp=true;const requestsBefore=requests.length;await ctx.loadFoodRankReferences(p,80);assert.equal(requests.length,requestsBefore,'camp switch back uses its own cached data');assert.equal(requests.filter(url=>url.includes('food_rank')).length,4);
 const refs=ctx.activeFoodRoleReferences(),ref=refs.entries[JSON.stringify(['0405_default',80,'ABC'])],e={status:'ready',level:80,pattern:'ABC',value:92.8,ideal:ref.ideal.value,skillLevel:3,camp:true};
 assert.equal(ctx.foodRankEvaluation(e,p).rank,'A','rounded screenshot example is a fixture, not the registered individual');
 const aaa={...e,pattern:'AAA',ideal:refs.entries[JSON.stringify(['0405_default',80,'AAA'])].ideal.value};assert.equal(ctx.foodRankEvaluation({...aaa,value:aaa.ideal*.6},p).rank,'B');assert.equal(ctx.foodRankEvaluation({...e,value:e.ideal*.6},p).rank,'A','ideal percent alone does not determine rank');
 assert.equal(ctx.foodRankEvaluation({...e,level:70},p).status,'pending');assert.equal(ctx.foodRankEvaluation(e,catalog.pokemon[9]).status,'pending');assert.equal(ctx.foodRankEvaluation(e,catalog.pokemon[122]).status,'pending');
 // Failed fetch is visible and retryable; the ideal/food model remains available.
 const store=ctx.campReferenceStore();delete store.values[ctx.foodRankKey(p,80)];store.loads.delete(ctx.foodRankKey(p,80));failRank=true;await assert.rejects(ctx.loadFoodRankReferences(p,80));assert.match(ctx.foodRankEvaluation(e,p).text,/読み込みに失敗/);assert(ctx.activeFoodRoleReferences());failRank=false;await ctx.loadFoodRankReferences(p,80);assert.equal(ctx.foodRankEvaluation(e,p).rank,'A');
 console.log(`Food rank: ${checked} exact weighted/rank checks, 24 pattern/camp distributions across Luxray and Victreebel, current ON/OFF ideals, equal yields, incomplete references, lazy cache/retry, scope limits and immutable inputs passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
