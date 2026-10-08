const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('review.html','utf8'),page=fs.readFileSync('pokemon.html','utf8');
assert.equal(page,html);assert(fs.readFileSync('.github/workflows/build-review.yml','utf8').includes('cp index.html review.html pokemon.html public/'));
const script=html.match(/<script id="psg-pokemon-routing">([\s\S]*?)<\/script>/)[1];
const storage=new Map();let blocked=false;
class Node{constructor(){this.children=[];this.classList={add:()=>{}};this.value='';this.textContent=''}append(...x){this.children.push(...x)}replaceChildren(){this.children=[]}}
function setup(address,deferFrames=false){
 const listeners={},hosts={},classes=[],calls=[],assigned=[],frames=[];const location=new URL(address);location.assign=url=>assigned.push(url);
 const document={documentElement:{classList:{add:x=>classes.push(x),remove:x=>{const i=classes.indexOf(x);if(i>=0)classes.splice(i,1)}}},getElementById:id=>hosts[id]??=new Node(),createElement:()=>new Node()};
 const window={scrollY:850,addEventListener:(key,fn)=>listeners[key]=fn,scrollTo:(x,y)=>calls.push(['scroll',y]),PS:{state:{screen:'dex',history:['startPage'],filters:{types:new Set(['ほのお']),ingredients:new Set(['あまいミツ']),specs:new Set(['食材'])}},refreshAssetViews:()=>calls.push(['refresh']),go:(screen,push)=>{window.PS.state.screen=screen;window.PS_DEX_ROUTE?.syncScreen(screen);calls.push(['go',screen,push])}}};
 const sessionStorage={getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)},removeItem:key=>storage.delete(key)};
 vm.runInNewContext(script,{window,location,document,sessionStorage,URL,URLSearchParams,Date,Set,history:{state:null,replaceState:(state,title,url)=>{location.href=url;calls.push(['replace',url])}},requestAnimationFrame:fn=>deferFrames?frames.push(fn):fn()});
 return {window,route:window.PS_DEX_ROUTE,document,hosts,calls,assigned,listeners,classes,frames,location};
}
const app=setup('https://example.test/guide/review.html');app.document.getElementById('dexSearch').value='ほげ';app.route.capture('dex');
const saved=JSON.parse(storage.get('psg-dex-return-v1'));assert.equal(saved.search,'ほげ');assert.deepEqual(saved.types,['ほのお']);assert.equal(saved.scroll,850);
app.route.open('0909_default');assert.equal(app.assigned[0],'https://example.test/guide/pokemon.html?species=0909_default');
const detail=setup('https://example.test/guide/pokemon.html?species=0909_default&tab=sleep');assert(detail.window.PS_POKEMON_PAGE);assert.deepEqual(detail.classes,['psg-pokemon-page']);let opened;
detail.window.openPokemonDetail=(species,opts)=>{opened={species,opts};return true};detail.listeners.DOMContentLoaded();assert.equal(opened.species,'0909_default');assert.equal(opened.opts.local,true);assert.equal(opened.opts.tab,'sleep');
detail.route.returnToApp();assert.equal(detail.assigned[0],'https://example.test/guide/review.html?screen=dex&restore=dex');
const returned=setup(detail.assigned[0]);returned.listeners.DOMContentLoaded();assert.equal(returned.document.getElementById('dexSearch').value,'ほげ');assert.deepEqual([...returned.window.PS.state.filters.types],['ほのお']);assert.deepEqual([...returned.window.PS.state.filters.ingredients],['あまいミツ']);assert.deepEqual([...returned.window.PS.state.filters.specs],['食材']);assert(returned.calls.some(x=>x[0]==='go'&&x[1]==='dex'));assert(returned.calls.some(x=>x[0]==='scroll'&&x[1]===850));
const staged=setup(detail.assigned[0],true);assert(staged.classes.includes('psg-route-pending'));staged.listeners.DOMContentLoaded();assert(staged.classes.includes('psg-route-pending'));assert(staged.calls.some(x=>x[0]==='go'&&x[1]==='dex'));while(staged.frames.length)staged.frames.shift()();assert(!staged.classes.includes('psg-route-pending'));assert(staged.calls.some(x=>x[0]==='scroll'&&x[1]===850));assert(!app.classes.includes('psg-route-pending'));assert(!setup('https://example.test/guide/review.html?screen=invalid').classes.includes('psg-route-pending'));assert(html.includes('html.psg-route-pending main,html.psg-route-pending nav{visibility:hidden}'));
returned.listeners.pageshow({persisted:true});assert(returned.calls.filter(x=>x[0]==='scroll').length===2);
const direct=setup('https://example.test/guide/pokemon.html?species=0037_alola');direct.window.openPokemonDetail=()=>true;direct.listeners.DOMContentLoaded();assert.equal(direct.route.url('0038_alola','field'),'https://example.test/guide/pokemon.html?species=0038_alola&tab=field');
const invalid=setup('https://example.test/guide/pokemon.html?species=invalid');invalid.window.openPokemonDetail=()=>false;invalid.listeners.DOMContentLoaded();assert.equal(invalid.hosts.dexDetail.children[0].textContent,'対象のポケモンが見つかりません。');
blocked=true;const locked=setup('https://example.test/guide/review.html');assert.doesNotThrow(()=>locked.route.open('0001_default'));assert(locked.assigned.length===1);blocked=false;
// Execute the detail navigation renderer with lightweight view stubs, verifying
// that ordinary links navigate and local boot/refresh do not navigate again.
let selected,rendered=[];const w={PS_POKEMON_PAGE:true,PS:{state:{screen:'dexDetail'}},PS_DEX_ROUTE:{open:(...x)=>selected=x},addEventListener:()=>{},scrollTo:()=>{}};
const heading={get textContent(){return 'No.001 フシギダネ'},set textContent(value){throw Error('Navigation must not overwrite the rendered identity heading')}};
const doc={title:'',querySelector:s=>s.includes('h2')?heading:null,getElementById:id=>id==='dexPreviewNotice'?{}:null,addEventListener:()=>{}};
const ctx={window:w,document:doc,location:new URL('https://example.test/guide/pokemon.html?species=0001_default'),byNo:n=>n==='unknown'?null:{no:1,name:'フシギダネ',type:'くさ'},detailKey:()=> '0001_default',currentNo:1,currentSpeciesId:null,currentTab:'ability',detailOrigin:'dex',detailHistory:[],detailForward:[],setTheme:()=>{},show:()=>{},header:()=>{},renderStats:()=>{},renderFood:()=>{},renderSkill:()=>{},renderEvolution:()=>{},renderSleepStyles:()=>rendered.push('sleep'),renderPokemonFields:()=>{},switchTab:()=>{},updateDexStickyTop:()=>{},ability:{prepend:()=>{}},getComputedStyle:()=>({}),history:{},Number,parseFloat};
vm.runInNewContext(fs.readFileSync('templates/detail/07-navigation.html','utf8').replace(/\}\)\(\);\s*<\/script>\s*$/,''),ctx);
assert.equal(w.openPokemonDetail('0001_default'),true);assert.equal(selected[0],'0001_default');assert.equal(rendered.length,0);selected=null;
assert.equal(w.openPokemonDetail('0001_default',{local:true}),true);assert.equal(selected,null);assert.equal(rendered.length,1);assert.equal(doc.title,'フシギダネ｜ポケモン図鑑｜P Sleep Nexus');w.PSG_REFRESH_DEX_DETAIL();assert.equal(selected,null);assert.equal(rendered.length,2);assert.equal(w.openPokemonDetail('unknown'),false);
const list=fs.readFileSync('templates/core/06-lists.html','utf8');assert(list.includes('<a href="${window.PS_DEX_ROUTE.url(speciesKey(p))}"'));assert(list.includes("window.PS_DEX_ROUTE.capture('dex')"));
console.log('Individual detail URLs, real document navigation, native links, form/tab targets, list filter/scroll restoration, bfcache, blocked storage and invalid species passed');

