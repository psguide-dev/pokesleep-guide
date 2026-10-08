const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{PS_CATALOG:{natures:JSON.parse(read('master/natures/data.json')),subskills:JSON.parse(read('master/subskills/data.json'))}},boxEsc:String};
if(!Array.isArray(ctx.window.PS_CATALOG.subskills))ctx.window.PS_CATALOG.subskills=ctx.window.PS_CATALOG.subskills.records;
vm.createContext(ctx);vm.runInContext(read('templates/00-number-format.html').replace(/<\/?script[^>]*>/g,''),ctx);vm.runInContext(read('templates/core/07-corrections.html')+read('templates/core/10-individual-evaluation.html'),ctx);
ctx.p={no:1,help:3600,carry:10,foodRate:20,skillRate:5,berryQty:2,specialty:'きのみ'};
const run=(item,fn='individualOpportunities')=>{ctx.item=item;return vm.runInContext(`${fn}(item,p)`,ctx)};
const base={level:10,nature:'がんばりや',subskills:['最大所持数アップS']},a=run(base);
assert.equal(a.berry,3600/(3600*.982)*.8*2);assert(Math.abs(a.food-3600/(3600*.982)*.2)<1e-12);
assert(run({...base,subskills:['きのみの数S']}).berry>a.berry);
assert(run({...base,subskills:['食材確率アップS']}).food>a.food);
assert(run({...base,subskills:['スキル確率アップS']}).skill>a.skill);
const hb=run({...base,subskills:['おてつだいボーナス']});assert(Math.abs(hb.food-3600/(3600*.982*.95)*.2)<1e-12);
assert.equal(run({...base,subskills:['最大所持数アップS','きのみの数S']}).berry,a.berry);
assert.equal(run({...base,skillLevel:8}).skill,a.skill);
assert(run({...base,nature:''},'individualEvaluation').reasons.length);
assert.equal(run({...base,nature:'',mint:true},'individualEvaluation').reasons.length,0);
assert(run({...base,subskills:[]},'individualEvaluation').reasons.length);
assert(run({...base,level:25,subskills:['きのみの数S','きのみの数S']},'individualEvaluation').reasons.length);
for(const level of [1,10,25,50,70]){ctx.level=level;const ideals=vm.runInContext('individualIdeal(p,level)',ctx);for(const role of ['berry','food','skill']){const ideal=ideals[role];const result=run({level,nature:ideal.nature,subskills:ideal.subskills},'individualEvaluation');assert(Math.abs(result.rows.find(x=>x.role===role).ratio-1)<1e-12);}}
ctx.p.foodRate=null;assert.equal(run(base,'individualEvaluation').rows[0].ratio,null);
console.log('Individual evaluation: known math, own bonus once, locked skills, missing inputs, duplicate skills, mint, all ideal levels and missing rates passed.');

ctx.p.foodRate=20;const futureItem={level:9,nature:'がんばりや',subskills:['きのみの数S']};const growth=run(futureItem,'individualGrowthEvaluation');assert.equal(growth.level,10);assert.equal(futureItem.level,9);assert.equal(growth.reasons.length,0);assert.equal(run({...futureItem,subskills:[]},'individualGrowthEvaluation').reasons.length,1);assert.equal(run({...futureItem,level:70},'individualGrowthEvaluation'),null);console.log('Growth evaluation: next unlock, missing future slot, no mutation and max level passed.');
ctx.PS_IMAGE_FILES={subskills:{}};ctx.p.specialty='食材';
for(const [name,key]of [['きのみ','berry'],['食材','food'],['スキル','skill']]){const role=run({...base,role:name},'individualEvaluationRole');assert.equal(role.role,key);assert.equal(role.explicit,true);const html=run({...base,role:name},'renderIndividualEvaluation');assert(html.includes('is-primary" data-role="'+key+'"'));assert(html.includes('他の役割'));}
assert.equal(run({...base,role:''},'individualEvaluationRole').role,'food');assert.equal(run({...base,role:'旧メモ'},'individualEvaluationRole').explicit,false);ctx.p.specialty='オール';assert.equal(run({...base,role:''},'individualEvaluationRole').role,null);console.log('Role evaluation: three selected roles, primary markup, other roles, unset and legacy fallback, all specialty passed.');
ctx.p.specialty='食材';
for(const level of [1,10,25,50,70]){
 ctx.level=level;
 const result=run({level,nature:'がんばりや',subskills:['きのみの数S','おてつだいボーナス','食材確率アップM','おてつだいスピードM','スキル確率アップM']},'individualEvaluation');
 for(const row of result.rows){ctx.ideal=row.ideal;ctx.role=row.role;const slots=vm.runInContext('individualIdealSlots(p,level,role,ideal)',ctx);assert.equal(slots.length,5);assert.equal(new Set(slots).size,5);assert.deepEqual(Array.from(slots.slice(0,row.ideal.subskills.length)),Array.from(row.ideal.subskills));}
}
const allSlotsHtml=run({...base,role:'食材'},'renderIndividualEvaluation');assert(!allSlotsHtml.includes('次のサブスキル解放'));assert(allSlotsHtml.includes('Lv.80'));assert(allSlotsHtml.includes('psg-ideal-slot is-locked'));assert(run({...base,level:80},'renderIndividualEvaluation').includes('未実装Lv'));console.log('Full ideal slots: five unique skills, fixed active slots, locked future slots and unavailable Lv.80 preserved.');

