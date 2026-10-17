const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),root=path.resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root,false);
ctx.speciesKey=p=>ctx.window.PS_SPECIES_CATALOG.key(p);ctx.renderIndividualEvaluation=()=>'<p>previous</p>';ctx.bindIndividualEvaluation=()=>{};ctx.evaluationPage=false;
for(const file of ['13-role-model-helpers','15-food-role','15-special-rank','15-special-count'])vm.runInContext(fs.readFileSync(`${root}/templates/core/${file}.html`,'utf8'),ctx);
const read=file=>JSON.parse(fs.readFileSync(`${root}/${file}`)),manifest=read('assets/evaluation/special4_rank/manifest.json'),beforeCatalog=JSON.stringify(catalog);
let requests=[];const fetchLocal=async url=>{requests.push(url);return {ok:true,json:async()=>read(url.split('?')[0])}};ctx.fetch=fetchLocal;
const resolve=id=>ctx.window.PS_SPECIES({no:Number(id.split('_')[0]),speciesId:id});
const outputRequests=()=>requests.filter(url=>url.includes('/output/'));
(async()=>{
 ctx.teamGoodCamp=true;const first=resolve('0122_default');assert.equal(ctx.specialRankEvaluation(ctx.specialCountEvaluation({no:122},first),first).status,'pending');await ctx.loadSpecialRankReferences(first,80);
 assert.equal(outputRequests().length,1,'load only requested species/level');assert.equal(requests.filter(url=>url.includes('/manifest')).length,1);
 let conditions=0,weighted=0;const identities=new Set(),samples=new Map();
 for(const camp of [true,false]){
  ctx.teamGoodCamp=camp;
  for(const meta of manifest.files){
   const p=resolve(meta.speciesId),data=await ctx.loadSpecialRankReferences(p,meta.level),beforeData=JSON.stringify(data);identities.add(meta.speciesId);
   for(const row of Object.values(data.entries).filter(row=>row.camp===camp)){
    const item={...structuredClone(row.idealRecord),id:'rank-test',no:p.no,speciesId:meta.speciesId,level:62,skillLevel:7,ribbonHours:2000,foodEvaluationLevel:meta.level},beforeItem=JSON.stringify(item);
    const e=ctx.specialCountEvaluation(item,p),r=ctx.specialRankEvaluation(e,p);
    assert.equal(e.status,'ready',`${p.name} ${meta.level} ${camp}`);assert.equal(r.status,'ready');assert.equal(r.rank,'SS');assert.equal(r.strongerCount,0);assert(Math.abs(r.idealPercent-100)<1e-8);assert.equal(e.stockLimit,1);assert.equal(e.effectValue,null);assert.equal(e.pattern,row.pattern);assert.equal(r.count,({60:17000,70:59500,80:154700})[meta.level]);
    assert(Math.abs(e.value-row.ideal)<1e-9);assert.equal(JSON.stringify(item),beforeItem);assert.equal(row.distribution.reduce((n,[,w])=>n+w,0),row.count);
    for(const value of [0,row.ideal*.6,row.ideal*.95,...[0,Math.floor(row.distribution.length/2),row.distribution.length-1].map(index=>row.distribution[index][0])]){
     const rank=ctx.specialRankEvaluation({...e,value},p),expected=row.distribution.reduce((n,[v,w])=>n+(v>value+1e-9?w:0),0);assert.equal(rank.status,'ready');assert.equal(rank.strongerCount,expected);assert.equal(rank.strongerPercent,100*expected/row.count);weighted++;
    }
    for(const invalid of [{value:NaN},{value:null},{value:row.ideal+1},{camp:!camp},{speciesId:'0132_unknown'},{stockLimit:2},{effectValue:0},{metric:'normalFoodsFixedPattern'}])assert.equal(ctx.specialRankEvaluation({...e,...invalid},p).status,'pending');
    assert.equal(ctx.specialCountEvaluation({...item,skillLevel:1,ribbonHours:0},p).value,e.value,'effects-free count is skill-level invariant');
    const html=ctx.renderSpecialCount(item,p);assert.match(html,/発動回数/);assert.match(html,/>SS<\/strong>/);assert.match(html,/psg-role-trial/);assert.match(html,/同構成の理想比/);assert.match(html,/食材収集力・スキル効果・チーム貢献は未評価/);assert(!html.includes('食材 SS'));assert(!html.includes('<details'));
    ctx.evaluationPage=true;assert(ctx.renderSpecialCount(item,p).includes(row.count.toLocaleString('ja-JP')+'構成'));assert.match(ctx.renderSpecialCount(item,p),/ストック上限は1回/);ctx.evaluationPage=false;
    samples.set(JSON.stringify([meta.speciesId,meta.level,camp]),{item,p,e});conditions++;
   }
   assert.equal(JSON.stringify(data),beforeData);
  }
 }
 assert.equal(identities.size,4);assert.equal(conditions,144);assert.equal(weighted,864);assert.equal(outputRequests().length,12,'both camps reuse the same file');assert.equal(JSON.stringify(catalog),beforeCatalog);
 for(const no of [9,151,491])assert.equal(ctx.specialRankSupported(catalog.pokemon[no],80),false);for(const level of [1,50,90])assert.equal(ctx.specialRankSupported(first,level),false);
 ctx.teamGoodCamp=true;const sample=samples.get(JSON.stringify(['0122_default',80,true])),{item,p,e}=sample,valid=await ctx.loadSpecialRankReferences(p,80),before=JSON.stringify(valid);
 for(const change of [d=>d.files[0].file='../wrong',d=>d.files.push(d.files[0]),d=>d.files[0].speciesId='0151_default',d=>d.conditions.stockLimit=2,d=>d.conditions.effectsExcluded=false]){const bad=structuredClone(manifest);change(bad);assert.throws(()=>ctx.validateSpecialRankManifest(bad))}
 for(const change of [d=>d.speciesId='0132_default',d=>d.level=70,d=>d.count=1,d=>d.effectValue=0,d=>d.stockLimit=2,d=>d.sourceCommit='wrong',d=>delete d.entries[Object.keys(d.entries)[0]],d=>d.entries[Object.keys(d.entries)[0]].distribution[0][1]++,d=>d.entries[Object.keys(d.entries)[0]].distribution.reverse(),d=>d.entries[Object.keys(d.entries)[0]].idealRecord.nature='']){const bad=structuredClone(valid);change(bad);assert.throws(()=>ctx.validateSpecialRankData(bad,p,80,manifest))}
 assert.equal(JSON.stringify(valid),before);
 // Delayed shared file, camp changes, failed request, retry. No missing data becomes C.
 const cache=ctx.specialRankCache(),key=ctx.specialRankKey(p,80);cache.values.delete(key);cache.files.delete(key);let release,calls=0;
 ctx.fetch=url=>{calls++;return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>structuredClone(valid)})})};
 const on=ctx.loadSpecialRankReferences(p,80);ctx.teamGoodCamp=false;const off=ctx.loadSpecialRankReferences(p,80);await new Promise(setImmediate);assert.equal(calls,1);release();await Promise.all([on,off]);assert.equal(ctx.specialRankEvaluation(e,p).status,'pending');ctx.teamGoodCamp=true;assert.equal(ctx.specialRankEvaluation(e,p).rank,'SS');
 cache.values.delete(key);cache.files.delete(key);ctx.fetch=async()=>({ok:false});await assert.rejects(ctx.loadSpecialRankReferences(p,80));assert.equal(ctx.specialRankEvaluation(e,p).status,'pending');assert.match(ctx.specialRankEvaluation(e,p).text,/読み込みに失敗/);ctx.fetch=fetchLocal;await ctx.loadSpecialRankReferences(p,80);assert.equal(ctx.specialRankEvaluation(e,p).rank,'SS');
 for(const bad of [{...item,nature:''},{...item,subskills:[]},{...item,ingredients:{}},{...item,speciesId:'0122_unknown'}])assert.equal(ctx.specialCountEvaluation(bad,p).status,'pending');
 assert.equal(JSON.stringify(catalog),beforeCatalog);
 console.log(`Special rank: ${identities.size} species, ${conditions} conditions, ${weighted} weighted comparisons, ideal parity, 12 lazy files reused across camps, null vs zero, schema guards, delay/retry and immutable production model passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
