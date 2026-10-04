const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog={natures:JSON.parse(read('master/natures/data.json')),subskills:JSON.parse(read('master/subskills/data.json')),berries:{a:30,b:35},pokemon:{}};
if(!Array.isArray(catalog.subskills))catalog.subskills=catalog.subskills.records;
const ctx={window:{PS_CATALOG:catalog},speciesFor:(item,c=catalog)=>c.pokemon[item?.no],berryEnergyAtLevel:(base,level)=>base+level};
vm.createContext(ctx);
vm.runInContext(read('templates/core/07-corrections.html')+read('templates/core/02-team.html').split('function readTeam')[0]+require('./whistle_kernel.cjs'),ctx);
const box=Array.from({length:10},(_,i)=>{
 catalog.pokemon[i+1]={no:i+1,help:2900+i*137,carry:10,foodRate:18+i*2,berryQty:i%3===0?2:1,berry:i%2?'a':'b',ingredientSlots:[{unlock:1,candidates:[{name:i%2?'apple':'milk',qty:2+i%3}]},{unlock:30,candidates:[{name:'apple',qty:3+i%4}]}]};
 return {id:'id'+i,no:i+1,name:'Test'+i,level:30+i,nature:i%2?'いじっぱり':'ひかえめ',subskills:[i%3===0?'おてつだいボーナス':'おてつだいスピードM',i%2?'きのみの数S':'食材確率アップM']};
});
catalog.pokemon[1].specialTeamLimited=true;catalog.pokemon[2].specialTeamLimited=true;catalog.pokemon[2].specialTeamPair='latias-latios';catalog.pokemon[3].specialTeamLimited=true;catalog.pokemon[3].specialTeamPair='latias-latios';
const options={favoritesKnown:true,favoriteBerries:['a'],areaBonus:65};
function brute(target){let best=-Infinity;function visit(start,ids){if(ids.length===5){const normalized=ctx.normalizeTeam(ids,box);if(normalized.some(x=>!x))return;const r=ctx.whistleEstimate(ids,box,catalog,options),score=target==='berry'?r.berryEnergy:r.foods.get(target)||0;best=Math.max(best,score);return}for(let i=start;i<box.length;i++)visit(i+1,[...ids,box[i].id]);}visit(0,[]);return best;}
for(const target of ['berry','apple','milk']){
 const r=ctx.whistleRecommend(box,catalog,options,target);assert.equal(r.ids.length,5);assert.equal(new Set(r.ids).size,5);assert.equal(target==='berry'?r.result.berryEnergy:r.result.foods.get(target)||0,brute(target));assert.deepEqual(Array.from(ctx.normalizeTeam(r.ids,box)),Array.from(r.ids));
}
// Small special-only boxes choose the legal pair, never duplicate or a third special.
const small=ctx.whistleRecommend(box.slice(0,3),catalog,options);assert.equal(small.ids.length,2);assert(small.ids.includes('id1')&&small.ids.includes('id2'));
assert(ctx.whistleRecommend(box,catalog,{...options,favoritesKnown:false}).reason);
assert.equal(ctx.whistleRecommend(box,catalog,{...options,favoritesKnown:false},'apple').ids.length,5);
assert(ctx.whistleRecommend(box,catalog,{...options,fieldMode:'ex'}).reason);
const incomplete={...box[0],id:'missing',nature:null};const excluded=ctx.whistleRecommend([...box,incomplete],catalog,options);assert.equal(excluded.excluded.length,1);assert(!excluded.ids.includes('missing'));
const assumed=ctx.whistleRecommend([incomplete],catalog,{...options,assumeNeutral:true});assert.equal(assumed.ids.length,1);
assert.equal(ctx.whistleRecommend([],catalog,options).ids.length,0);
const many=Array.from({length:235},(_,i)=>({...box[i%10],id:'many'+i}));const start=Date.now();const r=ctx.whistleRecommend(many,catalog,options,'apple');assert.equal(r.ids.length,5);console.log(`Whistle recommendation: exact brute-force match for berries/two foods, bonuses, special pair, incomplete settings, empty box; 235 individuals in ${Date.now()-start}ms.`);
const html=read('templates/02-home.html');assert(!html.includes('whistleComparePin'));assert(html.includes('whistleTarget'));
for(const targets of [[{name:'apple',weight:3}],[{name:'apple',weight:3},{name:'milk',weight:2}],[{name:'berry',weight:3},{name:'apple',weight:2},{name:'milk',weight:1}]]){
 const recommended=ctx.whistleRecommendWeighted(box,catalog,options,targets);let maximum=-Infinity;
 const score=r=>recommended.targets.reduce((sum,t)=>sum+(t.name==='berry'?r.berryEnergy:r.foods.get(t.name)||0)/t.maximum*t.weight,0);
 function visit(start,ids){if(ids.length===5){if(ctx.normalizeTeam(ids,box).some(x=>!x))return;maximum=Math.max(maximum,score(ctx.whistleEstimate(ids,box,catalog,options)));return}for(let i=start;i<box.length;i++)visit(i+1,[...ids,box[i].id]);}visit(0,[]);
 assert(Math.abs(score(recommended.result)-maximum)<1e-10);
}
assert(ctx.whistleRecommendWeighted(box,catalog,options,[{name:'apple',weight:1},{name:'apple',weight:2}]).reason);
assert(ctx.whistleRecommendWeighted(box,catalog,options,[]).reason);
console.log('Weighted recommendation: exact global optimum for 1/2/3 objectives, mixed energy/food units, duplicate and empty validation.');
catalog.pokemon[5].ingredientSlots[0].candidates[0].name='honey';catalog.pokemon[8].ingredientSlots[0].candidates[0].name='honey';
for(const targets of [[{name:'apple',weight:1}],[{name:'apple',weight:1},{name:'milk',weight:1}],[{name:'apple',weight:2},{name:'milk',weight:1}],[{name:'apple',weight:1},{name:'milk',weight:1},{name:'honey',weight:1}]]){
 const recommendation=ctx.whistleRecommendBalanced(box,catalog,options,targets);let best={score:-Infinity,energy:-Infinity};
 const score=r=>Math.min(...targets.map(t=>(r.foods.get(t.name)||0)/t.weight));
 function visit(start,ids){if(ids.length===5){if(ctx.normalizeTeam(ids,box).some(x=>!x))return;const r=ctx.whistleEstimate(ids,box,catalog,options),v=score(r);if(v>best.score||v===best.score&&r.berryEnergy>best.energy)best={score:v,energy:r.berryEnergy};return}for(let i=start;i<box.length;i++)visit(i+1,[...ids,box[i].id]);}visit(0,[]);
 assert.equal(score(recommendation.result),best.score);assert(Math.abs(recommendation.result.berryEnergy-best.energy)<1e-8);
}
const balancedStart=Date.now();const balanced=ctx.whistleRecommendBalanced(many,catalog,options,[{name:'apple',weight:1},{name:'milk',weight:1},{name:'honey',weight:1}]);assert.equal(balanced.ids.length,5);console.log(`Balanced: exact 1/2/3-food and 2:1 ratio optima with berry tie-break; 235 individuals in ${Date.now()-balancedStart}ms.`);
