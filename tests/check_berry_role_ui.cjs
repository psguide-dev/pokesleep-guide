const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const catalog=JSON.parse(fs.readFileSync('review.html','utf8').split('window.PS_CATALOG=')[1].split(';\n')[0]);
const ctx={window:{PS_CATALOG:catalog,PS_SWAP_ENGINE:require('../vendor/enigma-swap/daily-supply.mjs')},structuredClone,boxEsc:String,speciesKey:p=>p.speciesId||`${String(p.no).padStart(4,'0')}_default`};vm.createContext(ctx);
for(const f of ['templates/00-number-format.html','templates/00-standard-evaluation.html','templates/core/07-corrections.html','templates/core/10-individual-evaluation.html','templates/core/12-individual-trial.html','templates/core/13-individual-simple.html','templates/core/14-berry-role.html'])vm.runInContext(fs.readFileSync(f,'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
let checks=0;
for(const entry of Object.values(ctx.window.PS_BERRY_REFERENCES.entries)) {
 const c=entry.context,p=catalog.pokemon[c.species];
 const original=JSON.parse(fs.readFileSync('tests/fixtures/berry-role-references.json','utf8')).entries[entry.key];
 const item={id:'ui',no:c.species,level:50,berryEvaluationLevel:c.level,ribbonHours:0,skillLevel:1,ingredients:Object.fromEntries([1,30,60].map((l,i)=>[l,c.ingredients[i]]).filter(([l,n])=>n)),...original.idealConfiguration};
 const result=ctx.berryRoleEvaluation(item,p);assert.equal(result.status,'ready');assert.equal(result.rank,'S');assert.equal(result.value,entry.ideal);checks+=3;
 const median=ctx.berryRoleEvaluation({...item,...original.standardConfiguration},p);assert.equal(median.value,entry.standard);assert.equal(median.rank,'C');checks+=2;
 const trained=ctx.berryRoleEvaluation({...item,ribbonHours:2000,skillLevel:7},p);assert.equal(trained.value,result.value);assert.equal(trained.rank,result.rank);checks+=2;
 const html=ctx.renderIndividualEvaluation(item,p);assert(html.includes('きのみ適性'));assert(html.includes('満杯目安'));assert(!html.includes('無補正比'));assert(html.includes('value="80"'));checks+=4;
}
const p=catalog.pokemon[26],item={id:'missing',no:26,level:50,nature:'がんばりや',subskills:[],ingredients:{}};
assert.equal(ctx.berryRoleEvaluation(item,p).status,'pending');checks++;
assert.equal(ctx.berryRoleEvaluation({...item,berryEvaluationLevel:80},p).status,'pending');checks++;
assert(ctx.renderIndividualEvaluation({...item,berryEvaluationLevel:80},p).includes('Lv.80のサブスキル'));checks++;
console.log(JSON.stringify({checksPassed:checks,referenceCoverage:154,normalization:'ribbon0_skill1',capUnchanged:70}));
// Runtime integration: one selected level only, cached, and no saved-record mutation.
const calculate=ctx.dailyBaseline,calls=[];ctx.dailyBaseline=(...args)=>{calls.push(args);return calculate(...args)};
ctx.individualIdealCandidates=()=>{throw Error('No population enumeration on the browser path')};
const entry=Object.values(ctx.window.PS_BERRY_REFERENCES.entries).find(e=>e.context.species===26&&e.context.level===50);
const original=JSON.parse(fs.readFileSync('tests/fixtures/berry-role-references.json','utf8')).entries[entry.key];
const record={id:'registered',no:26,level:50,ribbonHours:2000,skillLevel:7,ingredients:{1:entry.context.ingredients[0],30:entry.context.ingredients[1],60:entry.context.ingredients[1]},...original.idealConfiguration,subskills:original.idealConfiguration.subskills.slice(0,3)};
const saved=JSON.stringify(record),run=()=>calculate([record.id],[record],catalog,4,100,true,3).members[0];
const before=run(),forecast=JSON.stringify({...before,normalFoods:[...before.normalFoods],foods:[...before.foods]});
ctx.berryRoleEvaluation(record,p);assert.equal(calls.length,1);assert.equal(calls[0][1][0].ribbonHours,0);assert.equal(calls[0][1][0].skillLevel,1);
ctx.berryRoleEvaluation(record,p);assert.equal(calls.length,1,'cached rendering never recalculates');
let currentSelect={value:'60'},rendered='';
const panel={set outerHTML(value){rendered=value;currentSelect={value:'80'}}};
const host={querySelector:s=>s==='.psg-berry-level'?currentSelect:panel};
ctx.bindIndividualEvaluation(host,record,p);currentSelect.onchange();assert.equal(calls.length,2,'select calculates only the chosen level');assert(rendered.includes('value="60" selected'));
currentSelect.onchange();assert.equal(calls.length,2,'missing Lv80 inputs must not calculate');assert(rendered.includes('未判定'));
assert.equal(JSON.stringify(record),saved,'evaluation must not change the stored individual');
const after=run();assert.equal(JSON.stringify({...after,normalFoods:[...after.normalFoods],foods:[...after.foods]}),forecast,'registered daily forecast remains byte-for-byte unchanged');
assert(before.stats.carry>ctx.berryRoleEvaluation(record,p).member.stats.carry,'registered ribbon remains in actual daily forecast');
console.log('Selected-level cache, incomplete-input guard, no enumeration and registered forecast preservation verified');
