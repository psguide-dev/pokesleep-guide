// Historical references remain checked against their recorded v663 inputs.
// Production v667 uses a species-scoped 16.6% replacement; these checks keep the archived inputs.
const assert=require('node:assert/strict');
module.exports=function(catalog){
 const p=catalog.pokemon[94];assert.equal(p.foodRate,16.6);assert.equal(p.foodEvaluationReferencePending,false);
 for(const no of [200,429]){delete catalog.pokemon[no];delete catalog.sleepStyles[no]}
 delete catalog.skills.magical_flame_s;
 delete p.foodEvaluationReferenceVersion;
 p.foodRate=16.1;delete p.foodEvaluationReferencePending;delete p.foodRateUpdatedAt;delete p.foodRateUpdateSource;
};
