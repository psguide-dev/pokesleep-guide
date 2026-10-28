const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('assets/rankings/three-modes-lv80.json','utf8')),seen=new Set();
assert.equal(data.level,80);assert.equal(data.subskillSlots,5);assert.equal(data.tables.length,552);
for(const t of data.tables){const key=JSON.stringify([t.kind,t.group,t.mode,t.camp]);assert(!seen.has(key));seen.add(key);assert(['ideal','median','neutral'].includes(t.mode));assert.equal(typeof t.camp,'boolean');assert(t.rows.length<=10);assert(Array.isArray(t.pending));for(const [i,r] of t.rows.entries()){assert(Number.isFinite(r.value)&&r.value>=0);if(i)assert(t.rows[i-1].value>=r.value);assert(!('foodRate'in r)&&!('skillRate'in r));assert(r.speciesId!=='0200_default');if(t.kind==='food'){assert(Number.isFinite(r.speciesIdealPercent));assert(Number.isFinite(r.patternIdealPercent));assert(r.speciesIdealPercent<=100.000001&&r.patternIdealPercent<=100.000001);if(t.mode==='ideal')assert(Math.abs(r.patternIdealPercent-100)<1e-6)}assert(!r.provisional);assert([0,5].includes(r.subskills.length))}}
class N{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.value='';this.textContent='';this.classList={contains:()=>true}}
 append(n){this.children.push(n);if(this.tagName==='SELECT'&&!this.value)this.value=n.value}
 replaceChildren(){this.children=[]}setAttribute(){}
 querySelector(s){return this.basis}
}
const nodes={},node=id=>nodes[id]??=new N('div'),events={},pages=['typeRankingPage','skillEnergyRankingPage','sameSkillRankingPage','ingredientRankingPage'];let camp=true,fetches=0;
for(const id of pages)node(id).basis={value:'ideal'};
const ctx={window:{PS_PAGE_RENDERERS:{},PS:{getGoodCamp:()=>camp},PS_NUMBERS:{display:String},addEventListener:(id,fn)=>events[id]=fn},document:{getElementById:node,createElement:t=>new N(t)},fetch:async()=>{fetches++;return {ok:true,json:async()=>data}}};vm.createContext(ctx);
const assetCtx={window:{},document:{addEventListener(){}}};vm.createContext(assetCtx);const scripts=[...fs.readFileSync('review.html','utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG='])vm.runInContext(scripts.find(s=>s.includes(marker)),assetCtx);
ctx.window.PS_IMAGE_FILES=assetCtx.window.PS_IMAGE_FILES;ctx.window.PS_CATALOG=assetCtx.window.PS_CATALOG;
vm.runInContext(fs.readFileSync('templates/rankings/06-three-modes.html','utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const walk=n=>[n,...n.children.flatMap(walk)];
(async()=>{
 let renders=0;
 for(const [id,kind,host]of [['typeRankingPage','berry','typeRankingContent'],['skillEnergyRankingPage','total','skillEnergyRankingContent'],['sameSkillRankingPage','skill','sameSkillRankingContent'],['ingredientRankingPage','food','ingredientRankingContent']]){
  for(const c of [true,false])for(const mode of ['ideal','median','neutral']){
   camp=c;node(id).basis.value=mode;await ctx.window.PS_PAGE_RENDERERS[id]();const select=walk(node(host)).find(n=>n.tagName==='SELECT');assert.equal(select.children.length,data.groups[kind].length);
   for(const group of data.groups[kind]){select.value=group;select.onchange();const body=walk(node(host)).find(n=>n.tagName==='TBODY'),table=data.tables.find(t=>t.kind===kind&&t.group===group&&t.mode===mode&&t.camp===c);assert.equal(body.children.length,table.rows.length);if(body.children.length)assert.equal(body.children[0].children[3].textContent,String(table.rows[0].value));for(const row of body.children){assert.equal(row.children.length,4);assert(!walk(row).some(n=>n.tagName==='DETAILS'));assert(walk(row.children[1]).some(n=>n.tagName==='BUTTON'));assert(walk(row.children[2]).some(n=>n.className==='psg-ranking-foods'));assert(walk(row.children[2]).some(n=>n.className==='psg-ranking-subskills'));}renders++}
  }
 }
 const images=walk(node('ingredientRankingContent')).filter(n=>n.tagName==='IMG');assert(images.length);for(const img of images){assert(img.alt);assert(fs.existsSync(img.src),img.src)}
 assert.equal(renders,552);assert.equal(fetches,1);
 // Switching basis/camp while loading discards obsolete render completion.
 camp=true;node('typeRankingPage').basis.value='ideal';const stale=ctx.window.PS_PAGE_RENDERERS.typeRankingPage();camp=false;node('typeRankingPage').basis.value='median';const current=ctx.window.PS_PAGE_RENDERERS.typeRankingPage();await Promise.all([stale,current]);assert(walk(node('typeRankingContent')).some(n=>String(n.textContent).includes('中央値')));
 console.log('All 552 ranking views render the matching mode, camp and group; partial lists, bounded rows, confirmed rates, five-slot builds and stale-render isolation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
