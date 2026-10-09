const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const docs=Object.fromEntries(['review','pokemon','recipes','ingredients'].map(k=>[k,fs.readFileSync(k+'.html','utf8')]));
const catalog=JSON.parse(docs.review.match(/window.PS_CATALOG=(.*);\n/)[1]);
const pkg=JSON.parse(docs.review.match(/window.PS_COOKING_PACKAGE=(.*);/)[1]);
assert(!catalog.dailySupply&&!catalog.recipeEvaluation);
const data={window:{}};vm.runInNewContext(fs.readFileSync(pkg.data,'utf8'),data);
assert.deepEqual(JSON.parse(JSON.stringify(data.window.PS_COOKING_DATA.dailySupply)),JSON.parse(fs.readFileSync('master/cooking/daily-supply.json','utf8')));
assert.deepEqual(JSON.parse(JSON.stringify(data.window.PS_COOKING_DATA.recipeEvaluation)),JSON.parse(fs.readFileSync('master/cooking/evaluation.json','utf8')));
assert.equal(JSON.stringify(data.window.PS_COOKING_DATA.recipes),JSON.stringify(catalog.recipes));
new vm.Script(fs.readFileSync(pkg.view,'utf8'));
for(const [name,html] of Object.entries(docs)){
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('application/json'))new vm.Script(m[2]);
 assert(!html.includes('id="psg-recipe-index-controller"'));
 for(const asset of [pkg.data,pkg.view])assert.equal(html.includes('<script src="'+asset+'">'),['recipes','ingredients'].includes(name));
}
const store=new Map();
function setup(file,screen){
 const nodes={},assigned=[],location=new URL('https://example.test/guide/'+file);location.assign=u=>assigned.push(u);
 const state={screen,history:['info'],filters:{types:new Set(['くさ']),ingredients:new Set(),specs:new Set()},boxFilters:{types:new Set(),ingredients:new Set(),specs:new Set(),tags:new Set()}};
 const window={PS:{state,refreshAssetViews:()=>{}},scrollY:500,scrollTo:(x,y)=>window.scrollY=y};
 const document={documentElement:{classList:{add:()=>{}}},getElementById:id=>nodes[id]??={value:'',dispatchEvent:()=>{}},querySelector:()=>null,querySelectorAll:()=>[]};
 const ctx={window,document,location,URL,Set,Map,Event:class{},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},requestAnimationFrame:fn=>fn()};
 vm.createContext(ctx);vm.runInContext(docs.review.match(/<script id="psg-info-routing">([\s\S]*?)<\/script>/)[1],ctx);return {ctx,window,document,nodes,state,assigned,route:window.PS_INFO_ROUTE};
}
const main=setup('review.html','info');main.route.open('ingredientPage');assert(main.assigned[0].includes('/ingredients.html?screen=ingredientPage'));
const ingredients=setup('ingredients.html','ingredientPage');ingredients.route.restore();ingredients.document.getElementById('ingredientSearch').value='ミツ';ingredients.route.open('recipePage',{recipe:'baby_honey_curry'});assert(ingredients.assigned[0].includes('/recipes.html?screen=recipePage&restore=info&recipe=baby_honey_curry'));
const recipes=setup('recipes.html','recipePage');recipes.route.restore();assert.deepEqual([...recipes.state.history],['info','info','ingredientPage']);
recipes.state.history.pop();recipes.route.open('ingredientPage',{push:false});
const restored=setup('ingredients.html','ingredientPage');restored.route.restore();assert.equal(restored.nodes.ingredientSearch.value,'ミツ');assert.equal(restored.window.scrollY,500);
assert.equal(restored.route.path('dex'),'review.html');assert.equal(restored.route.path('fieldPage'),'fields.html');
assert(fs.readFileSync('.github/workflows/build-review.yml','utf8').includes('cp recipes.html ingredients.html public/'));
console.log('Shared cooking package matches canonical data; isolated assets, syntax, ingredient/recipe links, filters, scroll and return stack passed');
