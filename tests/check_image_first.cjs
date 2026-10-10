const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const speciesScript=read('templates/01-species-catalog.html').replace(/<\/?script[^>]*>/g,'');
const builtScripts=[...read('review.html').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const real={window:{},console};vm.createContext(real);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','// Resolve form identity'])vm.runInContext(builtScripts.find(s=>s.includes(marker)),real);
// Explicitly approved existing species remain eligible even when a rate is unknown.
for(const raw of real.window.PS_CATALOG.forms.species.filter(p=>p.boxEligible===true)){
 assert.equal(real.window.PS_FORMS.resolve(raw.speciesId).boxEligible,true,raw.speciesId);
 assert(real.window.PS_SPECIES_CATALOG.box().some(p=>p.speciesId===raw.speciesId),raw.speciesId);
}
// Only identity is required at import; abilities, groups and artwork may arrive later.
for(const image of [null,'assets/pokemon/preview.webp']){
 const c={window:{PS_CATALOG:{pokemon:{},forms:{species:[{no:9999,speciesId:'9999_default',name:'画像先行',image}],independentDexEntries:['9999_default']}},PS_IMAGE_FILES:{berries:{}}}};
 vm.createContext(c);vm.runInContext(speciesScript,c);
 const p=c.window.PS_FORMS.resolve('9999_default');
 assert.equal(p.image,image);assert.equal(p.dataStatus,'preview_pending_abilities');assert.equal(p.boxEligible,false);
 assert.equal(p.sleepStyles.length,0);assert.equal(p.ingredients.length,0);assert.equal(c.window.PS_FORMS.dexEntries.length,1);assert.equal(c.window.PS_SPECIES_CATALOG.box().length,0);
 assert.equal(c.window.PS_FORMS.groupFor('9999_default'),undefined);
}
class Node{
 constructor(){this.attributes={};this.children=[];this.textContent='';this.innerHTML='';this.style={setProperty(){}};this.dataset={};this.classList={add(){},remove(){},toggle(){}}}
 append(...nodes){this.children.push(...nodes)} appendChild(node){this.append(node)} prepend(node){this.children.unshift(node)}
 replaceChildren(...nodes){this.children=nodes;this.textContent='';this.innerHTML=''} setAttribute(key,value){this.attributes[key]=value} remove(){} insertAdjacentHTML(_,html){this.innerHTML+=html}
}
const markup=read('templates/09-dex-detail.html'),nodes=new Map([...markup.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Node()]));
const sleep=new Node(),field=new Node(),icon=new Node(),count=new Node(),tab=new Node(),summary=new Node(),skillCopy=new Node();tab.querySelector=()=>count;
summary.querySelector=selector=>selector==='.psg-skill-copy'?skillCopy:null;
skillCopy.querySelector=()=>null;
const c={document:{getElementById:id=>nodes.get(id)||null,querySelector:selector=>selector.includes('psg-skill-summary')?summary:icon,createElement:()=>new Node()},localStorage:{getItem:()=>null},window:{PS_DEV_ASSETS:{path:()=>'',title:()=>''},PS_UI_ART:{},PS_IMAGE_LOADING:{set:(img,src)=>{img.src=src}}},V:{ingredientVisual:()=>null,pendingSleepArtwork:{}},sleep,field,tabs:{querySelector:()=>tab},detailEsc:String,skillOf:m=>m.skill};
vm.createContext(c);
for(const file of ['04-food','05-skill','06-evolution','02-sleep-and-fields'])vm.runInContext(file==='05-skill'?require('./read_detail_skill.cjs')():read(`templates/detail/${file}.html`),c);
// Open a known skill, then incomplete variants: stale effects and levels must clear.
for(const skill of [{name:'名前だけ'},{name:'レベル途中',levels:{1:null,2:null,3:{description:'効果未確認'}}},null,undefined]){
 c.m={no:9999,speciesId:'9999_default',name:'画像先行',detailPreviewOnly:true,dataStatus:'preview_pending_abilities',skill};
 nodes.get('skillLevels').innerHTML='old effect';
 vm.runInContext('renderFood(m);renderSkill(m);renderEvolution(m);renderSleepStyles(m);renderPokemonFields(m)',c);
 assert(!nodes.get('skillLevels').innerHTML.includes('old effect'));
 assert.equal(summary.attributes['aria-disabled'],String(!Object.entries(skill?.levels||{}).some(([lv,x])=>Number(lv)>1&&x)));
 assert.equal(summary.attributes['aria-expanded'],'false');
 assert(nodes.get('detailFoods').innerHTML.includes('食材データ未確認'));
 assert(field.children.some(n=>n.textContent.includes('確認待ち')));
 if(!skill){assert.equal(nodes.get('detailSkill').textContent,'スキル未確認');assert.equal(summary.attributes['aria-disabled'],'true');assert.equal(summary.attributes['aria-expanded'],'false');assert.equal(summary.tabIndex,-1)}
}
c.V.pendingSleepArtwork['9999_default']=[{image:'sleep.webp'}];
vm.runInContext('renderSleepStyles(m)',c);
assert.equal(sleep.children.at(-1).children.length,1);
assert.equal(sleep.children.at(-1).children[0].children[0].children[0].src,'sleep.webp');
console.log('Image-first imports: omitted abilities/collections/artwork, partial skills, tab renderers and pending sleep gallery verified');
