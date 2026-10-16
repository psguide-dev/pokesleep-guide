const fs=require('node:fs'),assert=require('node:assert/strict'),root=require('node:path').resolve(__dirname,'..');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(root);
const inventory=JSON.parse(fs.readFileSync(root+'/research/food-expansion-prep/inventory.json'));
let checked=0;
for(const row of inventory.rows.filter(row=>row.stage==='recovery')){
 const p=ctx.window.PS_SPECIES({no:row.no,speciesId:row.id});
 const item={id:'recovery-check',no:row.no,speciesId:row.id,level:80,skillLevel:row.defaultSkillLevel,ribbonHours:0,nature:'がんばりや',subskills:['食材確率アップM','食材確率アップS','おてつだいスピードM','おてつだいスピードS','最大所持数アップL'],ingredients:Object.fromEntries(p.ingredientSlots.map(slot=>[slot.unlock,slot.candidates[0].name]))},before=JSON.stringify(item);
 const actual=ctx.calculateIndividualTrial(item),skill=catalog.skills[p.mainSkillId],saved=structuredClone(skill.levels);
 let without;
 try{for(const level of Object.values(skill.levels))if(Number.isFinite(level.recovery))level.recovery=0;without=ctx.calculateIndividualTrial(item)}finally{skill.levels=saved}
 assert(!actual.reasons&&!without.reasons,row.id);
 assert(actual.values.food>=without.values.food-1e-8,row.id+' recovery must not reduce normal ingredient collection');
 assert(actual.member.skillTriggers>0,row.id);
 assert.equal(JSON.stringify(item),before);
 if([71,113,764].includes(row.no))assert(actual.values.food>without.values.food+1e-8,'Self/team/target recovery must feed back into solo food collection');
 checked++;
}
const p=catalog.pokemon[71],item={id:'rate-signature',no:71,level:80,skillLevel:3,ribbonHours:0,nature:'がんばりや',subskills:['食材確率アップM','食材確率アップS','おてつだいスピードM','おてつだいスピードS','リサーチEXPボーナス'],ingredients:Object.fromEntries(p.ingredientSlots.map(slot=>[slot.unlock,slot.candidates[0].name]))};
const stronger={...item,subskills:[...item.subskills.slice(0,4),'スキル確率アップM']};
const a=ctx.individualCorrections(item,p),b=ctx.individualCorrections(stronger,p);
for(const field of ['speed','carry','food','berryQty','energyFactor'])assert.equal(a[field],b[field]);
assert(b.skill>a.skill);
assert(ctx.calculateIndividualTrial(stronger).values.food>ctx.calculateIndividualTrial(item).values.food,'Recovery reference search must retain different skill probabilities');
console.log(`Food recovery: ${checked} identities, recovery OFF controls, self/team/target solo feedback and skill probability distinction passed`);
