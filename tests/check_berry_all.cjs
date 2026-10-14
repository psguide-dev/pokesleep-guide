const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{createRuntime}=require('./berry_model_runtime.cjs'),{catalog,ctx}=createRuntime(root);
ctx.window.PS_IMAGE_FILES={berries:{}};vm.runInContext(fs.readFileSync(path.join(root,'templates/01-species-catalog.html'),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);ctx.speciesKey=ctx.window.PS_SPECIES_CATALOG.key;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/13-role-model-helpers.html','templates/core/14-berry-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_manifest_v6.json')));ctx.window.PS_BERRY_MODEL_DATA=manifest;
ctx.window.PS_BERRY_TOTAL_DATA={version:1,axis:'berry_plus_convertible_skill',ingredientPool:manifest.ingredientPool,ingredientMean:manifest.ingredientMean,entries:{}};
let checks=0,groups=0,totalGroups=0;
for(const [id,meta] of Object.entries(manifest.species)){
 const part=JSON.parse(fs.readFileSync(path.join(root,meta.file)));assert.equal(part.version,6);assert.equal(part.speciesId,id);assert.equal(part.engineCommit,manifest.engineCommit);checks+=3;Object.assign(manifest.entries,part.entries);Object.assign(ctx.window.PS_BERRY_TOTAL_DATA.entries,part.totalEntries);
 const p=ctx.window.PS_SPECIES({no:meta.no,speciesId:id});assert(p&&p.specialty==='きのみ');checks++;
 for(const level of [50,60,70,80]){const r=part.entries[JSON.stringify([id,level,meta.skillSensitive?meta.defaultSkillLevel:0])];assert(r);const item={id:'all',no:p.no,speciesId:id,level:37,berryEvaluationLevel:level,skillLevel:meta.maxSkillLevel,ribbonHours:2000,...r.idealRecord,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,r.idealRecord.ingredients[i]]).filter(([l,n])=>n))},stored=JSON.stringify(item),e=ctx.berryRoleEvaluation(item,p);assert.equal(e.status,'ready');assert.equal(e.value,r.ideal);assert.equal(e.idealPercent,100);assert.equal(e.strongerUpper,0);assert.equal(ctx.roleModelRank(e),'SS');assert.equal(JSON.stringify(item),stored);assert(ctx.renderIndividualEvaluation(item,p).includes('きのみ SS'));checks+=8;groups++;
 assert.equal(ctx.berryRoleEvaluation({...item,subskills:[]},p).status,'pending');checks++;
 if(meta.skillSensitive&&meta.availableSkillLevels.length===1){assert.equal(ctx.berryRoleEvaluation(item,p,meta.defaultSkillLevel===1?2:1).status,'pending');checks++}
 }
 for(const r of Object.values(part.totalEntries)){const item={id:'total',no:p.no,speciesId:id,level:51,berryEvaluationLevel:r.level,ribbonHours:0,...r.idealRecord,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,r.idealRecord.ingredients[i]]).filter(([l,n])=>n))},e=ctx.berryRoleEvaluation(item,p,r.skillLevel),total=ctx.berryTotalComparison(e);assert.equal(total.status,'ready');assert.equal(total.value,r.ideal);assert.equal(total.strongerUpper,0);checks+=3;totalGroups++}
}
const all=new Set(ctx.window.PS_SPECIES_CATALOG.all().filter(p=>p.specialty==='きのみ'&&p.boxEligible!==false).map(ctx.speciesKey));assert.equal(all.size,73);assert.equal(Object.keys(manifest.species).length,all.size);for(const id of all)assert(manifest.species[id]);checks+=75;
console.log(JSON.stringify({checksPassed:checks,species:73,modelLevelGroups:groups,totalGroups}));fs.writeFileSync(path.join(root,'berry_all_checks.json'),JSON.stringify({checksPassed:checks,species:73,modelLevelGroups:groups,totalGroups},null,2));
