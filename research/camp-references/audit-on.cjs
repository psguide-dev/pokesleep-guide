// Audit the ON compatibility branch before refreshing source provenance.
// The shared daily kernel is unchanged; only selection of its camp argument changed.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),root=path.resolve(__dirname,'../..');
const {ctx}=require(root+'/tests/skill_model_runtime.cjs').createRuntime(root);
const parts=['food_direct_v3','food_recovery_v4'].flatMap(g=>[60,70,80].map(l=>root+'/assets/evaluation/'+g+'_'+l+'.json'));
let checked=0;
for(const file of parts){const data=JSON.parse(fs.readFileSync(file));for(const [key,entry] of Object.entries(data.entries)){
 const [id,level]=JSON.parse(key),record={id:'on-audit',no:entry.no,speciesId:id,level,skillLevel:entry.skillLevel,ribbonHours:0,...entry.ideal.record};
 const selected=ctx.calculateIndividualTrial(record),fixed=ctx.individualTrialSnapshot(ctx.dailyBaseline([record.id],[record],ctx.window.PS_CATALOG,4,100,true,3,[],0,{},null,{},null,{unlimitedCarry:false}).members[0]);
 assert(!selected.reasons);assert.equal(selected.values.food,entry.ideal.value,key);assert.equal(selected.values.food,fixed.values.food,key);assert.deepEqual(Object.fromEntries(selected.member.normalFoods),entry.ideal.foods,key);checked++;
}}
const provenanceFile=root+'/research/food-role-v2/engine-source-sha256.json',provenance=JSON.parse(fs.readFileSync(provenanceFile));
for(const [file,hash] of Object.entries(provenance.sources)){
 const current=crypto.createHash('sha256').update(fs.readFileSync(root+'/'+file)).digest('hex');
 if(file==='templates/core/12-individual-trial.html')provenance.sources[file]=current;else assert.equal(current,hash,'Unexpected engine change: '+file);
}
assert.equal(checked,1482);fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
const inventory=JSON.parse(fs.readFileSync(root+'/research/food-expansion-prep/inventory.json'));
for(const file of parts){const data=JSON.parse(fs.readFileSync(file));data.engineFingerprint=inventory.engineFingerprint;data.compatibilityAudit='v631 ON: all 1482 stored ideal food totals and per-food quantities match the fixed-ON shared daily model';fs.writeFileSync(file,JSON.stringify(data));}
fs.writeFileSync(__dirname+'/on-audit.json',JSON.stringify({checked,unchangedON:true,engineFingerprint:inventory.engineFingerprint,note:'ON references keep the same numeric entries. OFF references are separately enumerated; no scaling.'},null,2)+'\n');console.log('Audited unchanged ON totals and per-food quantities:',checked);
