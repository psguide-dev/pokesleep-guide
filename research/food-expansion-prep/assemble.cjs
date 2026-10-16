// Publish a complete, fingerprint-matched stage without altering existing reference groups.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
const inventory=JSON.parse(fs.readFileSync(__dirname+'/inventory.json'));
const stage=process.argv[2]||'direct',camp=process.argv[3]!=='false',outdir=path.resolve(process.argv[4]||path.join(__dirname,'output'));
if(!['direct','recovery'].includes(stage))throw Error('Unsupported publication stage');
const rows=inventory.rows.filter(row=>row.stage===stage);
const version=stage==='direct'?3:4,prefix=stage==='direct'?'food_direct_v3':'food_recovery_v4';
const out={version,axis:'normalFoodsFixedPattern',engineCommit:inventory.commit,engineFingerprint:inventory.engineFingerprint,conditions:null,species:{},entries:{},scope:{registered:inventory.rows.length,group:stage,implemented:rows.length,recoveryPending:stage==='recovery'?0:inventory.rows.filter(r=>r.stage==='recovery').length,specialPending:inventory.rows.filter(r=>r.stage==='special_review').length,fullExpansion:false}};
for(const row of rows){
 out.species[row.id]={no:row.no,name:row.name};
 for(const level of [60,70,80]){
  const file=path.join(outdir,row.id+'_'+level+'.json'),part=JSON.parse(fs.readFileSync(file));
  if(part.engineFingerprint!==inventory.engineFingerprint||part.speciesId!==row.id||part.level!==level||part.stage!==stage||part.conditions?.camp!==camp||Object.keys(part.entries).length!==row.patterns)throw Error('Incomplete or stale reference '+file);
  if(out.conditions&&JSON.stringify(out.conditions)!==JSON.stringify(part.conditions))throw Error('Mismatched conditions');
  out.conditions=part.conditions;
  for(const [key,entry] of Object.entries(part.entries)){
   if(out.entries[key])throw Error('Duplicate reference '+key);
   out.entries[key]=entry;
  }
 }
}
for(const level of [60,70,80]){const entries=Object.fromEntries(Object.entries(out.entries).filter(([key])=>JSON.parse(key)[1]===level));fs.writeFileSync(root+'/assets/evaluation/'+prefix+(camp?'':'_off')+'_'+level+'.json',JSON.stringify({...out,level,entries}));}
console.log(JSON.stringify({species:Object.keys(out.species).length,entries:Object.keys(out.entries).length,scope:out.scope}));
