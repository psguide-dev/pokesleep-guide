const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const pages=Object.fromEntries(['review','fields','pokemon'].map(p=>[p,fs.readFileSync(p+'.html','utf8')]));
for(const [page,html] of Object.entries(pages))for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('application/json'))new vm.Script(m[2],{filename:page});
const asset=pages.fields.match(/<script src="(data\/fields-[a-f0-9]+\.js)">/)[1];
assert(!pages.pokemon.includes('<script src="'+asset+'">'));assert(!pages.review.includes('<script src="'+asset+'">'));
assert(!pages.review.includes('function renderFieldEncounters('));assert(pages.fields.includes('function renderFieldEncounters('));
assert(!pages.fields.includes('id="psg-recipe-index-controller"'));assert(!pages.fields.includes('id="psg-skill-index-controller"'));
function catalog(html){return JSON.parse(html.match(/window.PS_CATALOG=(.*);\n/)[1])}
const common=catalog(pages.review),fieldCatalog=catalog(pages.fields),data={window:{}};vm.runInNewContext(fs.readFileSync(asset,'utf8'),data);
for(const [id,field] of Object.entries(data.window.PS_FIELD_DATA.fields)){
 assert(field.encounters.length>0);assert(field.rankThresholds.length>0);
 assert(!common.fields[id].encounters);assert(!common.fields[id].rankThresholds);
 for(const key of ['name','mode','favoriteMode','favoriteBerries'])assert.equal(JSON.stringify(field[key]),JSON.stringify(common.fields[id][key]));
}
assert(!common.dailySupply);assert(!fieldCatalog.dailySupply);assert.equal(Object.keys(fieldCatalog.recipes).length,0);
const storage=new Map();let blocked=false;
function setup(path){
 const assigned=[],nodes={},classes=[],listeners={},location=new URL('https://example.test/guide/'+path);location.assign=url=>assigned.push(url);
 const state={screen:'home',history:['startPage'],filters:{types:new Set(['くさ']),ingredients:new Set(),specs:new Set()},boxFilters:{types:new Set(),ingredients:new Set(),specs:new Set(),tags:new Set(['favorite'])}};
 const window={scrollY:720,PS:{state,refreshAssetViews:()=>{}},scrollTo:(x,y)=>window.scrollY=y,addEventListener:(key,fn)=>listeners[key]=fn};
 const document={documentElement:{classList:{add:(...x)=>classes.push(...x),remove:()=>{}}},getElementById:id=>nodes[id]??={value:'',classList:{add:()=>{}}}};
 const ctx={window,location,document,URL,URLSearchParams,Set,Date,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(blocked)throw Error('quota');storage.set(k,v)}},requestAnimationFrame:fn=>fn(),history:{state:null,replaceState:(s,t,u)=>location.href=u}};
 vm.createContext(ctx);vm.runInContext(pages.review.match(/<script id="psg-field-routing">([\s\S]*?)<\/script>/)[1],ctx);
 return {ctx,window,state,assigned,location,classes,listeners,nodes,route:window.PS_FIELD_ROUTE};
}
const main=setup('review.html?screen=home');main.nodes.dexSearch={value:'フシギ'};main.nodes.boxSearch={value:'育成'};main.route.open();assert.equal(main.assigned[0],'https://example.test/guide/fields.html?screen=fieldPage');
const fields=setup('fields.html?screen=fieldDetail&field=cyan');assert(fields.window.PS_FIELD_PAGE);assert(fields.classes.includes('psg-route-pending'));fields.route.returnToApp('home');assert(fields.assigned[0].includes('screen=home&restore=field'));
const returned=setup('review.html?screen=home&restore=field');returned.state.filters.types.clear();returned.state.boxFilters.tags.clear();returned.route.restore();assert.deepEqual([...returned.state.filters.types],['くさ']);assert.deepEqual([...returned.state.boxFilters.tags],['favorite']);assert.equal(returned.nodes.boxSearch.value,'育成');assert.equal(returned.window.scrollY,720);
const nav=fs.readFileSync('templates/core/05-navigation-and-filters.html','utf8'),go=nav.slice(nav.indexOf('function go('),nav.indexOf("document.querySelectorAll('[data-screen]')"));
const ctx=fields.ctx;Object.assign(ctx,{state:fields.state,screens:[],tabs:[],renderFieldControls:()=>{},dexListDirty:false,boxListDirty:false,teamViewDirty:false});vm.runInContext(go,ctx);fields.window.PS.go=ctx.go;
vm.runInContext(pages.fields.match(/<script id="psg-pokemon-routing">([\s\S]*?)<\/script>/)[1],ctx);
fields.window.PS_FIELD_DETAIL={fieldId:'cyan',open:id=>{fields.window.PS.go('fieldDetail');return id==='cyan'}};
fields.listeners.DOMContentLoaded();assert.deepEqual([...fields.state.history],['home','fieldPage']);assert.equal(fields.state.screen,'fieldDetail');
fields.window.PS.go(fields.state.history.pop(),false);assert.equal(fields.state.screen,'fieldPage');assert(!fields.location.searchParams.has('field'));
fields.window.PS.go(fields.state.history.pop(),false);assert(fields.assigned.at(-1).includes('screen=home&restore=field'));
blocked=true;assert.doesNotThrow(()=>main.route.open('fieldDetail','cyan_ex'));assert(main.assigned.at(-1).includes('field=cyan_ex'));
assert(fs.readFileSync('.github/workflows/build-review.yml','utf8').includes('cp -R data public/'));
console.log('Page-specific code/data, shared team settings, field boot/back, saved filters/scroll, direct URLs, blocked storage and deployment assets passed');

