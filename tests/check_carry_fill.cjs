// Enigma receipt 20261013: regression examples, not adopted standard individuals.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('review.html','utf8'),catalog=JSON.parse(html.split('window.PS_CATALOG=')[1].split(';\n')[0]);
const ctx={window:{PS_CATALOG:catalog,PS_SWAP_ENGINE:require('../vendor/enigma-swap/daily-supply.mjs')},structuredClone,boxEsc:String};vm.createContext(ctx);
for(const f of ['templates/00-number-format.html','templates/core/07-corrections.html','templates/core/10-individual-evaluation.html','templates/core/12-individual-trial.html','templates/core/13-individual-simple.html'])vm.runInContext(fs.readFileSync(f,'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
vm.runInContext(require('./daily_kernel.cjs'),ctx);
for(const [hours,capacity,expected] of [[4,6,4050],[1,6,null],[4,2,1350],[4,0,1350]]){
 const toy={stats:{speed:3600},energy:100,averageSize:2,carryFillProbe:{capacity,seconds:null}};
 ctx.dailyAdvanceLinkedMember(toy,hours,0,[],true);assert.equal(toy.carryFillProbe.seconds,expected);
}
const configs=[
 [26,62,1,1000,{1:'とくせんリンゴ',30:'とくせんリンゴ',60:'とくせんリンゴ'},[['のうてんき',['おてつだいボーナス','睡眠EXPボーナス','リサーチEXPボーナス','きのみの数S','おてつだいスピードS']],['いじっぱり',['きのみの数S','おてつだいスピードS','おてつだいスピードM','おてつだいボーナス','食材確率アップS']]]],
 [9,62,3,1000,{1:'モーモーミルク',30:'リラックスカカオ',60:'リラックスカカオ'},[['ひかえめ',['スキル確率アップS','ゆめのかけらボーナス','リサーチEXPボーナス','きのみの数S','おてつだいボーナス']],['れいせい',['おてつだいスピードM','食材確率アップS','食材確率アップM','きのみの数S','おてつだいボーナス']]]],
 [303,50,1,200,{1:'ピュアなオイル',30:'ワカクサコーン'},[['おくびょう',['食材確率アップS','最大所持数アップM','スキルレベルアップM','きのみの数S','おてつだいボーナス']],['れいせい',['おてつだいスピードM','食材確率アップS','食材確率アップM','きのみの数S','おてつだいボーナス']]]],
 [380,36,1,0,{1:'あんみんトマト',30:'あんみんトマト'},[['がんばりや',['おてつだいスピードS','最大所持数アップL','きのみの数S','おてつだいボーナス','おてつだいスピードM']],['なまいき',['おてつだいスピードM','スキル確率アップM','きのみの数S','おてつだいボーナス','おてつだいスピードS']]]]
];
let comparisons=0;
for(const [no,level,skillLevel,ribbonHours,ingredients,candidates] of configs){
 if(!catalog.pokemon[no])catalog.pokemon[no]=catalog.forms.species.find(p=>p.no===no&&p.speciesId.endsWith('_default'));
 for(const [nature,subskills] of candidates)for(const camp of [false,true]){
  const item={id:'fill',no,level,skillLevel,ribbonHours,ingredients,nature,subskills};
  const run=track=>ctx.dailyBaseline([item.id],[item],catalog,4,100,camp,3,[],0,{},null,{},null,{trackCarryFill:track}).members[0];
  const tracked=run(true),plain=run(false);
  for(const field of ['normalBerries','berries','skillTriggers','overflow','energy','normalHelps','pendingHelpSeconds']){assert.equal(tracked[field],plain[field]);comparisons++;}
  assert.equal(JSON.stringify([...tracked.normalFoods]),JSON.stringify([...plain.normalFoods]));comparisons++;
  assert.equal(tracked.carryFillWindows.length,5);assert(!Object.hasOwn(plain,'carryFillWindows'));assert(!Object.hasOwn(tracked,'carryFillProbe'));
  tracked.carryFillWindows.forEach((w,i)=>{assert(w.seconds===null||(w.seconds>0&&w.seconds<=w.observedSeconds));assert.equal(w.startHour,i*4);assert.equal(w.sleep,i===4);assert.equal(w.durationHours,i===4?8:4);assert.equal(w.capacity,tracked.stats.carry*(camp?1.2:1));});
 }
}
assert.equal(ctx.carryFillSummary(null).status,'unknown');
assert.equal(ctx.carryFillSummary({carryFillWindows:[]}).status,'unknown');
assert.equal(ctx.carryFillSummary({carryFillWindows:[{sleep:false,seconds:null}]}).status,'not_reached');
assert.equal(ctx.carryFillSummary({carryFillWindows:[{sleep:false,seconds:0}]}).text,'満杯目安：約0分');
assert.equal(ctx.carryFillSummary({carryFillWindows:[{sleep:false,seconds:4050},{sleep:false,seconds:4000},{sleep:true,seconds:1}]}).text,'満杯目安：約1時間7分');
console.log('Carry-fill observation: 16 scenarios, '+comparisons+' unchanged forecast comparisons; boundaries and unknown/not-reached/zero verified');
