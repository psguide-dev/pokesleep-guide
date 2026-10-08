const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('templates/core/08-fields.html','utf8').split('let favoriteBerrySlot=')[1].split('function renderFieldGallery')[0];
class Node{constructor(){this.children=[];this.attrs={};this.hidden=false}append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=v}}
function setup(profile={selectedFieldId:'greengrass',weekly:{}}){
 const nodes={},ctx={fieldProfile:profile,currentFieldWeek:()=> '2026-10-05',knownBerryNames:new Set(['A','B','C','D']),window:{PS_CATALOG:{fields:{greengrass:{favoriteMode:'weekly_random',mode:'normal'},greengrass_ex:{favoriteMode:'weekly_random',mode:'expert'},cyan_ex:{favoriteMode:'weekly_random',mode:'expert'},cyan:{favoriteMode:'fixed',mode:'normal'}},pokemon:{1:{berry:'A',type:'くさ'},2:{berry:'B',type:'みず'},3:{berry:'C',type:'ほのお'},4:{berry:'D',type:'でんき'}}}},document:{getElementById:id=>nodes[id]??=new Node(),createElement:()=>new Node()},berryIcon:name=>name?{image:name}:null,activeFieldBerries:()=>{const p=ctx.fieldProfile;return p.weekly[p.selectedFieldId]?.weekKey==='2026-10-05'?p.weekly[p.selectedFieldId].berries:[]},saveFieldProfile:()=>ctx.renderFavoriteBerryPicker()};
 vm.createContext(ctx);vm.runInContext('let favoriteBerrySlot='+source,ctx);ctx.renderFavoriteBerryPicker();return {ctx,nodes};
}
const {ctx,nodes}=setup();assert.equal(nodes.fieldBerryPicker.hidden,false);assert.equal(nodes.fieldBerrySelects.hidden,true);
ctx.chooseFavoriteBerry('A');ctx.chooseFavoriteBerry('B');ctx.chooseFavoriteBerry('C');
assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','B','C']));assert(nodes.fieldBerryPickerStatus.textContent.includes('3種類を選択済み'));
nodes.fieldBerrySlots.children[1].onclick();ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']));
ctx.chooseFavoriteBerry('A');assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']),'selected berry chooses existing slot without duplicates');
ctx.chooseFavoriteBerry('unknown');assert.equal(ctx.fieldProfile.weekly.greengrass.berries[0],'A');
const reload=setup(JSON.parse(JSON.stringify(ctx.fieldProfile)));assert.equal(reload.nodes.fieldBerrySlots.children[1].attrs['aria-label'],'②：D。この枠を変更');
for(const id of ['greengrass_ex','cyan_ex']){ctx.fieldProfile.selectedFieldId=id;ctx.renderFavoriteBerryPicker();assert(nodes.fieldBerrySlots.children[0].attrs['aria-label'].includes('メイン'));ctx.chooseFavoriteBerry('B');ctx.chooseFavoriteBerry('A');ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(ctx.fieldProfile.weekly[id].berries),JSON.stringify(['B','A','D']));}
assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']),'per-field values retained');
ctx.fieldProfile.selectedFieldId='cyan';ctx.renderFavoriteBerryPicker();assert.equal(nodes.fieldBerryPicker.hidden,true);assert.equal(nodes.fieldBerrySelects.hidden,false);
const stale=setup({selectedFieldId:'greengrass_ex',weekly:{greengrass_ex:{weekKey:'2026-09-28',berries:['A','B','C']}}});stale.ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(stale.ctx.fieldProfile.weekly.greengrass_ex.berries),JSON.stringify(['D','','']));
const html=fs.readFileSync('review.html','utf8');assert(html.includes('id="fieldBerryPicker"'));assert(html.includes('#fieldBerrySelects[hidden]{display:none}'));
console.log('Berry picker: ordered selection, replacement, no duplicates, per-field records, reload, weekly rollover, EX main/sub labels and fixed-field controls passed');