const compactHtml=vm.runInContext('renderIndividualEvaluation({level:10,nature:"がんばりや",subskills:["食材確率アップM"],role:"食材"},p,{compact:true})',ctx);assert(compactHtml.includes('理想比'));assert(!compactHtml.includes('理想構成'));assert(!compactHtml.includes('他の役割'));assert(!compactHtml.includes('同じ種族'));assert(!allSlotsHtml.includes('同じ種族での補正評価'));
for(const specialty of ['きのみ','食材','スキル','オール','オールマイティー']){ctx.specialty=specialty;assert.equal(vm.runInContext('defaultIndividualRole({specialty})',ctx),['きのみ','食材','スキル'].includes(specialty)?specialty:'');}console.log('Compact comparison: labels and alternate roles removed; specialty defaults exclude all-rounders.');

const fixedReference=vm.runInContext('individualIdeal(p,1)',ctx);for(const level of [10,25,50,70]){ctx.level=level;const next=vm.runInContext('individualIdeal(p,level)',ctx);for(const role of ['berry','food','skill']){assert.deepEqual(Array.from(next[role].subskills),Array.from(fixedReference[role].subskills));assert.equal(next[role].nature,fixedReference[role].nature);ctx.reference=next[role];ctx.role=role;assert.equal(vm.runInContext('individualOpportunities({level,nature:reference.nature,subskills:reference.subskills},p)[role]',ctx),next[role].rate);}}console.log('Fixed ideals: nature and all five assigned slots stable across unlock levels; locked skills excluded from rates.');
ctx.p.mythicalSettings={};ctx.p.dailyCalculationStatus='pending_special_skill';
const special={level:25,nature:'がんばりや',role:'食材',subskills:['おてつだいボーナス','食材確率アップM'],mythicalState:{subskillUnlocked:{0:false,1:true}}};
const specialScore=run(special,'individualEvaluation');assert.equal(specialScore.reasons.length,0);assert(specialScore.rows.every(r=>Number.isFinite(r.ratio)));
assert.equal(run(special).food,run({...special,subskills:['きのみの数S','食材確率アップM']}).food);
assert(run({...special,mythicalState:{subskillUnlocked:{1:true}}},'individualEvaluation').reasons.some(x=>x.includes('解放状態')));
assert(!run(special,'renderIndividualEvaluation').includes('個体評価は未対応'));
const unchanged=JSON.stringify(special);run(special,'individualEvaluation');assert.equal(JSON.stringify(special),unchanged);
ctx.p.mythicalSettings=null;assert.equal(run(base,'individualEvaluation').reasons.length,0);
console.log('Special individuals: pending-skill gate removed, unlocked-only bonus and reference, unknown unlocks, no mutation and ordinary regression passed.');

ctx.item={...base,evolutionCount:1,skillLevel:6};assert.equal(vm.runInContext('individualCorrections(item,p).carry',ctx),21);
ctx.item={...base,evolutionCount:2};assert.equal(vm.runInContext('individualCorrections(item,p).carry',ctx),26);
ctx.item={...base,evolutionCount:0};assert.equal(vm.runInContext('individualCorrections(item,p).carry',ctx),16);
console.log('Evolution carry +5/+10 applied once; no species base overwrite.');