// Reproduce returning from Dex, navigating elsewhere and then reloading.
const stale=setup('https://example.test/guide/review.html?screen=dex&restore=dex');stale.listeners.DOMContentLoaded();
for(const screen of ['fieldPage','home','startPage','accountPage','rankingPage','ingredientRankingPage']){
 stale.window.PS.go(screen,false);assert.equal(stale.location.searchParams.get('screen'),screen);assert.equal(stale.location.searchParams.has('restore'),false);
 const refreshed=setup(stale.location.href);refreshed.listeners.DOMContentLoaded();assert.equal(refreshed.window.PS.state.screen,screen);
}
const oldDetailURL=detail.location.href;detail.route.syncScreen('home');assert.equal(detail.location.href,oldDetailURL,'species URL stays independent');
stale.route.syncScreen('boxDetail');assert.equal(stale.location.searchParams.get('screen'),'box');
// Verify that the actual app navigation invokes synchronization.
const navSource=fs.readFileSync('templates/core/05-navigation-and-filters.html','utf8');
const goSource=navSource.slice(navSource.indexOf('function go('),navSource.indexOf("document.querySelectorAll('[data-screen]')"));
const navContext={state:{screen:'dex',history:[]},window:{PS_DEX_ROUTE:stale.route,scrollTo:()=>{}},screens:[],tabs:[],teamViewDirty:false,dexListDirty:false,boxListDirty:false,renderFieldControls:()=>{},renderDex:()=>{},renderBox:()=>{},renderTeam:()=>{},requestAnimationFrame:()=>{}};
vm.createContext(navContext);vm.runInContext(goSource,navContext);navContext.go('info');assert.equal(stale.location.searchParams.get('screen'),'info');
console.log('Current-page URL synchronization, reload after Dex return, information subpages and Box reload fallback passed');

const fieldRoute=setup('https://example.test/guide/review.html?screen=fieldDetail&field=cyan_ex');
fieldRoute.window.PS_FIELD_DETAIL={fieldId:'cyan_ex',open:id=>{fieldRoute.window.PS_FIELD_DETAIL.fieldId=id;fieldRoute.window.PS.go('fieldDetail');return true}};
fieldRoute.listeners.DOMContentLoaded();assert.equal(fieldRoute.window.PS.state.screen,'fieldDetail');assert.equal(fieldRoute.location.searchParams.get('field'),'cyan_ex');fieldRoute.route.capture();
const pokemonFromField=setup('https://example.test/guide/pokemon.html?species=0001_default');pokemonFromField.route.returnToApp();assert.equal(pokemonFromField.assigned[0],'https://example.test/guide/review.html?screen=fieldDetail&restore=dex&field=cyan_ex');
fieldRoute.window.PS.go('fieldPage');assert.equal(fieldRoute.location.searchParams.has('field'),false);
console.log('Field detail direct URL, reload target and return from Pokémon detail preserve browsed field');
