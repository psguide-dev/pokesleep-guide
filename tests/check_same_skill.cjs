const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {selectSkillRanking,rankTopFive}=await import('../master/rankings/same-skill/selector.mjs');
 const data=JSON.parse(fs.readFileSync('master/rankings/same-skill/same_skill_top5.json','utf8'));
 assert.equal(data.groups.length,148);
 for(const group of data.groups)for(const scope of ['all','skillSpecialists']){
  const result=selectSkillRanking(data,{scenario:group.scenario,skillId:group.skillId,scope});
  assert.deepEqual(result.entries,group[scope]);
  for(const row of result.entries){assert.equal(row.skillId,group.skillId);assert(Number.isFinite(row.skillTriggersPerDay));assert(row.rank<=5);if(scope==='skillSpecialists')assert(['スキル','オール'].includes(row.specialty));}
 }
 assert.throws(()=>selectSkillRanking(data,{scenario:'invalid',skillId:data.groups[0].skillId}),RangeError);
 assert.throws(()=>selectSkillRanking(data,{skillId:'missing'}),RangeError);
 assert.throws(()=>selectSkillRanking(data,{skillId:data.groups[0].skillId,scope:'invalid'}),RangeError);
 const tied=rankTopFive([10,9,8,7,6,6,5].map(skillTriggersPerDay=>({skillTriggersPerDay})));
 assert.equal(tied.length,6);assert.equal(tied[5].rank,5);
 console.log('Same-skill: all 148 groups / both scopes, strict selectors, raw ranks and boundary ties passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
