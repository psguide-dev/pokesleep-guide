const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),root=path.resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root,false);
ctx.speciesKey=p=>ctx.window.PS_SPECIES_CATALOG.key(p);ctx.renderIndividualEvaluation=()=>'';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPageMarkup=html=>html;ctx.evaluationPage=false;
for(const file of ['13-role-model-helpers','15-food-role','15-food-rank','15-food-role-details','15-food-role-view','15-food-role-controller'])vm.runInContext(fs.readFileSync(`${root}/templates/core/${file}.html`,'utf8'),ctx);
const read=file=>JSON.parse(fs.readFileSync(`${root}/${file}`)),manifest=read('assets/evaluation/food_rank_v2/manifest.json'),beforeCatalog=JSON.stringify(catalog);
let requests=[];const fetchLocal=async url=>{requests.push(url);return {ok:true,json:async()=>read(url.split('?')[0])}};ctx.fetch=fetchLocal;
const resolve=id=>ctx.window.PS_SPECIES({no:Number(id.split('_')[0]),speciesId:id});
const outputRequests=()=>requests.filter(url=>url.includes('food_rank_v2/output/'));
(async()=>{
 ctx.teamGoodCamp=true;const luxray=resolve('0405_default');await ctx.loadFoodRankReferences(luxray,80);assert.equal(outputRequests().length,1,'first evaluation loads only its species/level');
 assert(outputRequests()[0].includes('0405_default_80.json'));assert.equal(requests.filter(url=>url.includes('food_rank_v2/manifest')).length,1);
 let checked=0,conditions=0;const identities=new Set(),samples=new Map();
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;
  for(const meta of manifest.files){
   const p=resolve(meta.speciesId),data=await ctx.loadFoodRankReferences(p,meta.level),references=ctx.activeFoodRoleReferences(),before=JSON.stringify(data);identities.add(meta.speciesId);
   for(const row of Object.values(data.entries).filter(row=>row.camp===camp)){
    const ref=references.entries[JSON.stringify([meta.speciesId,meta.level,row.pattern])],item={id:'all-rank',no:p.no,speciesId:meta.speciesId,level:1,foodEvaluationLevel:meta.level,...structuredClone(ref.ideal.record)},beforeItem=JSON.stringify(item);
    const e=ctx.foodRoleEvaluation(item,p),r=ctx.foodRankEvaluation(e,p);assert.equal(e.status,'ready');assert.equal(r.status,'ready');assert.equal(r.rank,'SS');assert.equal(r.strongerCount,0);assert.equal(r.count,({60:17000,70:59500,80:154700})[meta.level]);assert.equal(JSON.stringify(item),beforeItem);
    assert(Math.abs(e.ideal-row.ideal)<1e-9);assert.equal(row.distribution.reduce((sum,[,weight])=>sum+weight,0),row.count);
    for(const value of [0,row.ideal*.6,row.ideal*.95,...[0,Math.floor(row.distribution.length/2),row.distribution.length-1].map(index=>row.distribution[index][0])]){
     const ranked=ctx.foodRankEvaluation({...e,value},p),expected=row.distribution.reduce((sum,[v,weight])=>sum+(v>value+1e-9?weight:0),0);assert.equal(ranked.strongerCount,expected);assert.equal(ranked.strongerPercent,100*expected/row.count);checked++;
    }
    for(const invalid of [{value:NaN},{value:row.ideal+1},{ideal:e.ideal+1},{camp:!camp},{skillLevel:99}])assert.equal(ctx.foodRankEvaluation({...e,...invalid},p).status,'pending');
    if(row.pattern==='AAA'){
     assert.match(ctx.renderFoodRole(item,p),/>SS<\/strong>/);ctx.evaluationPage=true;const html=ctx.renderFoodRole(item,p);assert(html.includes(row.count.toLocaleString('ja-JP')+'構成'));if(meta.stage==='recovery')assert.match(html,/自身の回復が通常食材収集へ与える影響/);ctx.evaluationPage=false;
    }
    samples.set(JSON.stringify([meta.speciesId,meta.level,camp]),{p,e,item});conditions++;
   }
   assert.equal(JSON.stringify(data),before);
  }
 }
 assert.equal(identities.size,83);assert.equal(conditions,2964);assert.equal(outputRequests().length,249,'each species/level file is reused across both camp conditions');assert.equal(JSON.stringify(catalog),beforeCatalog);
 ctx.teamGoodCamp=true;const sample=samples.get(JSON.stringify(['0405_default',80,true])),{p,e}=sample;
 assert.equal(ctx.foodRankEvaluation({...e,pattern:'ABC',ideal:ctx.activeFoodRoleReferences().entries[JSON.stringify(['0405_default',80,'ABC'])].ideal.value,value:92.8},p).rank,'A');
 for(const level of [1,50,90])assert.equal(ctx.foodRankSupported(p,level),false);for(const no of [122,132,439,442,151,491])assert.equal(ctx.foodRankSupported(catalog.pokemon[no],80),false);
 await assert.rejects(ctx.loadFoodRankReferences(catalog.pokemon[122],80));assert.equal(ctx.foodRankEvaluation({...e,level:50},p).status,'pending');
 for(const change of [d=>d.files[0].file='../wrong.json',d=>d.files[0].speciesId='0122_default',d=>d.files.push(d.files[0]),d=>d.conditions.collectionHours=1]){const bad=structuredClone(manifest);change(bad);assert.throws(()=>ctx.validateFoodRankManifest(bad))}
 const valid=await ctx.loadFoodRankReferences(p,80),references=ctx.activeFoodRoleReferences();
 for(const change of [d=>d.speciesId='0071_default',d=>d.count=1,d=>d.level=60,d=>delete d.entries[Object.keys(d.entries)[0]],d=>d.entries[Object.keys(d.entries)[0]].distribution[0][1]++,d=>d.entries[Object.keys(d.entries)[0]].distribution.reverse()]){const bad=structuredClone(valid);change(bad);assert.throws(()=>ctx.validateFoodRankData(bad,true,references,p,80,manifest))}
 // One delayed file request serves simultaneous ON/OFF loads without crossing condition state.
 const key=ctx.foodRankKey(p,80);for(const camp of [true,false]){const store=ctx.campReferenceStore(camp);delete store.values[key];store.loads.delete(key)}ctx.foodRankFileCache().files.delete(key);
 let release,calls=0;ctx.fetch=url=>{if(!url.includes('food_rank_v2/output/'))return fetchLocal(url);calls++;return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>structuredClone(valid)})})};
 ctx.teamGoodCamp=true;const on=ctx.loadFoodRankReferences(p,80);ctx.teamGoodCamp=false;const off=ctx.loadFoodRankReferences(p,80);await new Promise(setImmediate);assert.equal(calls,1);release();await Promise.all([on,off]);assert.equal(ctx.foodRankEvaluation(e,p).status,'pending','ON result cannot be used in OFF view');ctx.teamGoodCamp=true;assert.equal(ctx.foodRankEvaluation(e,p).rank,'SS');
 // A failed file request stays pending and can be retried; existing food references survive.
 const store=ctx.campReferenceStore(true);delete store.values[key];store.loads.delete(key);ctx.foodRankFileCache().files.delete(key);ctx.fetch=async()=>({ok:false});await assert.rejects(ctx.loadFoodRankReferences(p,80));assert.match(ctx.foodRankEvaluation(e,p).text,/読み込みに失敗/);assert(ctx.activeFoodRoleReferences());ctx.fetch=fetchLocal;await ctx.loadFoodRankReferences(p,80);assert.equal(ctx.foodRankEvaluation(e,p).rank,'SS');
 console.log(`Food rank: ${identities.size} identities, ${conditions} conditions, ${checked} weighted/binary checks, 249 lazy files reused across camps, forms/recovery, schema/missing/ideal guards, delayed responses, retry and immutable inputs passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
