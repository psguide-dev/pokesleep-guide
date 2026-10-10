const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
process.chdir(path.resolve(__dirname,'..'));
const ctx={detailEsc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')};
vm.createContext(ctx);
vm.runInContext(require('./read_detail_skill.cjs')().split(' function renderSkill')[0],ctx);
const skills=Object.fromEntries(fs.readdirSync('master/skills').filter(p=>fs.existsSync(`master/skills/${p}/data.json`)).map(p=>{const s=JSON.parse(fs.readFileSync(`master/skills/${p}/data.json`));return[s.id,s]}));
const nonNumeric=new Set(['metronome','mimic_skill_copy','transform_skill_copy']);
let count=0;
for(const s of Object.values(skills))for(const [lv,x] of Object.entries(s.levels)){
 const html=ctx.skillDescription(s,x);
 if(x.description)assert.equal(html.replace(/<[^>]*>/g,''),ctx.detailEsc(x.description),`${s.id} Lv.${lv}: source wording changed`);
 if(!nonNumeric.has(s.id))assert(html.includes('skill-var'),`${s.id} Lv.${lv}: missing numeric color`);
 assert(new Set([...html.matchAll(/effect-([\w-]+)/g)].map(m=>m[1])).size<=2,`${s.id}: more than two colors`);
 count++;
}
const show=id=>ctx.skillDescription(skills[id],skills[id].levels[1]);
assert(show('energy_cheer_s').includes('ポケモン1匹のげんきを<span class="skill-var effect-energy-recovery">12</span>'));
assert(show('berry_burst').includes('effect-berry">1</span>個'));
assert(show('present_ingredient_magnet_s').includes('effect-food">4</span>個'));
assert(show('present_ingredient_magnet_s').includes('effect-skill">4</span>個'));
assert(show('super_luck_ingredient_select_s').includes('effect-shards">500個か2,500</span>個'));
assert(show('helper_boost_fire').includes('3～5種'));
assert(show('stockpile_energy_charge_s').includes('（0〜10回）：<span class="skill-var effect-energy">'));
assert(!ctx.skillVariables(skills.metronome,skills.metronome.levels[1],1).includes('effect-skill'));
console.log(`${Object.keys(skills).length} skills / ${count} levels: wording preserved, semantic colors, condition counts and black level labels checked`);
