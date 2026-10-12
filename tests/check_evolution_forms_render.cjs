const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const catalog=JSON.parse(fs.readFileSync('review.html','utf8').match(/^window.PS_CATALOG=(.*);$/m)[1]);
const records=new Map(catalog.forms.species.map(p=>[p.speciesId,{...p,detailPreviewOnly:true}]));
const resolve=id=>records.get(String(id))||catalog.pokemon[Number(String(id).replace(/_default$/,''))];
const el={innerHTML:'',querySelectorAll:()=>[]},card={style:{}};
const c={V:catalog,byNo:resolve,detailEsc:String,iconForType:()=>'',document:{getElementById:id=>id==='detailEvolution'?el:card},window:{PS_FORMS:{records},PS_IMAGE_FILES:{items:{'こおりのいし':'ice','つながりのヒモ':'link','めざめいし':'dawn'}},PS_UI_ART:{icon:()=>'<img>'},PS_DEV_ASSETS:{image:()=>'<img>'}}};
vm.createContext(c);vm.runInContext(fs.readFileSync('templates/dex/07-evolution.html','utf8'),c);
for(const [origin,target,requirement] of [['0037_alola','0038_alola','こおりのいし'],['0194_paldea','0980_default','Lv.15'],...['small','medium','large','jumbo'].map(size=>[`0710_${size}`,`0711_${size}`,'つながりのヒモ'])]){
 for(const id of [origin,target]){
  c.renderEvolution(resolve(id));
  assert.equal(card.style.display,'');
  assert.deepEqual([...el.innerHTML.matchAll(/data-evo-species="([^"]+)"/g)].map(m=>m[1]),[origin,target],id);
  assert(el.innerHTML.includes(requirement),`${id}: condition displayed`);
  assert(el.innerHTML.includes('アメ×'));
 }
}
c.renderEvolution(resolve(475));assert(el.innerHTML.includes('♂\uFE0Eのみ'));assert(el.innerHTML.includes('psg-evo-gender'));
console.log('Regional and all size families render from both stages; items, level and gender conditions preserved');
// Check every stage against an independently built undirected family graph.
const all=[...Object.values(catalog.pokemon),...records.values()],key=p=>p.speciesId||`${String(p.no).padStart(4,'0')}_default`;
const graph=new Map(all.map(p=>[key(p),new Set()]));let edges=0;
for(const p of all){
 const regular=p.detailPreviewOnly?[]:(Array.isArray(p.evolution)?p.evolution:[p.evolution]).filter(e=>e?.toNo);
 for(const edge of [...regular,...(p.evolutionTransitions||[]).filter(e=>e.transitionEnabled)]){
  const target=resolve(edge.targetSpeciesId||edge.toNo);assert(target,`${key(p)}: missing target`);
  graph.get(key(p)).add(key(target));graph.get(key(target)).add(key(p));edges++;
 }
}
let connected=0;const families=new Set();
for(const p of all){
 const members=new Set([key(p)]),queue=[key(p)];
 for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i]))if(!members.has(next)){members.add(next);queue.push(next)}
 el.innerHTML='';el.textContent='';c.renderEvolution(p);
 if(members.size===1){assert.equal(card.style.display,p.evolutionStatus==='未確認'?'':'none');continue}
 const shown=[...el.innerHTML.matchAll(/data-evo-species="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(card.style.display,'',key(p));assert.deepEqual(shown.sort(),[...members].sort(),key(p));
 connected++;families.add([...members].sort().join(','));
}
const images=JSON.parse(fs.readFileSync('review.html','utf8').match(/^for\(const \[kind,entries\] of Object.entries\((.*)\)\)/m)[1]);
let portraits=0;for(const p of all.filter(p=>graph.get(key(p)).size)){
 const image=p.detailPreviewOnly?(images.pokemonFacesBySpecies?.[key(p)]||images.pokemonBySpecies?.[key(p)]||p.faceImage||p.image):images.pokemonFaces?.[p.no]||p.faceImage||images.pokemon?.[p.no]||p.image;
 assert(image,`${key(p)}: missing evolution portrait`);assert(fs.existsSync(image),`${key(p)}: portrait file absent`);portraits++;
}
console.log(`${all.length} records: ${families.size} families / ${edges} transitions / ${connected} connected stages / ${portraits} portraits verified`);
