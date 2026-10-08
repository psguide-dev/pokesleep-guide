const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('review.html','utf8'),page=fs.readFileSync('pokemon.html','utf8');
assert.equal(page,html);assert(fs.readFileSync('.github/workflows/build-review.yml','utf8').includes('cp index.html review.html pokemon.html public/'));
const script=html.match(/<script id="psg-pokemon-routing">([\s\S]*?)<\/script>/)[1];
const storage=new Map();let blocked=false;
class Node{constructor(){this.children=[];this.classList={add:()=>{}};this.value='';this.textContent=''}append(...x){this.children.push(...x)}replaceChildren(){this.children=[]}}
function setup(address){
 const listeners={},hosts={},classes=[],calls=[],assigned=[];const location=new URL(address);location.assign=url=>assigned.push(url);
 const document={documentElement:{classList:{add:x=>classes.push(x)}},getElementById:id=>hosts[id]??=new Node(),createElement:()=>new Node()};
 const window={scrollY:850,addEventListener:(key,fn)=>listeners[key]=fn,scrollTo:(x,y)=>calls.push(['scroll',y]),PS:{state:{screen:'dex',history:['startPage'],filters:{types:new Set(['ほのお']),ingredients:new Set(['あまいミツ']),specs:new Set(['食材'])}},refreshAssetViews:()=>calls.push(['refresh']),go:(screen,push)=>{window.PS.state.screen=screen;calls.push(['go',screen,push])}}};
 const sessionStorage={getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)},removeItem:key=>storage.delete(key)};
 vm.runInNewContext(script,{window,location,document,sessionStorage,URL,URLSearchParams,Date,Set,requestAnimationFrame:fn=>fn()});
 return {window,route:window.PS_DEX_ROUTE,document,hosts,calls,assigned,listeners,classes};
}
const app=setup('https://example.test/guide/review.html');app.document.getElementById('dexSearch').value='ほげ';app.route.capture('dex');
const saved=JSON.parse(storage.get('psg-dex-return-v1'));assert.equal(saved.search,'ほげ');assert.deepEqual(saved.types,['ほのお']);assert.equal(saved.scroll,850);
app.route.open('0909_default');assert.equal(app.assigned[0],'https://example.test/guide/pokemon.html?species=0909_default');
const detail=setup('https://example.test/guide/pokemon.html?species=0909_default&tab=sleep');assert(detail.window.PS_POKEMON_PAGE);assert.deepEqual(detail.classes,['psg-pokemon-page']);let opened;
detail.window.openPokemonDetail=(species,opts)=>{opened={species,opts};return true};detail.listeners.DOMContentLoaded();assert.equal(opened.species,'0909_default');assert.equal(opened.opts.local,true);assert.equal(opened.opts.tab,'sleep');
detail.route.returnToApp();assert.equal(detail.assigned[0],'https://example.test/guide/review.html?screen=dex&restore=dex');
const returned=setup(detail.assigned[0]);returned.listeners.DOMContentLoaded();assert.equal(returned.document.getElementById('dexSearch').value,'ほげ');assert.deepEqual([...returned.window.PS.state.filters.types],['ほのお']);assert.deepEqual([...returned.window.PS.state.filters.ingredients],['あまいミツ']);assert.deepEqual([...returned.window.PS.state.filters.specs],['食材']);assert(returned.calls.some(x=>x[0]==='go'&&x[1]==='dex'));assert(returned.calls.some(x=>x[0]==='scroll'&&x[1]===850));
returned.listeners.pageshow({persisted:true});assert(returned.calls.filter(x=>x[0]==='scroll').length===2);
const direct=setup('https://example.test/guide/pokemon.html?species=0037_alola');direct.window.openPokemonDetail=()=>true;direct.listeners.DOMContentLoaded();assert.equal(direct.route.url('0038_alola','field'),'https://example.test/guide/pokemon.html?species=0038_alola&tab=field');
const invalid=setup('https://example.test/guide/pokemon.html?species=invalid');invalid.window.openPokemonDetail=()=>false;invalid.listeners.DOMContentLoaded();assert.equal(invalid.hosts.dexDetail.children[0].textContent,'対象のポケモンが見つかりません。');
blocked=true;const locked=setup('https://example.test/guide/review.html');assert.doesNotThrow(()=>locked.route.open('0001_default'));assert(locked.assigned.length===1);blocked=false;
// Execute the detail navigation renderer with lightweight view stubs, verifying
// that ordinary links navigate and local boot/refresh do not navigate again.
let selected,rendered=[];const w={PS_POKEMON_PAGE:true,PS:{state:{screen:'dexDetail'}},PS_DEX_ROUTE:{open:(...x)=>selected=x},addEventListener:()=>{},scrollTo:()=>{}};
const doc={title:'',querySelector:s=>s.includes('h2')?{textContent:''}:null,getElementById:id=>id==='dexPreviewNotice'?{}:null,addEventListener:()=>{}};
const ctx={window:w,document:doc,location:new URL('https://example.test/guide/pokemon.html?species=0001_default'),byNo:n=>n==='unknown'?null:{no:1,name:'フシギダネ',type:'くさ'},detailKey:()=> '0001_default',currentNo:1,currentSpeciesId:null,currentTab:'ability',detailOrigin:'dex',detailHistory:[],detailForward:[],setTheme:()=>{},show:()=>{},header:()=>{},renderStats:()=>{},renderFood:()=>{},renderSkill:()=>{},renderEvolution:()=>{},renderSleepStyles:()=>rendered.push('sleep'),renderPokemonFields:()=>{},switchTab:()=>{},updateDexStickyTop:()=>{},ability:{prepend:()=>{}},getComputedStyle:()=>({}),history:{},Number,parseFloat};
vm.runInNewContext(fs.readFileSync('templates/detail/07-navigation.html','utf8').replace(/\}\)\(\);\s*<\/script>\s*$/,''),ctx);
assert.equal(w.openPokemonDetail('0001_default'),true);assert.equal(selected[0],'0001_default');assert.equal(rendered.length,0);selected=null;
assert.equal(w.openPokemonDetail('0001_default',{local:true}),true);assert.equal(selected,null);assert.equal(rendered.length,1);assert.equal(doc.title,'フシギダネ｜ポケモン図鑑｜P Sleep Nexus');w.PSG_REFRESH_DEX_DETAIL();assert.equal(selected,null);assert.equal(rendered.length,2);assert.equal(w.openPokemonDetail('unknown'),false);
const list=fs.readFileSync('templates/core/06-lists.html','utf8');assert(list.includes('<a href="${window.PS_DEX_ROUTE.url(speciesKey(p))}"'));assert(list.includes("window.PS_DEX_ROUTE.capture('dex')"));
console.log('Individual detail URLs, real document navigation, native links, form/tab targets, list filter/scroll restoration, bfcache, blocked storage and invalid species passed');
