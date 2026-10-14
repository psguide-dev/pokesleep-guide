const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRuntime}=require('./skill_model_runtime.cjs'),root=path.resolve(__dirname,'..'),{catalog,ctx}=createRuntime(root);
ctx.speciesKey=ctx.window.PS_SPECIES_CATALOG.key;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/14-berry-role.html','templates/core/15-skill-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/skill_model_refs_v1.json')));ctx.window.PS_SKILL_MODEL_DATA=data;
let checks=0;
for(const r of Object.values(data.entries)){
 const p=catalog.pokemon[r.no],ideal=r.idealRecord,item={id:'test',no:r.no,level:35,skillEvaluationLevel:r.level,skillLevel:7,ribbonHours:2000,...ideal,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,ideal.ingredients[i]]).filter(([l,n])=>n))},before=JSON.stringify(item);
 const e=ctx.skillRoleEvaluation(item,p);assert.equal(e.status,'ready');assert.equal(e.value,r.ideal);assert.equal(e.idealPercent,100);assert.equal(e.strongerUpper,0);assert.equal(e.skillLevel,r.skillLevel);checks+=5;
 assert.equal(ctx.skillRoleEvaluation({...item,skillLevel:1,ribbonHours:0},p).value,e.value);checks++;
 const html=ctx.renderIndividualEvaluation(item,p);assert(html.includes('スキル発動回数'));assert(html.includes('捕獲確率ではありません'));assert(!html.includes('主軸指数'));assert(html.includes('チームへの貢献は別評価'));assert.equal(JSON.stringify(item),before);checks+=5;
 assert.equal(e.member.stockLimit,2);assert(e.value<=10);checks+=2;
 const normalized={...item,level:r.level,skillLevel:r.skillLevel,ribbonHours:0};
 const unlimited=ctx.calculateIndividualTrial(normalized,true);assert(unlimited.values.skill+1e-9>=e.value);checks++;
 const other=p.ingredientSlots.find(s=>s.unlock<=r.level&&s.candidates.length>1),changed={...item,ingredients:{...item.ingredients,[other.unlock]:other.candidates.find(c=>c.name!==item.ingredients[other.unlock]).name}};
 assert.equal(ctx.skillRoleEvaluation(changed,p).ideal,e.ideal);checks++;
}
assert.equal(Object.keys(data.species).length,8);assert.equal(Object.keys(data.entries).length,32);checks+=2;
const p=catalog.pokemon[181],base={id:'sample',no:181,level:50,nature:'がんばりや',skillEvaluationLevel:50,ingredients:Object.fromEntries(p.ingredientSlots.map(s=>[s.unlock,s.candidates.at(-1).name])),subskills:['スキル確率アップM','おてつだいスピードM','最大所持数アップL','おてつだいスピードS','おてつだいボーナス']};
assert.equal(ctx.skillRoleEvaluation({...base,subskills:[]},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,nature:''},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,ingredients:{1:base.ingredients[1]}},p).status,'pending');assert.equal(ctx.skillRoleEvaluation({...base,no:175},catalog.pokemon[175]).status,'pending');checks+=4;
// Capacity and berry competition affect the primary axis; never add secondary energy as a reward.
const plain={...base,level:80,skillLevel:3,ribbonHours:0,subskills:['スキル確率アップM','スキル確率アップS','おてつだいスピードM','おてつだいスピードS','リサーチEXPボーナス']};
const plainValue=ctx.calculateIndividualTrial(plain).values.skill,berryValue=ctx.calculateIndividualTrial({...plain,subskills:[...plain.subskills.slice(0,4),'きのみの数S']}).values.skill,carryValue=ctx.calculateIndividualTrial({...plain,subskills:[...plain.subskills.slice(0,4),'最大所持数アップL']}).values.skill;
assert(berryValue<plainValue);assert.equal(carryValue,plainValue);checks+=2;
const dedenne={...plain,no:702,skillLevel:1,ingredients:Object.fromEntries(catalog.pokemon[702].ingredientSlots.map(s=>[s.unlock,s.candidates.at(-1).name]))};
const dedennePlain=ctx.calculateIndividualTrial(dedenne).values.skill,dedenneCarry=ctx.calculateIndividualTrial({...dedenne,subskills:[...dedenne.subskills.slice(0,4),'最大所持数アップL']}).values.skill;
assert(dedenneCarry>dedennePlain);checks++;
assert.equal(ctx.expectedStoredSkills(100,100,2),2);assert.equal(ctx.expectedStoredSkills(100,100,1),1);assert.equal(ctx.expectedStoredSkills(100,0,2),0);assert(ctx.expectedStoredSkills(10000,10,2)<=2);checks+=4;
// Existing berry comparison remains installed and separate.
ctx.window.PS_BERRY_MODEL_DATA=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_model_refs_v5.json')));
assert(ctx.renderIndividualEvaluation({...base,no:26},catalog.pokemon[26]).includes('きのみ'));assert(!ctx.renderIndividualEvaluation({...base,no:26},catalog.pokemon[26]).includes('スキル評価レベル'));checks+=2;
fs.writeFileSync(path.join(root,'skill_model_checks.json'),JSON.stringify({checksPassed:checks,groups:32,capacityCase:{plainValue,berryValue,carryValue,dedennePlain,dedenneCarry}},null,2));console.log(JSON.stringify({checksPassed:checks,groups:32,capacityCase:{plainValue,berryValue,carryValue,dedennePlain,dedenneCarry}}));
