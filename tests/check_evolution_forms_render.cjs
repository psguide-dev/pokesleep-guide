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
