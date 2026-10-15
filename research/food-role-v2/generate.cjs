const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),{ctx,catalog,commit}=require(root+'/tests/skill_model_runtime.cjs').createRuntime(root);
vm.runInContext('globalThis.foodNatures=Object.keys(NATURE_EFFECTS);globalThis.foodNames=SUBSKILL_NAMES;globalThis.foodUnlocks=SUBSKILL_LEVELS;',ctx);
const out={version:2,engineCommit:commit,axis:'normalFoodsFixedPattern',conditions:{camp:true,collectionHours:4,awakeHours:16,sleepHours:8,startEnergy:100,meals:3,ribbonHours:0},species:{},entries:{}};
function combinations(a,k,start=0,p=[],out=[]){if(!k){out.push(p);return out}for(let i=start;i<=a.length-k;i++)combinations(a,k-1,i+1,[...p,a[i]],out);return out}
function patterns(slots,i=0,p={},out=[]){if(i===slots.length){out.push(p);return out}for(const c of slots[i].candidates)patterns(slots,i+1,{...p,[slots[i].unlock]:c.name},out);return out}
for(const no of [6,9,94]){const p=catalog.pokemon[no],id=String(no).padStart(4,'0')+'_default';out.species[id]={no,name:p.name};for(const level of [60,70,80]){
 const skillLevel=Math.min(1+ctx.speciesEvolutionStage(p),catalog.skills[p.mainSkillId].maxLevel),combos=combinations(Array.from(ctx.foodNames),ctx.foodUnlocks.filter(n=>n<=level).length),unique=new Map();
 for(const skills of combos)for(const nature of ctx.foodNatures){const r={id:'food',no,speciesId:id,level,skillLevel,ribbonHours:0,nature,subskills:skills};const c=ctx.individualCorrections(r,p,skills.includes('おてつだいボーナス')?.05:0);const key=JSON.stringify([c.speed,c.carry,c.food,c.berryQty,c.energyFactor]);if(!unique.has(key))unique.set(key,r)}
 const variants=patterns(p.ingredientSlots.filter(s=>s.unlock<=level));let evaluated=0;
 for(const ingredients of variants){let ideal=null;for(const r of unique.values()){
 const record={...r,ingredients},s=ctx.calculateIndividualTrial(record);if(s.reasons)throw Error(s.reasons);
 if(!ideal||s.values.food>ideal.value+1e-10)ideal={value:s.values.food,foods:Object.fromEntries(s.member.normalFoods),record:{nature:r.nature,subskills:r.subskills,ingredients}};evaluated++;
 }
 const pattern=p.ingredientSlots.map(slot=>String.fromCharCode(65+slot.candidates.findIndex(c=>c.name===ingredients[slot.unlock]))).join('');
 out.entries[JSON.stringify([id,level,pattern])]={no,level,pattern,skillLevel,ideal,fullConfigurations:combos.length*ctx.foodNatures.length,evaluated:unique.size};
 }
 console.log(p.name,level,'unique',unique.size,'daily',evaluated);fs.writeFileSync(__dirname+'/references.json',JSON.stringify(out));
 }}
