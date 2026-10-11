const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const ctx=vm.createContext({window:{PS_CATALOG:{natures:JSON.parse(read('master/natures/data.json')),subskills:JSON.parse(read('master/subskills/data.json')).records},PS_SWAP_ENGINE:{ribbon:()=>({capacity:8,time:.9})}}});
vm.runInContext(read('templates/00-number-format.html').replace(/<\/?script[^>]*>/g,''),ctx);
vm.runInContext(read('templates/core/07-corrections.html'),ctx);
const source=read('templates/box/03-view.html');
vm.runInContext(source.slice(source.indexOf('function boxStatSummary'),source.indexOf('const boxStatPopover=')),ctx);
ctx.p={no:244,help:3600,carry:10,foodRate:20,skillRate:5,berryQty:1};
ctx.item={level:65,nature:'いじっぱり',ribbonHours:2000,evolutionCount:2,subskills:['スキル確率アップM','スキル確率アップS','おてつだいスピードM','食材確率アップM','最大所持数アップL']};
const calc=()=>vm.runInContext('individualCorrections(item,p)',ctx);
const summary=kind=>{ctx.kind=kind;ctx.calc=calc();return Array.from(vm.runInContext('boxStatSummary(item,p,calc,kind)',ctx))};
const c=calc(),b=c.breakdown;
assert(Math.abs(c.speed-ctx.p.help*b.levelFactor*b.natureSpeed*.9*(1-b.soloSpeedReduction))<1e-9);
assert(Math.abs(c.food-ctx.p.foodRate*b.natureFood*(1+b.foodBonus))<1e-9);
assert(Math.abs(c.skill-ctx.p.skillRate*b.natureSkill*(1+b.skillBonus))<1e-9);
assert.equal(c.carry,10+8,'capture-history fields cannot add capacity to a non-evolving species');assert.equal(b.skillBonus,.54);
assert(summary('speed').includes('サブスキル・時間：−14.0%'));
assert(!summary('food').some(line=>line.includes('サブスキル')),'locked food bonus is omitted');
assert(!summary('carry').some(line=>line.includes('サブスキル')),'locked carry bonus is omitted');
ctx.item.mint=true;assert.equal(calc().breakdown.natureSpeed,1);assert(!summary('speed').some(line=>line.startsWith('性格')));
ctx.item.mint=false;ctx.item.nature='';assert(summary('food').includes('性格未設定（暫定）'));
ctx.p.skillRate=null;assert(summary('skill').includes('基礎データ未確認'));
ctx.p.mythicalSettings={};ctx.item.mythicalState={subskillUnlocked:{0:false,1:true}};assert.equal(calc().breakdown.skillBonus,.18);
assert(summary('skill').includes('サブスキル：1.18倍'));
ctx.p.mythicalSettings=null;ctx.item.level=70;ctx.item.subskills=Array(5).fill('おてつだいスピードM');assert.equal(calc().breakdown.soloSpeedReduction,.35);
assert(read('styles/07-current-ui.css').includes('inset:0 -12px;background:var(--box-type-bg,var(--bg));z-index:-1'),'sticky backing must not spill below Block 1');
assert(!read('styles/07-current-ui.css').includes('box-shadow:0 0 0 12px var(--box-type-bg'));
assert(source.includes("artwork.classList.toggle('psg-special-portrait',p?.specialTeamLimited===true)"));
assert(source.includes('aria-haspopup="dialog"'));assert(read('templates/10-box-detail.html').includes('popover="auto"'));
assert(read('styles/10-detail-facts.css').includes('.psg-fact-speed>.psg-detail-stat{width:100%;height:100%}'));
console.log('Box corrections: same-engine factors, active/locked skills, nature/mint, ribbon/evolution, cap, missing rate, special frame and bounded sticky backing passed.');

const pokemon=Object.fromEntries(fs.readdirSync(require('node:path').join(__dirname,'../master/pokemon')).filter(name=>/^\d+$/.test(name)).map(name=>{const p=JSON.parse(read('master/pokemon/'+name+'/data.json'));return [p.no,p]}));
ctx.window.PS_CATALOG={...ctx.window.PS_CATALOG,pokemon,forms:JSON.parse(read('master/forms/data.json'))};
ctx.item={level:30,nature:'がんばりや',subskills:[],ribbonHours:0};
for(const [no,stage] of [[1,0],[2,1],[3,2],[172,0],[25,1],[26,2],[133,0],[134,1],[244,0]]){
 ctx.p=pokemon[no];
 for(const oldCount of [undefined,0,1,2]){
  ctx.item.evolutionCount=oldCount;
  assert.equal(calc().breakdown.evolutionStage,stage,'current stage for '+no);
  assert.equal(calc().carry,ctx.p.carry+5*stage,'same stage bonus regardless of capture history for '+no);
 }
 if(stage)assert(summary('carry').includes('進化段階（'+stage+'進化）：＋'+ctx.window.PS_NUMBERS.display(stage*5))); else assert(!summary('carry').some(line=>line.startsWith('進化段階')));
}
for(const [id,stage] of [['0025_captain',1],['0710_medium',0],['0711_medium',1]]){
 const form=ctx.window.PS_CATALOG.forms.species.find(p=>p.speciesId===id);
 assert(form,'form fixture exists: '+id);ctx.p=form;assert.equal(calc().breakdown.evolutionStage,stage);
}
assert(!read('templates/10-box-detail.html').includes('name="evolutionCount"'));
assert(!read('templates/box/03-view.html').includes('入手後の進化回数 × 5'));
ctx.p=pokemon[244];ctx.item={level:65,nature:'いじっぱり',ribbonHours:0,subskills:['スキル確率アップM','スキル確率アップS']};ctx.calc=calc();
assert.deepEqual(summary('speed'),['Lv.65・時間：−12.8%','性格・時間：−10.0%']);
assert.deepEqual(summary('skill'),['サブスキル：1.54倍','補正前 2.3% → 3.5%','確率は推定値']);
assert.deepEqual(summary('food'),['性格：0.8倍','補正前 18.7% → 15.0%','確率は推定値']);
ctx.p=pokemon[3];ctx.calc=calc();assert(summary('carry').some(line=>line==='進化段階（2進化）：＋10.0'));
assert(summary('carry').length<=4);
assert(read('styles/10-detail-facts.css').includes('#boxStatPopover::backdrop{background:transparent}'));
console.log('Current species stage: unevolved, 1/2 evolutions, baby/branched lines and legacy capture counts passed.');
