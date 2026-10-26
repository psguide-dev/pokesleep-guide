const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ctx,catalog}=require('./skill_model_runtime.cjs').createRuntime(process.cwd(),false);
const scripts=[...fs.readFileSync('review.html','utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),view={window:{},document:{addEventListener(){}}};vm.createContext(view);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG='])vm.runInContext(scripts.find(s=>s.includes(marker)),view);
for(const no of [200,429]){
 const p=catalog.pokemon[no];assert.equal(p.friendPoints,no===200?16:20);assert(p.hideFoodRate&&p.hideSkillRate);assert.equal(p.rateDisplay,false);assert.equal(ctx.speciesEvolutionStage(p),no===200?0:1);
 const member=ctx.calculateIndividualTrial({id:'muuma',no,level:60,nature:'がんばりや',subskills:[],skillLevel:no===200?1:2,ingredients:{1:'ほっこりポテト',30:'ほっこりポテト',60:'ほっこりポテト'}});assert(!member.reasons);assert(member.values.skill>0&&member.values.food>0);assert.equal(member.member.stats.carry,no===200?13:22);
 const live=view.window.PS_CATALOG.pokemon[no],images=view.window.PS_IMAGE_FILES;assert(fs.existsSync(images.pokemon[no]));assert(fs.existsSync(images.pokemonFaces[no]));assert.deepEqual(Array.from(view.window.PS_CATALOG.sleepStyles[no],s=>s.stars),[1,2,3]);assert(view.window.PS_CATALOG.sleepStyles[no].every(s=>fs.existsSync(s.image)));assert.equal(live.friendPoints,p.friendPoints);
 // Render stats: hidden provisional rates must remove labels, symbols and boxes together.
 const identity=fs.readFileSync('templates/dex/05-identity.html','utf8'),render=identity.slice(identity.indexOf(' function renderStats(m){'));
 const stats={innerHTML:''},speed={innerHTML:''},ui={stats,document:{getElementById:()=>speed}};vm.createContext(ui);vm.runInContext(render,ui);ui.renderStats(p);assert(!/食材確率|スキル発動確率|%/.test(stats.innerHTML));assert.equal((stats.innerHTML.match(/class="psg-detail-stat"/g)||[]).length,1);
 const foodHost={innerHTML:'',classList:{toggle(){}}},foodUI={document:{getElementById:id=>id==='detailFoods'?foodHost:null}};vm.createContext(foodUI);vm.runInContext(fs.readFileSync('templates/dex/06-food.html','utf8'),foodUI);foodUI.renderFood(p);assert(!foodHost.innerHTML.includes('%'));assert(!foodHost.innerHTML.includes('未確認</strong>'));
 ui.renderStats(catalog.pokemon[94]);assert(stats.innerHTML.includes('食材確率')&&stats.innerHTML.includes('16.6%'));
}
const s=catalog.skills.magical_flame_s;assert.equal(s.maxLevel,7);assert.equal(s.levels[1].criticalChanceAddPercentagePoints,1);assert.equal(s.levels[7].capacity,31);assert.equal(s.levels[7].criticalChanceAddPercentagePoints,5);
assert.equal(view.window.PS_IMAGE_FILES.skills.magical_flame_s,'assets/skill-icons/main_skill_placeholder.webp');
console.log('Muuma/Mismagius: FP16/20, artwork, ★1/2/3, evolution carry, nonzero forecasts, hidden provisional rate boxes and all skill effect fields passed.');
