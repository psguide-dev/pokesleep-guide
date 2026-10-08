const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('templates/core/08-fields.html','utf8').split('let favoriteBerrySlot=')[1].split('function renderFieldGallery')[0];
class Node{constructor(){this.children=[];this.attrs={};this.hidden=false}append(...nodes){this.children.push(...nodes)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=v}}
function setup(profile={selectedFieldId:'greengrass',weekly:{}}){
 const nodes={},ctx={fieldProfile:profile,currentFieldWeek:()=> '2026-10-05',knownBerryNames:new Set(['A','B','C','D']),window:{PS_CATALOG:{fields:{greengrass:{favoriteMode:'weekly_random',mode:'normal'},greengrass_ex:{favoriteMode:'weekly_random',mode:'expert'},cyan_ex:{favoriteMode:'weekly_random',mode:'expert'},cyan:{favoriteMode:'fixed',mode:'normal'}},pokemon:{1:{berry:'A',type:'くさ'},2:{berry:'B',type:'みず'},3:{berry:'C',type:'ほのお'},4:{berry:'D',type:'でんき'}}}},document:{getElementById:id=>nodes[id]??=new Node(),createElement:()=>new Node()},berryIcon:name=>name?{image:name}:null,activeFieldBerries:()=>{const p=ctx.fieldProfile;return p.weekly[p.selectedFieldId]?.weekKey==='2026-10-05'?p.weekly[p.selectedFieldId].berries:[]},saveFieldProfile:()=>ctx.renderFavoriteBerryPicker()};
 vm.createContext(ctx);vm.runInContext('let favoriteBerrySlot='+source,ctx);ctx.renderFavoriteBerryPicker();return {ctx,nodes};
}
const {ctx,nodes}=setup();assert.equal(nodes.fieldBerryPicker.hidden,false);assert.equal(nodes.fieldBerrySelects.hidden,true);
ctx.chooseFavoriteBerry('A');ctx.chooseFavoriteBerry('B');ctx.chooseFavoriteBerry('C');
assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','B','C']));
nodes.fieldBerrySlots.children[1].onclick();ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']));
ctx.chooseFavoriteBerry('A');assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['','D','C']),'second tap clears only its slot');ctx.chooseFavoriteBerry('A');assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']),'third tap selects the empty slot');
ctx.chooseFavoriteBerry('unknown');assert.equal(ctx.fieldProfile.weekly.greengrass.berries[0],'A');
const reload=setup(JSON.parse(JSON.stringify(ctx.fieldProfile)));assert.equal(reload.nodes.fieldBerrySlots.children[1].attrs['aria-label'],'②：D。この枠を変更');
for(const id of ['greengrass_ex','cyan_ex']){ctx.fieldProfile.selectedFieldId=id;ctx.renderFavoriteBerryPicker();assert(nodes.fieldBerrySlots.children[0].attrs['aria-label'].includes('メイン'));ctx.chooseFavoriteBerry('B');ctx.chooseFavoriteBerry('A');ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(ctx.fieldProfile.weekly[id].berries),JSON.stringify(['B','A','D']));}
assert.equal(JSON.stringify(ctx.fieldProfile.weekly.greengrass.berries),JSON.stringify(['A','D','C']),'per-field values retained');
ctx.fieldProfile.selectedFieldId='cyan';ctx.renderFavoriteBerryPicker();assert.equal(nodes.fieldBerryPicker.hidden,true);assert.equal(nodes.fieldBerrySelects.hidden,false);
const stale=setup({selectedFieldId:'greengrass_ex',weekly:{greengrass_ex:{weekKey:'2026-09-28',berries:['A','B','C']}}});stale.ctx.chooseFavoriteBerry('D');assert.equal(JSON.stringify(stale.ctx.fieldProfile.weekly.greengrass_ex.berries),JSON.stringify(['D','','']));
const html=fs.readFileSync('review.html','utf8');assert(html.includes('id="fieldBerryPicker"'));assert(html.includes('#fieldBerrySelects[hidden]{display:none}'));
console.log('Berry picker: ordered selection, replacement, no duplicates, per-field records, reload, weekly rollover, EX main/sub labels and fixed-field controls passed');

