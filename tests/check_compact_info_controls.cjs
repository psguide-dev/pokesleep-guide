const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('review.html','utf8'),scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),assets={window:{},document:{addEventListener(){}}};vm.createContext(assets);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG='])vm.runInContext(scripts.find(s=>s.includes(marker)),assets);
const listSource=fs.readFileSync('templates/recipes/04-list-view.html','utf8'),sortBody=listSource.slice(listSource.indexOf('  const categoryRecipes='),listSource.indexOf('  count.textContent='));
const catalog=assets.window.PS_CATALOG,recipes=Object.values(catalog.recipes);
// Sorting is shared across recipe/evaluation modes, including ingredient filtering.
const getOrder=new vm.Script(`(function(){${sortBody};return filtered.map(r=>r.id)})()`);
for(const mode of ['recipe','evaluation'])for(const selectedCategory of new Set(recipes.map(r=>r.category)))for(const order of ['energy-desc','pot','name'])for(const selectedIngredient of ['','あまいミツ']){
 const context={recipes,selectedCategory,selectedIngredient,recipeMode:mode,sort:{value:order},energyAtLevel:r=>r.energy.max};vm.createContext(context);
 const actual=Array.from(getOrder.runInContext(context));
 const expected=recipes.filter(r=>r.category===selectedCategory&&(!selectedIngredient||r.ingredients.some(i=>i.name===selectedIngredient))).sort((a,b)=>order==='name'?a.name.localeCompare(b.name,'ja'):order==='pot'?b.ingredients.reduce((n,i)=>n+i.qty,0)-a.ingredients.reduce((n,i)=>n+i.qty,0)||a.name.localeCompare(b.name,'ja'):b.energy.max.value-a.energy.max.value).map(r=>r.id);
 assert.deepEqual(actual,expected);
}
// Every information destination has an existing identifying image next to back.
for(const id of ['fieldPage','recipePage','ingredientPage','berryPage','naturePage','skillPage','bookshelfPage','expPage','sourcesPage','accountPage','typeRankingPage','skillEnergyRankingPage','sameSkillRankingPage','ingredientRankingPage','islandRankingPage']){
 const section=html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0],header=section.slice(0,section.indexOf('</div>'));
 assert(/data-back[^>]*>.*?<\/button><img class="psg-page-icon"/.test(header),id);
 const src=header.match(/class="psg-page-icon" src="([^"]+)"/)[1];assert(fs.existsSync(src));assert(!header.includes('<h2'));
}
assert(!html.includes('id="ingredientSearch"'));
for(const id of ['ingredientIndexCount','recipeCount','skillIndexCount'])assert(html.includes(`id="${id}"`),'retained live status '+id);
const recipeHeader=html.match(/<section id="recipePage"[\s\S]*?<\/div>\n/)[0];for(const id of ['recipeIngredientButton','recipeModeSelect','recipeSort'])assert(recipeHeader.includes(`id="${id}"`));
assert(html.includes('<option value="pot">鍋容量順</option>'));
assert(fs.readFileSync('templates/core/05-navigation-and-filters.html','utf8').includes("if(id==='rankingPage')id='typeRankingPage'"));
console.log('Both recipe views: all three sorts, categories and ingredient filter; information icons and compact controls passed.');
// Padding correction applies to face renders only, retaining manual image loading.
const shell=fs.readFileSync('templates/01-shell-head.html','utf8');
let allowed=true;const faceContext={window:{PS_IMAGE_LOADING:{allowed:()=>allowed,attrs:src=>`src="${src}"`}},console};vm.createContext(faceContext);
vm.runInContext(shell.slice(shell.indexOf('window.PS_DEV_ASSETS = {'),shell.indexOf("document.addEventListener('error'")),faceContext);
for(const no of [200,429]){const path=`assets/pokemon/ghost-20261026/${no}/face.webp`;const face=faceContext.window.PS_DEV_ASSETS.image(path,'pokemon',no,'face','');assert(face.includes('viewBox="45 45 166 166"'));assert(face.includes(path));assert(!faceContext.window.PS_DEV_ASSETS.image(path,'pokemon',no,'full','').includes('<svg'));}
allowed=false;assert(faceContext.window.PS_DEV_ASSETS.image('face.webp','pokemon',200,'face','').includes('psg-manual-image'));
assert(!html.includes('id="recipeEvaluationSort"'));assert(!html.includes('data-recipe-mode='));
const choices=fs.readFileSync('templates/recipes/02-ingredient-filter.html','utf8');assert(!choices.includes('caption.textContent'));assert(choices.includes("option.setAttribute('aria-label',name)"));
const environment=fs.readFileSync('templates/ingredients/00-environment.html','utf8');assert(!environment.includes("createElement('meter')"));assert(environment.includes('上位料理での使用数'));
console.log('Face padding, manual loading, icon-only picker, plain recipe counts and removal of obsolete recipe controls passed.');
