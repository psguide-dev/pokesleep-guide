const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRuntime}=require('./skill_model_runtime.cjs'),root=path.resolve(__dirname,'..'),{catalog,ctx}=createRuntime(root);
ctx.speciesKey=ctx.window.PS_SPECIES_CATALOG.key;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/13-role-model-helpers.html','templates/core/14-berry-role.html','templates/core/15-skill-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/skill_manifest_v2.json')));for(const meta of Object.values(data.species))Object.assign(data.entries,JSON.parse(fs.readFileSync(path.join(root,meta.file))).entries);ctx.window.PS_SKILL_MODEL_DATA=data;
const production=createRuntime(root,false).ctx;production.speciesKey=production.window.PS_SPECIES_CATALOG.key;for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/13-role-model-helpers.html','templates/core/14-berry-role.html','templates/core/15-skill-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),production);production.window.PS_SKILL_MODEL_DATA=data;
// Initial comparison is Lv80 even for a low-level record; explicit choices win.
for(const level of [1,50,62,70,80]){const item={level},before=JSON.stringify(item);assert.equal(ctx.skillRoleLevel(item),80);assert.equal(JSON.stringify(item),before)}
for(const level of [50,60,70,80])assert.equal(ctx.skillRoleLevel({level:1,skillEvaluationLevel:level}),level);
let checks=0;
assert.deepEqual(Object.keys(data.species).sort(),Array.from(ctx.window.PS_SPECIES_CATALOG.all()).filter(p=>p.specialty==='スキル'&&p.boxEligible!==false&&p.dataStatus!=='provisional_calculated').map(ctx.speciesKey).sort());checks++;
ctx.individualIdealCandidates=()=>{throw Error('Population enumeration must stay offline')};
for(const [key,r] of Object.entries(data.entries)){
 const speciesId=JSON.parse(key)[0],p=ctx.window.PS_SPECIES({no:r.no,speciesId}),ideal=r.idealRecord,item={id:'test',no:r.no,speciesId,level:35,skillEvaluationLevel:r.level,skillLevel:7,ribbonHours:2000,...ideal,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,ideal.ingredients[i]]).filter(([l,n])=>n))},before=JSON.stringify(item);
 const e=ctx.skillRoleEvaluation(item,p);assert.equal(e.status,'ready');assert.equal(e.value,r.ideal);assert.equal(e.idealPercent,100);assert.equal(e.strongerUpper,0);assert.equal(e.skillLevel,r.skillLevel);assert.equal(e.skillLevel,Math.min(1+ctx.speciesEvolutionStage(p),catalog.skills[p.mainSkillId].maxLevel));checks+=6;
 assert.equal(ctx.skillRoleEvaluation({...item,skillLevel:1,ribbonHours:0},p).value,e.value);checks++;
 const html=ctx.renderIndividualEvaluation(item,p);assert(html.includes('スキル発動回数'));assert(html.includes('捕獲確率ではありません'));assert(!html.includes('主軸指数'));assert(html.includes('チームへの貢献は別評価'));assert.equal(JSON.stringify(item),before);checks+=5;
 if(r.level===80){const actual=production.skillRoleEvaluation(item,p);assert.equal(actual.status,'ready');assert.equal(actual.value,r.ideal);checks+=2;}
 assert.equal(e.member.stockLimit,2);assert(e.value<=10);checks+=2;
 const normalized={...item,level:r.level,skillLevel:r.skillLevel,ribbonHours:0};
 const unlimited=ctx.calculateIndividualTrial(normalized,true);assert(unlimited.values.skill+1e-9>=e.value);checks++;
 const other=p.ingredientSlots.find(s=>s.unlock<=r.level&&s.candidates.length>1);if(other){const changed={...item,ingredients:{...item.ingredients,[other.unlock]:other.candidates.find(c=>c.name!==item.ingredients[other.unlock]).name}};
 assert.equal(ctx.skillRoleEvaluation(changed,p).ideal,e.ideal);checks++;
 const prior=other.candidates.find(c=>c.name===item.ingredients[other.unlock]),next=other.candidates.find(c=>c.name===changed.ingredients[other.unlock]);if(prior.qty===next.qty){assert.equal(ctx.skillRoleEvaluation(changed,p).value,e.value);checks++;}}
 assert(ctx.renderSkillRole(item,p).includes('スキル適性 SS'));checks++;
 const missing=ctx.skillRoleEvaluation({...item,subskills:[]},p);assert.equal(missing.status,'pending');checks++;
}
assert.equal(Object.keys(data.species).length,88);assert.equal(Object.keys(data.entries).length,352);checks+=2;
const p=catalog.pokemon[181],base={id:'sample',no:181,level:50,nature:'がんばりや',skillEvaluationLevel:50,ingredients:Object.fromEntries(p.ingredientSlots.map(s=>[s.unlock,s.candidates.at(-1).name])),subskills:['スキル確率アップM','おてつだいスピードM','最大所持数アップL','おてつだいスピードS','おてつだいボーナス']};
assert.equal(ctx.skillRoleEvaluation({...base,subskills:[]},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,nature:''},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,ingredients:{1:base.ingredients[1]}},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,no:9999},{no:9999,specialty:'スキル'}).status,'pending');checks+=4;
// Capacity and berry competition affect the primary axis; never add secondary energy as a reward.
const plain={...base,level:80,skillLevel:3,ribbonHours:0,subskills:['スキル確率アップM','スキル確率アップS','おてつだいスピードM','おてつだいスピードS','リサーチEXPボーナス']};
const plainValue=ctx.calculateIndividualTrial(plain).values.skill,berryValue=ctx.calculateIndividualTrial({...plain,subskills:[...plain.subskills.slice(0,4),'きのみの数S']}).values.skill,carryValue=ctx.calculateIndividualTrial({...plain,subskills:[...plain.subskills.slice(0,4),'最大所持数アップL']}).values.skill;
assert(berryValue<plainValue);assert.equal(carryValue,plainValue);checks+=2;
const dedenne={...plain,no:702,skillLevel:1,ingredients:Object.fromEntries(catalog.pokemon[702].ingredientSlots.map(s=>[s.unlock,s.candidates.at(-1).name]))};
const dedennePlain=ctx.calculateIndividualTrial(dedenne).values.skill,dedenneCarry=ctx.calculateIndividualTrial({...dedenne,subskills:[...dedenne.subskills.slice(0,4),'最大所持数アップL']}).values.skill;
assert(dedenneCarry>dedennePlain);checks++;
assert.equal(ctx.expectedStoredSkills(100,100,2),2);assert.equal(ctx.expectedStoredSkills(100,100,1),1);assert.equal(ctx.expectedStoredSkills(100,0,2),0);assert(ctx.expectedStoredSkills(10000,10,2)<=2);checks+=4;
// Rank boundaries use full bounds, never rounded shares.
for(const [lower,upper,rank] of [[0,0,'SS'],[3,3,'SS'],[3.00001,3.00001,'S'],[10,10,'S'],[10.0001,10.0001,'A'],[25,25,'A'],[25.01,25.01,'B'],[50,50,'B'],[50.001,50.001,'C'],[2.99,3.01,'SS〜S（境界）']]){assert.equal(ctx.skillModelRank({strongerLower:lower,strongerUpper:upper}),rank);checks++}
assert.equal(ctx.skillModelRank({}), '未判定');checks++;
const amped=ctx.window.PS_SPECIES({no:849,speciesId:'0849_amped'});
assert.equal(ctx.skillRoleEvaluation({...base,no:849,speciesId:'0849_amped',nature:'しんちょう'},amped).status,'pending');checks++;
// Guaranteed Moonlight recovery raises production; unspecified extra recovery is not invented.
const umbreon=catalog.pokemon[197],moon={...plain,no:197,skillLevel:2,ingredients:Object.fromEntries(umbreon.ingredientSlots.map(s=>[s.unlock,s.candidates[0].name]))};
const withRecovery=ctx.calculateIndividualTrial(moon).values.skill,moonId=umbreon.mainSkillId,saved=catalog.skills[moonId].effectType;
catalog.skills[moonId].effectType='unmodeled';const withoutRecovery=ctx.calculateIndividualTrial(moon).values.skill;catalog.skills[moonId].effectType=saved;
assert(withRecovery>withoutRecovery);checks++;
// Existing berry comparison remains installed and separate.
ctx.window.PS_BERRY_MODEL_DATA=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_model_refs_v5.json')));
assert(ctx.renderIndividualEvaluation({...base,no:26},catalog.pokemon[26]).includes('きのみ'));assert(!ctx.renderIndividualEvaluation({...base,no:26},catalog.pokemon[26]).includes('スキル評価レベル'));checks+=2;
fs.writeFileSync(path.join(root,'skill_model_checks.json'),JSON.stringify({checksPassed:checks,groups:Object.keys(data.entries).length,capacityCase:{plainValue,berryValue,carryValue,dedennePlain,dedenneCarry}},null,2));console.log(JSON.stringify({checksPassed:checks,groups:Object.keys(data.entries).length,capacityCase:{plainValue,berryValue,carryValue,dedennePlain,dedenneCarry}}));

ctx.evaluationPage=false;const carryText=ctx.roleCarryFillText;ctx.roleCarryFillText=()=>{throw Error('Box overview must not format detail-only carry diagnostics')};
const overviewRef=Object.values(data.entries).find(r=>r.no===181&&r.level===80),overviewSpecies=catalog.pokemon[181],overviewItem={id:'overview',no:181,speciesId:'0181_default',level:62,skillEvaluationLevel:80,...overviewRef.idealRecord,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,overviewRef.idealRecord.ingredients[i]]))};
const overviewHtml=ctx.renderSkillRole(overviewItem,overviewSpecies);assert(overviewHtml.includes('psg-role-result'));assert(overviewHtml.includes('スキル発動／日'));assert(!overviewHtml.includes('<details'));ctx.roleCarryFillText=carryText;
console.log('Skill overview: no discarded carry diagnostics or markup');
