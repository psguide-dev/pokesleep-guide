const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const {createRuntime}=require('./berry_model_runtime.cjs');
const {catalog,ctx}=createRuntime(root);
ctx.speciesKey=p=>p.speciesId||`${String(p.no).padStart(4,'0')}_default`;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/13-role-model-helpers.html','templates/core/14-berry-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_model_refs_v5.json')));ctx.window.PS_BERRY_MODEL_DATA=data;
// Initial comparison is Lv80 even for a low-level record; explicit choices win.
for(const level of [1,50,62,70,80]){const item={level},before=JSON.stringify(item);assert.equal(ctx.berryRoleLevel(item),80);assert.equal(JSON.stringify(item),before)}
for(const level of [50,60,70,80])assert.equal(ctx.berryRoleLevel({level:1,berryEvaluationLevel:level}),level);
let checks=0;
for(const reference of Object.values(data.entries)){
 const p=catalog.pokemon[reference.no],meta=data.species[ctx.speciesKey(p)],ideal=reference.idealRecord;
 const item={id:'model',no:p.no,level:53,berryEvaluationLevel:reference.level,skillLevel:1,ribbonHours:0,nature:ideal.nature,subskills:ideal.subskills,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,ideal.ingredients[i]]).filter(([l,name])=>name))};
 const stored=JSON.stringify(item);
 const result=ctx.berryRoleEvaluation(item,p,reference.skillLevel);assert.equal(result.status,'ready');assert.equal(result.value,reference.ideal);assert.equal(result.idealPercent,100);assert.equal(result.strongerPercent,0);checks+=4;
 const unchanged=ctx.berryRoleEvaluation({...item,skillLevel:meta.maxSkillLevel,ribbonHours:2000},p,reference.skillLevel);assert.equal(unchanged.value,result.value);checks++;
 const defaulted=ctx.berryRoleEvaluation(item,p);assert.equal(defaulted.skillLevel,meta.defaultSkillLevel);checks++;
 const html=ctx.renderIndividualEvaluation(item,p);assert(html.includes('理想個体の'));assert(html.includes('この個体を上回る構成'));assert(html.includes('比較用スキルLv'));assert(html.includes('食材構成も含む'));assert(!html.includes('きのみ適性 B'));checks+=5;
 assert.equal(JSON.stringify(item),stored);checks++;
}
const p=catalog.pokemon[85];const sample={id:'dodrio',no:85,level:51,berryEvaluationLevel:80,skillLevel:2,ribbonHours:0,nature:'がんばりや',subskills:['きのみの数S','おてつだいスピードS','スキル確率アップM','おてつだいスピードM','おてつだいボーナス'],ingredients:{1:'ワカクサ大豆',30:'リラックスカカオ',60:'マメミート'}};
const basic=ctx.berryRoleEvaluation(sample,p),higher=ctx.berryRoleEvaluation(sample,p,6),again=ctx.berryRoleEvaluation(sample,p);
assert.equal(basic.skillLevel,2);assert.equal(higher.skillLevel,6);assert(higher.value>basic.value);assert.equal(again.value,basic.value);checks+=4;
assert.equal(ctx.berryRoleEvaluation(sample,p,7).status,'pending');checks++;
assert.equal(ctx.berryRoleEvaluation({...sample,subskills:[]},p).status,'pending');checks++;
assert.equal(ctx.berryRoleEvaluation({...sample,ingredients:{1:'ワカクサ大豆'}},p).status,'pending');checks++;
assert.equal(ctx.berryRoleEvaluation({...sample,no:38},catalog.pokemon[38]).status,'pending');checks++;
const otherFood=ctx.berryRoleEvaluation({...sample,ingredients:{1:'ワカクサ大豆',30:'ワカクサ大豆',60:'ワカクサ大豆'}},p);assert.equal(otherFood.ideal,basic.ideal);checks++;
assert.equal(ctx.berryStrongerText({strongerLower:0,strongerUpper:0,strongerPercent:0}),'0%');checks++;
assert.equal(ctx.berryStrongerText({strongerLower:0,strongerUpper:.001,strongerPercent:.0005}),'0.01%未満');checks++;
assert.notEqual(ctx.berryShareBound(.000001),'0.00');assert.equal(ctx.berryShareBound(0),'0');checks+=2;
fs.writeFileSync(path.join(root,'berry_model_checks.json'),JSON.stringify({checksPassed:checks,referenceGroups:Object.keys(data.entries).length,dodrio80Default:{value:basic.value,ideal:basic.ideal,idealPercent:basic.idealPercent,lower:basic.strongerLower,upper:basic.strongerUpper},dodrio80Skill6:{value:higher.value,ideal:higher.ideal,idealPercent:higher.idealPercent,lower:higher.strongerLower,upper:higher.strongerUpper}},null,2));
console.log(JSON.stringify({checksPassed:checks,referenceGroups:Object.keys(data.entries).length}));
