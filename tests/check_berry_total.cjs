const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{createRuntime}=require('./berry_model_runtime.cjs'),{catalog,ctx}=createRuntime(root);ctx.speciesKey=p=>p.speciesId||`${String(p.no).padStart(4,'0')}_default`;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/13-role-model-helpers.html','templates/core/14-berry-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
ctx.window.PS_BERRY_MODEL_DATA=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_model_refs_v5.json')));
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_total_refs_v1.json')));ctx.window.PS_BERRY_TOTAL_DATA=data;let checks=0;
const cases=[[0,'SS'],[3,'SS'],[3.00001,'S'],[10,'S'],[10.00001,'A'],[25,'A'],[25.00001,'B'],[50,'B'],[50.00001,'C'],[100,'C']];
for(const [p,rank] of cases){assert.equal(ctx.roleModelRank({strongerLower:p,strongerUpper:p}),rank);checks++}
assert.equal(ctx.roleModelRank({strongerLower:2.9,strongerUpper:3.1}),'SS〜S（境界）');assert.equal(ctx.roleModelRank({}), '未判定');checks+=2;
assert.equal(data.ingredientMean,data.ingredientPool.reduce((n,x)=>n+x.energy,0)/data.ingredientPool.length);checks++;
for(const ref of Object.values(data.entries)){
 const p=catalog.pokemon[ref.no],r=ref.idealRecord,item={id:'total',no:ref.no,level:51,berryEvaluationLevel:ref.level,skillLevel:7,ribbonHours:2000,...r,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,r.ingredients[i]]).filter(([l,n])=>n))},stored=JSON.stringify(item);
 const e=ctx.berryRoleEvaluation(item,p,ref.skillLevel);assert.equal(e.status,'ready');const t=ctx.berryTotalComparison(e);assert.equal(t.status,'ready');assert.equal(t.value,ref.ideal);assert.equal(t.idealPercent,100);assert.equal(t.strongerUpper,0);checks+=5;
 assert.equal(t.value,e.value+t.extra);assert.equal(JSON.stringify(item),stored);checks+=2;
 const normalized={...item,level:ref.level,skillLevel:ref.skillLevel,ribbonHours:0},snapshot=ctx.calculateIndividualTrial(normalized);
 if(t.type==='random_ingredients'){assert.equal(t.extra,snapshot.values.skill*(snapshot.member.skillAmount*data.ingredientMean));const rendered=ctx.renderBerryTotalResult(e);assert(rendered.includes('料理・レシピ・大成功補正は含めません'));assert(rendered.includes('入手済み食材'));checks+=3}
 else {assert.equal(t.extra,snapshot.values.skill*snapshot.member.skillEnergy);checks++}
 const html=ctx.renderBerryTotalResult(e);assert(html.includes('スキル換算込み SS'));assert(html.includes('換算込み理想の性格'));checks+=2;
}
const ref=data.entries[JSON.stringify(['0026_default',70,3])],p=catalog.pokemon[26],item={id:'level',no:26,level:51,berryEvaluationLevel:70,skillLevel:1,ribbonHours:0,...ref.idealRecord,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,ref.idealRecord.ingredients[i]]).filter(([l,n])=>n))};
const e1=ctx.berryRoleEvaluation(item,p,1),e7=ctx.berryRoleEvaluation(item,p,7);assert.equal(e1.value,e7.value);assert(ctx.berryTotalComparison(e7).extra>ctx.berryTotalComparison(e1).extra);checks+=2;
assert(ctx.renderIndividualEvaluation(item,p).includes('きのみ SS')||ctx.renderIndividualEvaluation(item,p).includes('きのみ S'));checks++;
assert.equal(ctx.berryTotalComparison({status:'ready',member:{skillEffectType:'self_energy_recovery'}}).status,'included');checks++;
for(const skillEffectType of ['ally_energy_recovery','extra_help','cooking_pot_capacity','cooking_tasty_chance','variable_dream_shards','random_main_skill']){const e={status:'ready',member:{skillEffectType}};assert.equal(ctx.berryTotalComparison(e).status,'unconverted');assert(ctx.renderBerryTotalResult(e).includes('未換算を0点'));checks+=2}
ctx.window.PS_BERRY_TOTAL_DATA=null;assert.equal(ctx.berryTotalComparison(e1).status,'pending');checks++;
console.log(JSON.stringify({checksPassed:checks,referenceGroups:Object.keys(data.entries).length,ingredientMean:data.ingredientMean}));fs.writeFileSync(path.join(root,'berry_total_checks.json'),JSON.stringify({checksPassed:checks,referenceGroups:Object.keys(data.entries).length,ingredientMean:data.ingredientMean},null,2));
