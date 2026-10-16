// Refuse partial populations; keep the existing ON species files unchanged.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.resolve(__dirname,'../..'),base=process.env.PSN_REFERENCE_COMMIT||JSON.parse(fs.readFileSync(root+'/research/food-expansion-prep/inventory.json')).commit;
const fingerprint=JSON.parse(fs.readFileSync(root+'/research/food-expansion-prep/inventory.json')).engineFingerprint,conditions={ticket:false,collectionHours:4,awakeHours:16,sleepHours:8,startEnergy:100,meals:3,ribbonHours:0,externalSupport:false,fieldBonus:false,favoriteBonus:false,exBonus:false,eventBonus:false};
for(const kind of ['berry','skill']){
 const version=kind==='berry'?6:2,file=root+'/assets/evaluation/'+kind+'_manifest_v'+version+'.json',old=JSON.parse(fs.readFileSync(file)),manifest={...old,engineCommit:base,engineFingerprint:fingerprint,conditions,checks:0,combinations:0,entries:{},species:{}};
 let count=0,totals=0;
 for(const [id,meta] of Object.entries(old.species)){
  const rel='assets/evaluation/'+kind+'_camp_off/'+id+'.json',target=root+'/'+rel,part=JSON.parse(fs.readFileSync(target));
  assert.equal(part.version,version);assert.equal(part.engineCommit,base);assert.equal(part.conditions.ticket,false);assert.equal(Object.keys(part.entries).length,4*(kind==='berry'&&meta.skillSensitive?meta.availableSkillLevels.length:1));
  for(const [key,e] of Object.entries(part.entries)){assert.equal(JSON.parse(key)[0],id);assert.equal(e.distributionBounds.reduce((n,b)=>n+b[2],0),e.count);assert(e.ideal>0);count++}
  if(kind==='berry'){assert.equal(part.speciesId,id);totals+=Object.keys(part.totalEntries).length;assert.equal(part.meta.defaultSkillLevel,meta.defaultSkillLevel)}
  else{assert.equal(part.species[id].defaultSkillLevel,meta.defaultSkillLevel);part.speciesId=id}
  part.conditions=conditions;part.engineFingerprint=fingerprint;manifest.checks+=part.checks;manifest.combinations+=part.combinations;
  fs.writeFileSync(target,JSON.stringify(part));manifest.species[id]={...meta,file:rel};
 }
 assert.equal(count,kind==='berry'?332:352);if(kind==='berry')assert.equal(totals,1036);
 fs.writeFileSync(file.replace('.json','_off.json'),JSON.stringify(manifest));console.log(kind,Object.keys(manifest.species).length,count,totals);
}
