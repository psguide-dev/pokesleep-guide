const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const catalog={berries:{'マゴのみ':30,'ドリのみ':30},fields:{a:{},b:{}},pokemon:{},skills:{s:{maxLevel:1,name:'energy',effectType:'fixed_energy',levels:{1:{energy:100}}}}};
for(const [no,berry] of [[1,'マゴのみ'],[2,'ドリのみ']])catalog.pokemon[no]={no,berry,mainSkillId:'s',specialty:'食材',ingredientSlots:[{unlock:1,candidates:[{name:'food',qty:2}]}]};
const box=[{id:'mago',no:1,name:'mago',level:30,nature:'まじめ',subskills:['known','known']},{id:'other',no:2,name:'other',level:30,nature:'まじめ',subskills:['known','known']}],team=box.map(x=>x.id);
let carry=10000;
const ctx={window:{PS_CATALOG:catalog},team,state:{box},SUBSKILL_LEVELS:[10,25,50,70,80],teamSpeedContext:()=>({members:new Map(box.map(item=>[item.id,{speed:3600,carry,food:50,berryQty:1,skill:100,energyFactor:1,unknown:[]}]))})};
vm.createContext(ctx);vm.runInContext(require('./daily_kernel.cjs'),ctx);
const daily=z=>ctx.dailyBaseline(team,box,catalog,4,0,false,false,['マゴのみ'],50,z);
function compare(z,base){assert.equal(z.members[0].berryEnergy,base.members[0].berryEnergy*1.24);assert.equal(z.members[1].berryEnergy,base.members[1].berryEnergy);assert.equal(z.skillEnergy,base.skillEnergy);assert.deepEqual([...z.foods],[...base.foods]);assert.deepEqual(z.members.map(m=>m.berries),base.members.map(m=>m.berries));}
compare(daily({'マゴのみ':24}),daily({}));carry=1;compare(daily({'マゴのみ':24}),daily({}));
assert.equal(daily({'マゴのみ':999}).members[0].zoneFactor,1.24);assert.equal(daily({'マゴのみ':-1}).members[0].zoneFactor,1);assert.equal(daily({'マゴのみ':'bad'}).members[0].zoneFactor,1);
vm.runInContext(require('./whistle_kernel.cjs'),ctx);
const whistle=z=>ctx.whistleEstimate(team,box,catalog,{berryZones:z,favoriteBerries:['マゴのみ'],areaBonus:50});
const w0=whistle({}),w1=whistle({'マゴのみ':24});assert.equal(w1.members[0].berryEnergy,w0.members[0].berryEnergy*1.24);assert.equal(w1.members[1].berryEnergy,w0.members[1].berryEnergy);assert.deepEqual([...w1.foods],[...w0.foods]);assert.equal(w1.berryCount,w0.berryCount);
// The field state is saved independently of the team and expires on a new week.
ctx.FIELD_STORAGE_KEY='fields';ctx.localStorage={getItem:()=>null};ctx.document={getElementById:()=>({value:'',textContent:''})};
vm.runInContext(read('templates/core/03-profiles.html'),ctx);
const week=ctx.currentFieldWeek();const raw={selectedFieldId:'a',berryZone:{fieldId:'a',weekKey:week,values:{'マゴのみ':12.4}}};
ctx.raw=raw;assert.equal(ctx.normalizeFieldProfile(raw).berryZone.values['マゴのみ'],12.4);
assert.equal(ctx.normalizeFieldProfile({...raw,selectedFieldId:'b'}).berryZone,null);
assert.equal(ctx.normalizeFieldProfile({...raw,berryZone:{...raw.berryZone,weekKey:'2000-01-03'}}).berryZone,null);
assert.equal(ctx.normalizeFieldProfile({...raw,berryZone:{...raw.berryZone,values:{'マゴのみ':100}}}).berryZone.values['マゴのみ'],24);
vm.runInContext('fieldProfile=normalizeFieldProfile(raw);team=[];saveFieldProfile=()=>true;',ctx);assert.equal(ctx.activeBerryZones()['マゴのみ'],12.4);
vm.runInContext(read('templates/core/08-fields.html').match(/function selectField\(id\)\{[^\n]+/)[0],ctx);
ctx.selectField('a');assert.equal(ctx.activeBerryZones()['マゴのみ'],12.4);ctx.selectField('b');assert.deepEqual(Object.keys(ctx.activeBerryZones()),[]);ctx.selectField('a');assert.deepEqual(Object.keys(ctx.activeBerryZones()),[]);
console.log('Berry zone: mixed berries, favorite/field stacking, overflow, food/skill isolation, bounds, whistle, saved field/week state and team removal passed.');