// Execute the real save path: hidden team calculations are deferred and the
// lightweight refresh is requested. Storage errors restore the saved profile.
const profileSource=fs.readFileSync('templates/core/03-profiles.html','utf8');
const saver=profileSource.slice(profileSource.indexOf('function saveFieldProfile('));
let fail=false,refreshes=[],calculations=0,alerts=0;
const perf={fieldProfile:{selectedFieldId:'greengrass',weekly:{}},FIELD_STORAGE_KEY:'fields',state:{screen:'fieldPage'},teamViewDirty:false,localStorage:{setItem:()=>{if(fail)throw Error('quota')}},renderFieldControls:opts=>refreshes.push(opts.berryOnly),renderTeamDay:()=>calculations++,renderTeamFood:()=>calculations++,readFieldProfile:()=>({selectedFieldId:'cyan',weekly:{}}),alert:()=>alerts++};
vm.createContext(perf);vm.runInContext(saver,perf);assert.equal(perf.saveFieldProfile({berryOnly:true}),true);assert.equal(calculations,0);assert.equal(perf.teamViewDirty,true);assert.equal(refreshes[0],true);
perf.state.screen='home';perf.saveFieldProfile({berryOnly:true});assert.equal(calculations,2);
fail=true;perf.state.screen='fieldPage';assert.equal(perf.saveFieldProfile({berryOnly:true}),false);assert.equal(perf.fieldProfile.selectedFieldId,'cyan');assert.equal(calculations,2);assert.equal(alerts,1);
assert(html.includes('.psg-berry-options{display:grid;grid-template-columns:repeat(5,'));
console.log('Toggle on/off and deferred hidden-team calculation with storage rollback passed');
const fieldSource=fs.readFileSync('templates/core/08-fields.html','utf8');const controlSource=fieldSource.slice(fieldSource.indexOf('function renderFieldControls('),fieldSource.indexOf('function renderFieldEncounters('));
let heavy=0;const controlNodes={};const controls={state:{screen:'fieldPage'},fieldProfile:{selectedFieldId:'greengrass',weekly:{},areaBonuses:{}},window:{PS_CATALOG:{fields:{greengrass:{favoriteMode:'weekly_random'}}},PS_RENDER_FIELD_RANKING:()=>heavy++},document:{getElementById:id=>controlNodes[id]??=new Node(),createElement:()=>new Node(),createTextNode:x=>x},fieldSelect:{},homeFieldSelect:{},homeMealSelect:{},areaBonusInput:{},berryChoices:[{},{},{}],syncExEffectControls:()=>{},activeBerryZones:()=>({}),renderFieldSpawn:()=>heavy++,renderFieldGallery:()=>heavy++,renderFieldEncounters:()=>heavy++,activeMealCategory:()=>'',activeFieldBerries:()=>['A','B','C'],renderFavoriteBerryPicker:()=>{},currentFieldWeek:()=> '2026-10-05',berryIcon:()=>null};
vm.createContext(controls);vm.runInContext(controlSource,controls);controls.renderFieldControls({berryOnly:true});assert.equal(heavy,0);controls.renderFieldControls();assert.equal(heavy,4);
console.log('Berry-only refresh skips spawn/gallery/encounter/ranking work; full field refresh retains it');

assert(!html.includes('id="fieldWeekLabel"'));assert(!html.includes('id="fieldBerryPickerStatus"'));
assert(html.includes('<details id="fieldBerryDetails"'));assert(html.includes('class="psg-field-percent"><label for="fieldAreaBonus">FB</label>'));
assert.equal(nodes.fieldBerrySlots.children[0].children[1].className,'psg-berry-slot-art');
assert(html.includes('.psg-berry-slot{box-sizing:border-box;height:88px;min-height:88px;border-width:2px}'));
// The static details container survives all selection redraws and stays closed.
const detailNode=nodes.fieldBerryDetails;detailNode.open=false;ctx.fieldProfile.selectedFieldId='greengrass';ctx.renderFavoriteBerryPicker();ctx.chooseFavoriteBerry('B');assert.equal(detailNode.open,false);
nodes.fieldBerrySlots.children[0].onclick();assert.equal(detailNode.open,true);
console.log('Compact FB, removed helper text, constant slot image space and collapsible list state passed');
