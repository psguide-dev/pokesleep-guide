const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('review.html','utf8');
const catalog=JSON.parse(html.match(/window.PS_CATALOG=(.*);\n/)[1]);
const ctx={window:{PS_CATALOG:catalog,PS_IMAGE_FILES:{berries:{}}}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('templates/01-species-catalog.html','utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const all=ctx.window.PS_SPECIES_CATALOG.all(),reference=ctx.window.PS_SPECIES_CATALOG.reference();
assert.equal(all.filter(p=>[710,711].includes(p.no)).length,8);
assert.equal(reference.filter(p=>[710,711].includes(p.no)).length,2);
assert.equal(ctx.window.PS_SPECIES_CATALOG.box().filter(p=>[710,711].includes(p.no)).length,8);
for(const no of [710,711]){
 const forms=all.filter(p=>p.no===no);assert.equal(new Set(forms.map(p=>p.fieldDataURL)).size,1);
 for(const form of forms){
  assert(form.sizeSharedFields);const payloadCtx={window:{}};
  vm.runInNewContext(fs.readFileSync(form.fieldDataURL,'utf8'),payloadCtx);
  const fields=payloadCtx.window.PS_POKEMON_FIELDS[no],encounters=Object.values(fields).flatMap(f=>f.encounters);
  assert.equal(encounters.length,11);assert(encounters.every(e=>e.sizeShared&&form.sleepStyles.some(s=>s.id===e.sleepStyleId)));
 }
}
// Regional and costume identities must remain separate in reference lists.
for(const no of [25,37,38,133,194,849])assert.equal(reference.filter(p=>p.no===no).length,all.filter(p=>p.no===no).length);
const settings=html.slice(html.indexOf('<div class="psg-day-condition-details"'),html.indexOf('<p id="teamDaySaveStatus"'));
for(const id of ['teamCollectionInterval','teamInitialEnergy','teamInitialEnergyRange','teamMeals','teamBerryZoneBerry','teamBerryZone']){
 assert(settings.includes(`id="${id}"`));assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
}
assert(!settings.match(/\bdisabled\b/));
console.log('8 separate size records, 2 reference entries, all shared field conditions and unified settings passed');