(async()=>{
 const ctx=main.ctx,scripts=[];
 ctx.document.createElement=()=>({remove(){this.removed=true}});ctx.document.head={append:script=>scripts.push(script)};
 ctx.window.PS_CATALOG={pokemon:{1:{fieldDataURL:common.pokemon[1].fieldDataURL}}};
 const first=main.route.loadPokemonData(1),second=main.route.loadPokemonData(1);assert.equal(first,second);assert.equal(scripts.length,1);
 scripts[0].onerror();await assert.rejects(first);
 const retry=main.route.loadPokemonData(1);assert.equal(scripts.length,2);ctx.window.PS_POKEMON_FIELDS={1:{cyan:{encounters:[1]}}};scripts[1].onload();await retry;
 assert.equal(ctx.window.PS_POKEMON_FIELDS[1].cyan.encounters.length,1);await main.route.loadPokemonData(1);assert.equal(scripts.length,2);
 assert(!pages.pokemon.includes('renderSleepStyles(m);renderPokemonFields(m);'));
 console.log('Field data waits for first tab visit, shares in-flight request, retries failure and reuses successful load');
})().catch(error=>{console.error(error);process.exitCode=1});

assert(fs.readFileSync('templates/08-fields.html','utf8').includes('class="btn psg-field-detail-back" data-back'));

const expected=new Map(),actual=new Map();
for(const [fieldId,field] of Object.entries(data.window.PS_FIELD_DATA.fields))for(const row of field.encounters)expected.set(fieldId+':'+row.sleepStyleId,JSON.stringify(row));
const sizes=[];
for(const [no,pokemon] of Object.entries(common.pokemon)){
 const ctx={window:{}};const script=fs.readFileSync(pokemon.fieldDataURL,'utf8');vm.runInNewContext(script,ctx);sizes.push(Buffer.byteLength(script));
 const payload=ctx.window.PS_POKEMON_FIELDS[no];assert(payload);
 for(const [fieldId,field] of Object.entries(payload)){
  for(const key of ['id','name','mode'])assert.equal(field[key],data.window.PS_FIELD_DATA.fields[fieldId][key]);
  for(const row of field.encounters){assert.equal(String(Number(row.sleepStyleId.split('_')[0])),no);const key=fieldId+':'+row.sleepStyleId;assert(!actual.has(key));actual.set(key,JSON.stringify(row))}
 }
}
assert.deepEqual([...actual].sort(),[...expected].sort());
assert(!pages.pokemon.includes('window.PS_FIELD_DATA_URL='));
console.log(`${sizes.length} species payloads exactly match ${actual.size} canonical field encounters; largest ${Math.max(...sizes)} bytes`);
