const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('templates/core/08-fields.html','utf8');
class Node{constructor(){this.children=[];this.attrs={};this.dataset={};this.value=''}append(...x){this.children.push(...x)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=v}}
const nodes={},calls=[],profile={selectedFieldId:'cyan',weekly:{cyan:{berries:['a','b','c']}},areaBonuses:{cyan:50},berryZone:{values:{a:3}}};
const fields={cyan:{name:'シアンの砂浜',mode:'normal',encounters:[{sleepStyleId:'1_01'},{sleepStyleId:'1_02'}]},greengrass_ex:{name:'ワカクサ本島 EX',mode:'expert',encounters:[{sleepStyleId:'1_01'},{sleepStyleId:'1_01'},{sleepStyleId:'2_01'}]}};
const context={fieldProfile:profile,fieldOrder:Object.keys(fields),location:new URL('https://example.test/review.html'),URL,document:{createElement:()=>new Node(),getElementById:id=>nodes[id]??=new Node()},berryIcon:()=>null,currentFieldWeek:()=>'2026-10-05',saveFieldProfile:()=>true,readSleepBackup:()=>({'1_01':true}),renderFieldSpawn:()=>calls.push(['spawn',context.window.PS_FIELD_DETAIL.fieldId]),renderFieldEncounters:field=>calls.push(['encounters',field.name]),window:{PS_CATALOG:{fields},PS_IMAGE_FILES:{fields:{cyan:'cyan.webp',greengrass_ex:'ex.webp'}},PS_RENDER_FIELD_RANKING:id=>calls.push(['rank',id]),PS:{go:id=>{calls.push(['go',id]);context.window.PS_PAGE_RENDERERS[id]?.()}}}};
vm.createContext(context);
const start=core.indexOf('let fieldDetailId='),end=core.indexOf('function renderFieldEncounters(');vm.runInContext(core.slice(start,end),context);
const before=JSON.stringify(profile);context.window.PS_FIELD_DETAIL.open('greengrass_ex');assert.equal(JSON.stringify(profile),before);assert.equal(nodes.fieldDetailName.textContent,'ワカクサ本島 EX');assert.equal(nodes.fieldDetailSleepSummary.textContent,'寝顔 1 / 2');assert(calls.some(x=>x[0]==='spawn'&&x[1]==='greengrass_ex'));assert(calls.some(x=>x[0]==='rank'&&x[1]==='greengrass_ex'));
assert.equal(context.window.PS_FIELD_DETAIL.open('unknown'),false);assert.equal(JSON.stringify(profile),before);
vm.runInContext(core.slice(core.indexOf('function renderFieldGallery('),core.indexOf('function renderFieldControls(')),context);context.renderFieldGallery();
const link=nodes.fieldGallery.children.find(x=>x.dataset.fieldId==='cyan');assert.equal(link.href,'https://example.test/review.html?screen=fieldDetail&field=cyan');let prevented=false;link.onclick({preventDefault:()=>prevented=true});assert(prevented);assert.equal(context.window.PS_FIELD_DETAIL.fieldId,'cyan');assert.equal(JSON.stringify(profile),before);
const html=fs.readFileSync('templates/08-fields.html','utf8'),parts=html.split('<section id="fieldDetail"');assert.equal(parts.length,2);assert(!parts[0].includes('id="fieldRankFilter"'));assert(!parts[0].includes('id="fieldEncounterList"'));assert(!parts[0].includes('id="fieldSpawnTable"'));for(const id of ['fieldRankFilter','fieldEncounterList','fieldSpawnTable','fieldRankingContent'])assert(parts[1].includes('id="'+id+'"'));
console.log('Field detail links, independent browsing, unchanged weekly berries/FB/zone, deduplicated sleep counts and moved rank/spawn/sleep content passed');

assert.equal(nodes.fieldDetailBonus.value,'50');context.window.PS_FIELD_DETAIL.open('greengrass_ex');context.window.PS_FIELD_DETAIL.setBonus('10');assert.equal(profile.areaBonuses.greengrass_ex,10);assert.equal(profile.areaBonuses.cyan,50);assert.equal(profile.selectedFieldId,'cyan');assert.equal(nodes.fieldDetailBonus.value,'10');
context.window.PS_FIELD_DETAIL.open('cyan');assert.equal(nodes.fieldDetailBonus.value,'50');assert.equal(context.window.PS_FIELD_DETAIL.setBonus(''),false);assert.equal(profile.areaBonuses.cyan,50);context.window.PS_FIELD_DETAIL.setBonus('250');assert.equal(profile.areaBonuses.cyan,200);
assert(html.includes('id="fieldDetailName"'));assert(html.includes('id="fieldDetailBonus"'));const css=fs.readFileSync('styles/07-current-ui.css','utf8');assert(css.includes('.psg-field-detail-overview{display:grid;grid-template-columns:50% 50%'));assert(css.includes('#fieldDetailArt{min-width:0;height:100%'));assert(css.includes('object-fit:contain'));assert(html.indexOf('id="fieldDetailSleepSummary"')<html.indexOf('id="fieldPanel-rank"'));assert(html.indexOf('id="fieldDetailBonus"')<html.indexOf('class="psg-field-detail-overview"'));
console.log('Field detail dex-sized identity layout and independent FB/count passed');

fields.cyan.favoriteBerries=['fixed-a','fixed-b','fixed-c'];context.window.PS_FIELD_DETAIL.open('cyan');
assert.equal(nodes.fieldDetailBerries.children[0].children[0].textContent,'fixed-a');
profile.weekly.greengrass_ex={weekKey:'2026-10-05',berries:['weekly-a','weekly-b','weekly-c']};context.window.PS_FIELD_DETAIL.open('greengrass_ex');
assert.equal(nodes.fieldDetailBerries.children[0].children[0].textContent,'weekly-a');
profile.weekly.greengrass_ex.weekKey='old';context.window.PS_FIELD_DETAIL.open('greengrass_ex');assert.equal(nodes.fieldDetailBerries.children[0].children[0].textContent,'未設定');
assert.equal(profile.selectedFieldId,'cyan');
console.log('Viewed-field fixed/weekly/stale berry display, unchanged selected field and relocated FB/sleep count passed');
