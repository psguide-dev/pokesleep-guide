const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'data-import/biblo-v347/manifest.json')));
const corrections=JSON.parse(fs.readFileSync(path.join(root,'data-import/biblo-v347/corrections-v348.json')));
const html=fs.readFileSync(path.join(root,'review.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const s of scripts)new vm.Script(s);
const c={window:{},console};vm.createContext(c);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','// Resolve form identity'])vm.runInContext(scripts.find(s=>s.includes(marker)),c);
const catalog=c.window.PS_CATALOG,forms=c.window.PS_FORMS,files=c.window.PS_IMAGE_FILES;
assert.equal(forms.records.size,34);assert.equal(manifest.images.filter(r=>r.role==='sleep').length,944);
for(const row of manifest.images)assert(fs.existsSync(path.join(root,row.path)),row.path);
for(const [sid,bindings] of Object.entries(manifest.sleepBindings))for(const [id,image] of Object.entries(bindings)){
 const override=corrections.bindings.find(r=>r.speciesId===sid&&r.sleepStyleId===id);assert.equal(files.sleepStylesBySpecies[sid][id],override?.path||image);
 const p=forms.resolve(sid);const styles=p.detailPreviewOnly?p.sleepStyles:catalog.sleepStyles[p.no];
 assert(styles.some(s=>s.id===id),`${sid} ${id}`);
 assert(['confirmed','provisional'].includes(catalog.sleepArtworkStatus[sid][id]));
}
for(const no of [84,85,38,440])assert.notEqual(catalog.pokemon[no].image,catalog.pokemon[no].faceImage);
for(const sid of ['0025_captain','0025_halloween_23','0025_halloween_24','0025_holiday','0133_halloween','0133_holiday','0363_holiday'])assert(forms.resolve(sid).faceImage.includes('biblo-v347'));
assert.notEqual(forms.resolve('0025_halloween_23').faceImage,forms.resolve('0025_halloween_24').faceImage);
for(const no of [590,591]){
 const p=forms.resolve(`${String(no).padStart(4,'0')}_default`);assert(p.image&&p.faceImage);assert.equal(p.type,'どく');assert.equal(p.sleepType,'うとうと');
 assert.equal(p.boxEligible,false);assert.equal(p.mainSkillId,null);assert.equal(p.help,null);
 assert(forms.dexEntries.some(row=>row.no===no));assert(!c.window.PS_SPECIES_CATALOG.box().some(row=>row.no===no));
 assert.equal(p.sleepStyles.length,0);const photos=catalog.pendingSleepArtwork[p.speciesId];assert.equal(photos.length,4);assert.deepEqual(Array.from(photos,r=>r.stars),[1,2,3,4]);
 assert(photos.every(row=>!row.id));
}
const old=JSON.parse(fs.readFileSync(path.join(root,'data-import/picasso-sleep-v281/manifest.json')));
for(const row of old.images.filter(r=>r.status==='matched'))assert(files.sleepStylesBySpecies[row.speciesId][row.sleepStyleId]);
for(const row of corrections.bindings){
 assert.equal(files.sleepStylesBySpecies[row.speciesId][row.sleepStyleId],row.path,`${row.speciesId}:${row.sleepStyleId}`);
 assert.equal(catalog.sleepArtworkStatus[row.speciesId][row.sleepStyleId],'confirmed');
 assert(!(catalog.pendingSleepArtwork[row.speciesId]||[]).some(r=>r.image===row.path));
}
for(const sid of ['0025_holiday','0133_holiday','0363_holiday']){
 const p=forms.resolve(sid);assert.equal(p.sleepStyles.length,2);
 assert.equal(p.sleepStyles.filter(s=>s.stars===2).length,1);assert.equal(p.sleepStyles.find(s=>s.stars===2).name,'プレゼント寝');
 assert.equal((catalog.pendingSleepArtwork[sid]||[]).length,0);
}
const mewtwo=forms.resolve('0150_default').sleepStyles;
assert.equal(mewtwo.filter(s=>s.name==='うっとうしい寝').length,1);
const last=mewtwo.filter(s=>s.stars===5).sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(Array.from(last,s=>s.name),['うっとうしい寝','こころやすらぎ寝']);
assert.equal(last[0].id,'0150_default_04');assert.equal(last[1].id,'0150_default_05');
for(const no of [459,460]){
 const two=files.sleepStylesBySpecies[`${no.toString().padStart(4,'0')}_default`][`${no.toString().padStart(4,'0')}_02`];
 const three=files.sleepStylesBySpecies[`${no.toString().padStart(4,'0')}_default`][`${no.toString().padStart(4,'0')}_03`];
 assert(two.includes('biblo-v349'));assert.equal(corrections.missingProcessedImages.length,0);assert.notEqual(two,three);
 assert.equal(files.sleepStylesBySpecies[`${no.toString().padStart(4,'0')}_default`][`${no.toString().padStart(4,'0')}_01`],`assets/sleep/biblo-v347/${no===459?'0785':'0789'}.webp`);
 assert.equal(three,`assets/sleep/biblo-v347/${no===459?'0787':'0791'}.webp`);
 assert.equal(catalog.sleepStyles[no].filter(s=>s.stars===2).length,1);
 assert.equal(catalog.sleepStyles[no].find(s=>s.stars===2).name,no===459?'ぼうだち寝':'いかく寝');
}
assert.equal(files.sleepStylesBySpecies['0006_default']['0006_01'],'assets/sleep/biblo-v347/0037.webp');
assert.deepEqual(Array.from(Object.entries(catalog.pendingSleepArtwork).filter(([,rows])=>rows.length),([sid,rows])=>[sid,rows.length]),[['0590_default',4],['0591_default',4]]);
// Match the actual detail markup: the removed inline rate element is absent.
const detailMarkup=fs.readFileSync(path.join(root,'templates/09-dex-detail.html'),'utf8');
assert(!detailMarkup.includes('id="skillRateInline"'));
const nodes=new Map(['detailSkill','detailSkillEffect','skillLevels','skillDetailToggle'].map(id=>[id,{textContent:'old',hidden:false,replaceChildren(){this.textContent=''}}]));
const icon={replaceChildren(){this.cleared=true}};
const ui={document:{getElementById:id=>nodes.get(id)||null,querySelector:()=>icon},skillOf:()=>null};vm.createContext(ui);
vm.runInContext(fs.readFileSync(path.join(root,'templates/detail/05-skill.html'),'utf8'),ui);vm.runInContext('renderSkill({mainSkillId:null})',ui);
assert.equal(nodes.get('detailSkill').textContent,'スキル未確認');assert.equal(nodes.get('skillLevels').textContent,'');assert(nodes.get('skillDetailToggle').hidden);assert(icon.cleared);
console.log('All scripts parse; 944 received sleep images, original discovery IDs, tentative image statuses, 9 missing faces / 4 bodies, and 2 non-calculating previews verified');
