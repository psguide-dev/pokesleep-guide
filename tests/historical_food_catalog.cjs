// Historical references remain checked against their recorded v663 inputs.
// Production v664 rejects Gengar's stale reference until regeneration.
const assert=require('node:assert/strict');
module.exports=function(catalog){
 const p=catalog.pokemon[94];assert.equal(p.foodRate,16.6);assert.equal(p.foodEvaluationReferencePending,true);
 p.foodRate=16.1;delete p.foodEvaluationReferencePending;delete p.foodRateUpdatedAt;delete p.foodRateUpdateSource;
};
