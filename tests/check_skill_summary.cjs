const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p));
const skills=Object.fromEntries(['ingredient_draw_s','super_luck_ingredient_select_s','hyper_cutter_ingredient_select_s','metronome','transform_skill_copy','mimic_skill_copy'].map(id=>[id,json('master/skills/'+id+'/data.json')]));
const species=json('master/pokemon/0557/data.json');for(const slot of species.ingredientSlots)for(const c of slot.candidates)c.name=json('master/ingredients/'+c.ingredientId+'/data.json').name;
const ctx={window:{},catalog:{skills,pokemon:{557:species}},item:{no:557,level:1}};vm.createContext(ctx);
vm.runInContext(read('templates/day/01-calculation-helpers.html')+read('templates/day/06-skill-display.html'),ctx);
function display(id){ctx.member={skillId:id,skillLevel:7};return vm.runInContext('dailySkillDisplay(member,item,catalog)',ctx)}
const plain=display('ingredient_draw_s');assert(plain.select);assert.equal(plain.amount,18);assert.deepEqual(Array.from(plain.candidates),['つやつやアボカド','ほっこりポテト','ピュアなオイル']);
assert.equal(display('super_luck_ingredient_select_s').candidates.length,4);assert.deepEqual(Array.from(display('super_luck_ingredient_select_s').shards),[4000,20000]);
assert.equal(display('hyper_cutter_ingredient_select_s').bonusAmount,18);
for(const id of ['metronome','transform_skill_copy','mimic_skill_copy'])assert(display(id).countOnly);
const team=read('templates/core/09-day-view.html'),box=read('templates/box/02-daily-forecast.html');assert(!team.includes('dailySkillOmissionText('));assert(!box.includes('dailySkillOmissionText('));assert(box.includes("if(display.countOnly)return ''"));
assert(!read('templates/day/03-skill-effects.html').includes('select_ingredients'));
console.log('Skill summaries: native candidate pools at all levels, conditional candidates/bonuses, count-only Metronome/copy, no random ingredient allocation and concise team/Box views passed.');
