const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'../templates',p),'utf8');
const storage=new Map(),nodes=new Map(),calls={box:0,team:0,detail:0,save:0,alerts:0};let fail=false;
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{open:false,value:'',textContent:'',setAttribute(k,v){this[k]=v}});return nodes.get(id)}};
const ctx=vm.createContext({document,state:{screen:'boxDetail',box:[{id:'one',level:10},{id:'two',level:20}],selected:{id:'one',level:10}},BOX_STORAGE_KEY:'box',MAX_POKEMON_LEVEL:70,lv:{},lvRange:{value:10},minus:{},plus:{},backupBoxFields:x=>x,pruneSavedTeams(){},window:{PS_UI_ART:{icon:(group,name)=>name}},alert(){calls.alerts++},localStorage:{setItem(k,v){if(fail)throw Error('quota');calls.save++;storage.set(k,v)}}});
ctx.syncLevel=()=>calls.detail++;
ctx.calls=calls;
const boxStorage=read('core/01-box-storage.html');
vm.runInContext(boxStorage.slice(boxStorage.indexOf('let boxListDirty'),boxStorage.indexOf('state.box=readBox();')),ctx);
// Stub rendering while exercising the unchanged production update path.
vm.runInContext('function renderBox(){calls.box++;boxListDirty=false}function renderTeam(){calls.team++;teamViewDirty=false}',ctx);
const view=read('box/03-view.html');vm.runInContext(view.slice(view.indexOf('function syncBoxFlags'),view.indexOf("document.getElementById('boxEditor').addEventListener")),ctx);
vm.runInContext(read('box/05-actions.html').split("document.getElementById('boxEditForm').onsubmit")[0],ctx);
vm.runInContext('boxListDirty=false;teamViewDirty=false',ctx);
nodes.get('boxFavorite').onclick();nodes.get('boxTraining').onclick();
assert.equal(calls.detail,0);assert.equal(calls.box,0);assert.equal(calls.team,0);
assert.equal(nodes.get('boxFavorite')['aria-pressed'],'true');assert.equal(nodes.get('boxTraining')['aria-pressed'],'true');
assert.equal(vm.runInContext('teamViewDirty',ctx),false,'flags do not dirty forecasts');
const before=calls.save;
for(let level=11;level<=60;level++){ctx.lvRange.value=level;ctx.lvRange.oninput()}
assert.equal(ctx.lv.textContent,'Lv.60');assert.equal(ctx.state.selected.level,10);assert.equal(calls.save,before,'drag is display-only');
ctx.lvRange.onpointerup();ctx.lvRange.onchange();ctx.lvRange.onblur();
assert.equal(ctx.state.selected.level,60);assert.equal(calls.save,before+1,'one save after release');assert.equal(calls.detail,1);assert.equal(calls.team,0);
assert.equal(vm.runInContext('teamViewDirty',ctx),true);
// Execute the production navigation function with harmless DOM/window stubs.
Object.assign(ctx,{screens:[],tabs:[],window:{scrollTo(){}},requestAnimationFrame(){},updateHomeStickyHeight(){}});ctx.state.history=[];
const nav=read('core/05-navigation-and-filters.html');vm.runInContext(nav.slice(nav.indexOf('function go('),nav.indexOf("document.querySelectorAll('[data-screen]')")),ctx);
vm.runInContext("go('home')",ctx);assert.equal(calls.team,1);vm.runInContext("go('home')",ctx);assert.equal(calls.team,1,'clean team is not recomputed');
vm.runInContext("go('box')",ctx);assert.equal(calls.box,1,'dirty list rebuilt on entry');
ctx.state.screen='boxDetail';fail=true;ctx.lvRange.value=61;ctx.lvRange.onchange();
assert.equal(ctx.state.selected.level,60);assert.equal(ctx.lvRange.value,60);assert.equal(calls.alerts,1,'failed save restores displayed level');
console.log('Box updates: flags skip forecasts, drag previews only, release saves once, hidden screens defer refresh, navigation flushes dirty views, storage failure preserves level.');
