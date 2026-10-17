// First recovery representative only. Include skill probability in the weighted signature.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),{ctx,catalog}=require('../../tests/skill_model_runtime.cjs').createRuntime(root);
const p=catalog.pokemon[71],speciesId='0071_default',names=catalog.subskills.map(s=>s.name),natures=catalog.natures.rows.flat();
const grouped=new Map();let count=0;
function* combinations(k,start=0,current=[]){if(!k){yield current;return}for(let i=start;i<=names.length-k;i++)yield*combinations(k-1,i+1,[...current,names[i]])}
for(const subskills of combinations(5))for(const nature of natures){
 const record={id:'food-rank-recovery',no:71,speciesId,level:80,skillLevel:3,ribbonHours:0,subskills,nature};
 const stats=ctx.individualCorrections(record,p,subskills.includes('おてつだいボーナス')?.05:0);
 const signature=JSON.stringify([stats.speed,stats.carry,stats.food,stats.berryQty,stats.energyFactor,stats.skill]);
 if(!grouped.has(signature))grouped.set(signature,{record,weight:0});grouped.get(signature).weight++;count++;
}
assert.equal(count,154700);assert.equal(grouped.size,19551);
for(const camp of [false,true]){
 const references=JSON.parse(fs.readFileSync(path.join(root,`assets/evaluation/food_recovery_v4${camp?'':'_off'}_80.json`)));
 const output={version:1,axis:'normalFoodsFixedPatternRank',speciesId,level:80,prediction:true,stage:'recovery',sourceCommit:'4c5ec74ecd4180093b6bd59ae796157bb443a777',engineFingerprint:references.engineFingerprint,conditions:references.conditions,count,evaluatedSignatures:grouped.size,tolerance:1e-9,entries:{}};
 for(let b=0;b<2;b++)for(let c=0;c<3;c++){
  const pattern='A'+String.fromCharCode(65+b)+String.fromCharCode(65+c),ingredients={1:p.ingredientSlots[0].candidates[0].name,30:p.ingredientSlots[1].candidates[b].name,60:p.ingredientSlots[2].candidates[c].name};
  let ideal=-Infinity;const values=new Map();
  for(const {record,weight} of grouped.values()){
   const item={...record,ingredients},result=ctx.dailyBaseline([item.id],[item],catalog,4,100,camp,3,[],0,{},null,{},null,{trackCarryFill:false});
   const member=result.members[0];assert(member&&!member.missing);
   const value=[...member.normalFoods.values()].reduce((a,b)=>a+b,0);ideal=Math.max(ideal,value);
   values.set(value,(values.get(value)||0)+weight);
  }
  const ref=references.entries[JSON.stringify([speciesId,80,pattern])];
  assert(Math.abs(ideal-ref.ideal.value)<1e-9,`Published ideal mismatch: ${camp} ${pattern}`);
  assert.equal(ref.fullConfigurations,count);assert.equal(ref.evaluated,grouped.size);
  output.entries[pattern]={pattern,count,ideal,distribution:[...values].sort((a,b)=>a[0]-b[0])};
  console.log(JSON.stringify({camp,pattern,ideal,population:count,signatures:grouped.size,points:values.size}));
 }
 fs.writeFileSync(path.join(root,`assets/evaluation/food_rank_victreebel_v1${camp?'':'_off'}_80.json`),JSON.stringify(output)+'\n');
}
