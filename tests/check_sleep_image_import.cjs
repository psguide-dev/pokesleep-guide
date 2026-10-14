const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);const read=p=>fs.readFileSync(p,'utf8');vm.runInContext(read('templates/import/04-sleep-image-reader.html').replace(/^<script[^>]*>\n/,'').replace(/<\/script>\s*$/,''),ctx);
const reader=ctx.window.PS_SLEEP_IMAGE_READER,rows=[{speciesId:'0001_default',pokemon:'フシギダネ',id:'bulba1',stars:1,name:'こうごうせい寝'},{speciesId:'0001_default',pokemon:'フシギダネ',id:'bulba2',stars:2,name:'ふんばり寝'},{speciesId:'0025_default',pokemon:'ピカチュウ',id:'pika1',stars:1,name:'まるまり寝'},{speciesId:'0025_holiday',pokemon:'ピカチュウ（ホリデー）',id:'holiday2',stars:2,name:'プレゼント寝'}];
assert.equal(reader.parse('フシギダネ\nこうごうせい寝\n★1',rows).styleId,'bulba1');
assert.equal(reader.parse('No.001 フシギダネ\n★★',rows).styleId,'bulba2');
assert.equal(reader.parse('ピカチュウ（ホリデー）\nプレゼント寝',rows).styleId,'holiday2');
assert.equal(reader.parse('ピカチュウ大好き\nまるまり寝',rows).styleId,null,'no substring species guess');
assert.equal(reader.parse('フシギダネ\nピカチュウ\nこうごうせい寝',rows).styleId,null,'overview with multiple species requires review');
assert.equal(reader.parse('フシギダネ',rows).styleId,null,'species alone does not choose a sleep style');
assert.equal(reader.parse('フシギダネ\nこうごうせい寝\n★2',rows).styleId,null,'conflicting name and star does not guess');
assert.equal(reader.parse('',rows).styleId,null);
const saved={pika1:true,legacy:true},merged=reader.mergeFound(saved,['bulba1','bulba1'],rows);assert.equal(merged.pika1,true);assert.equal(merged.bulba1,true);assert.equal(merged.legacy,true);assert.equal(saved.bulba1,undefined,'review never mutates storage input');assert.throws(()=>reader.mergeFound(saved,['not-a-style'],rows));assert.throws(()=>reader.mergeFound([],['bulba1'],rows));
const form=read('templates/import/06-sleep-image-controller.html');assert(form.includes('form.onsubmit=event=>'));assert(form.includes("localStorage.setItem('psg-sleep-discoveries-v1'"));assert(form.includes('if(token!==epoch)return'));assert(form.includes("selected.some(r=>!entries.some(e=>e.speciesId===r.species.value&&e.id===r.style.value))"));
console.log('Sleep screenshot identity, names/stars, ambiguity, costumes, additive/deduplicated registration and cancellation safeguards pass');

// Use the generated catalog to verify that every selectable row carries a real saved sleep ID.
const scripts=[...read('review.html').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const actual={window:{}};vm.createContext(actual);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','// Resolve form identity','window.PS_SLEEP_IMAGE_READER='])vm.runInContext(scripts.find(s=>s.includes(marker)),actual);
const all=actual.window.PS_SLEEP_IMAGE_READER.entries();assert(all.length>900);
const known=new Set([...Object.values(actual.window.PS_CATALOG.sleepStyles).flat(),...Object.values(actual.window.PS_CATALOG.forms.sleepStyleGroups).flatMap(g=>g.styles||[])].map(s=>s.id));
assert(all.every(r=>known.has(r.id)));for(const r of all)assert(actual.window.PS_SPECIES_CATALOG.all().some(p=>actual.window.PS_SPECIES_CATALOG.key(p)===r.speciesId));
console.log(`${all.length} real sleep candidates use permanent, backup-compatible IDs`);

const venusaur=all.filter(r=>r.pokemon==='フシギバナ');
const screenshot='0003\nフシギバナ\nリサーチした数：23\n仲間にした数：0\nID - 1\nこうごうせい寝\nリサーチした数 - 5\nID - 2\nふんばり寝\nリサーチした数 - 11\nID - 3\nツルだし寝\nリサーチした数 - 4\nID - 4\nおなかのうえ寝\nリサーチした数 - 3';
const batch=actual.window.PS_SLEEP_IMAGE_READER.parseMany(screenshot,all);assert.equal(batch.length,4);assert(batch.every(r=>r.styleId));assert.deepEqual([...new Set(batch.map(r=>r.styleId))].sort(),Array.from(venusaur,r=>r.id).sort());
assert.equal(actual.window.PS_SLEEP_IMAGE_READER.parseMany(screenshot.replace('数 - 4','数 - 0'),all).filter(r=>r.styleId).length,3);
assert.equal(reader.parseMany('フシギダネ\nピカチュウ\nこうごうせい寝\nまるまり寝',rows).length,1,'multiple species are not cross-associated');
console.log('Four Venusaur sleep styles in one screenshot text, zero research counts and multi-species ambiguity pass');

const repaired=actual.window.PS_SLEEP_IMAGE_READER.parseMany(screenshot.replace('こうごうせい寝','こうごう\nせい寝').replace('ツルだし寝','ッルだし寝'),all);assert.equal(repaired.filter(r=>r.styleId).length,4,'split OCR lines and one-character kana error preserve four reviewed candidates');
assert.equal(actual.window.PS_SLEEP_IMAGE_READER.parseMany(screenshot.replace('ツルだし寝','全然ちがう寝'),all).filter(r=>r.styleId).length,3,'unrelated words do not become a sleep style');
console.log('Split sleep names and unique single-character OCR repair pass');

const realOCR=JSON.parse(fs.readFileSync(__dirname+'/fixtures/sleep-venusaur-ocr.json','utf8'));
const realBatch=actual.window.PS_SLEEP_IMAGE_READER.parseMany(realOCR.full+'\n'+realOCR.right,all);
assert.deepEqual([...new Set(realBatch.filter(r=>r.styleId).map(r=>r.styleId))].sort(),Array.from(venusaur,r=>r.id).sort(),'actual Japanese-only OCR returns all four Venusaur sleep styles');
console.log('Actual Japanese-only screenshot OCR resolves all four reviewed sleep candidates');

const overviewOCR=JSON.parse(fs.readFileSync(__dirname+'/fixtures/sleep-overview-ocr.json','utf8'));
const overviewReader=actual.window.PS_SLEEP_IMAGE_READER;
// IMG_2888: first number row starts at y=354, above the old 14.5% crop (371px).
for(const scale of [1,.5,2])for(let column=0;column<4;column++){
 const crop=reader.overviewCrop(1179*scale,2556*scale,column);
 assert(crop.y<=354*scale,'short-header first-row numbers must remain inside the OCR crop');
 assert(crop.y+crop.height>=2165*scale,'last-row collection counts must remain inside the OCR crop');
 assert(crop.x>=0&&crop.x+crop.width<=1179*scale);
}
assert(form.includes('PS_SLEEP_IMAGE_READER.overviewCrop('),'controller uses the tested crop geometry');
assert(overviewReader.isOverview(overviewOCR.full));assert(!overviewReader.isOverview(screenshot));
const overview=overviewReader.parseOverview(overviewOCR.columns,all);
assert.deepEqual(Array.from(overview,r=>r.no),overviewOCR.expectedNos);assert(overview.every(r=>r.speciesId&&r.styleIds.length===4));
assert.equal(new Set(overview.flatMap(r=>Array.from(r.styleIds))).size,64);
const partial=overviewReader.parseOverview(['No.1\n2/4'],all)[0];assert.equal(partial.count,2);assert.equal(partial.styleIds.length,0,'partial counts do not identify stars');
assert.equal(overviewReader.parseOverview(['No.1\n4/4'],all)[0].styleIds.length,4,'adjacent number and fraction lines remain separate');
assert.equal(overviewReader.parseOverview(['No.1\n5/5'],all)[0].styleIds.length,0,'catalog count mismatch requires manual review');
assert.equal(overviewReader.parseOverview(['No.1\n4/4\n2/4'],all)[0].styleIds.length,0,'conflicting count reads require manual review');
const alternate=Array.from(all).concat([{...all.find(r=>r.no===1),speciesId:'alternate',id:'alternate-sleep'}]);
assert.equal(overviewReader.parseOverview(['No.1\n4/4'],alternate)[0].speciesId,null,'No. alone cannot select an alternate identity');
console.log('Actual overview OCR maps 16 identities to 64 sleep IDs; partial, ambiguous and mismatched counts remain unselected');

// Render production review UI without storage writes. Changing one card must
// replace its submitted IDs while preserving the other cards' edited checks.
class ReviewNode{
 constructor(tag){this.tagName=tag;this.children=[];this.value='';this.textContent='';this.attrs={}}
 append(...nodes){this.children.push(...nodes)}
 prepend(...nodes){this.children.unshift(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(name,value){this.attrs[name]=value}
 get options(){return this.children.flatMap(n=>n.tagName==='option'?[n]:n.options||[])}
 get selectedOptions(){return this.options.filter(n=>n.value===this.value)}
}
actual.document={createElement:tag=>new ReviewNode(tag),createTextNode:text=>({textContent:text})};
actual.localStorage={getItem:()=>null,setItem(){throw Error('review must not save')}};
vm.runInContext(read('templates/import/08-sleep-image-review.html').replace(/<\/?script[^>]*>/g,''),actual);
const root=new ReviewNode('div'),view=actual.window.PS_SLEEP_IMAGE_REVIEW;
const reviewGroups=overviewReader.parseOverview(['No.135\n4/4','No.136\n4/4','No.149\n3/4'],all);
const selection=view.render([{text:'overview',overview:reviewGroups}],root);
assert.equal(selection.resultRows.filter(r=>r.check.checked).length,8);
assert.equal(selection.countRows.length,1);
assert.equal(selection.countRows[0].group.count,3);
assert(selection.countRows[0].check.checked);
assert(selection.resultRows.filter(r=>r.species.value==='0149_default').every(r=>!r.check.checked));
const flareon=selection.resultRows.find(r=>r.species.value==='0136_default');
flareon.check.checked=false;
const jolteon=selection.resultRows.find(r=>r.species.value==='0135_default');
const oldIds=selection.resultRows.filter(r=>r.group===jolteon.group).map(r=>r.style.value);
jolteon.species.value='0136_default';jolteon.species.onchange();
assert.equal(selection.resultRows.filter(r=>r.group===jolteon.group).length,4);
assert(selection.resultRows.filter(r=>r.group===jolteon.group).every(r=>!oldIds.includes(r.style.value)));
assert(selection.resultRows.filter(r=>r.group===jolteon.group).every(r=>!r.check.checked),'a corrected species with a different No. requires manual checks');
assert.equal(flareon.check.checked,false,'editing another card preserves a manual exclusion');
const second=view.render([screenshot],root);
assert.equal(root.children.length,1,'re-reading replaces the previous result UI');
assert.equal(second.resultRows.length,4);
assert(second.resultRows.every(r=>r.check.checked&&r.style.value));
assert.equal(second.countRows.length,0,'previous count-only records do not leak into detail scans');
second.resultRows[0].check.checked=false;
assert.equal(selection.resultRows.filter(r=>r.check.checked).length,3,'separate reviews own separate selection state');
console.log('Review split: complete/partial checks, species corrections, manual exclusions and isolated re-reads pass');

for(const no of [37,38]){
 const group=overviewReader.parseOverview([`No.${no}\n4/4`],all)[0];assert.equal(group.speciesId,null);
 for(const suffix of ['default','alola']){const key=String(no).padStart(4,'0')+'_'+suffix,ids=overviewReader.selectedOverviewStyles(group,key,all);assert.equal(ids.length,4);assert(ids.every(id=>all.some(r=>r.id===id&&r.speciesId===key)));}
 assert.equal(overviewReader.selectedOverviewStyles({...group,count:2},String(no).padStart(4,'0')+'_alola',all).length,0);
 assert.equal(overviewReader.selectedOverviewStyles(group,'0001_default',all).length,0,'No. correction never inherits complete checks');
}
const costumeGroup=overviewReader.parseOverview(['No.25\n2/2'],all)[0];
assert.equal(overviewReader.selectedOverviewStyles(costumeGroup,'0025_holiday',all).length,2);
assert.equal(overviewReader.selectedOverviewStyles(costumeGroup,'0025_default',all).length,0);
assert.equal(overviewReader.parseOverview(['No.25\n9/9'],all)[0].total,9);
assert.equal(overviewReader.parseOverview(['No.25\n16/16'],all)[0].total,16);
console.log('Explicit regional/costume choice selects its own complete styles, keeps partial counts manual and reads larger totals');

const allPikachu=overviewReader.parseOverview(['No.25\n9/9'],all)[0];
assert.equal(allPikachu.aggregateStyles.length,9);assert.equal(new Set(allPikachu.styleIds).size,9);
assert.deepEqual(Array.from(allPikachu.styleIds).sort(),[...new Set(all.filter(r=>r.no===25).map(r=>r.id))].sort(),'aggregate Pikachu count covers normal and all costumes without duplicate Halloween IDs');
const partPikachu=overviewReader.parseOverview(['No.25\n6/9'],all)[0];assert.equal(partPikachu.aggregateStyles.length,9);assert.equal(partPikachu.styleIds.length,0);
assert.equal(overviewReader.parseOverview(['No.25\n9/10'],all)[0].aggregateStyles.length,0);
assert.equal(overviewReader.parseOverview(['No.37\n4/4'],all)[0].aggregateStyles.length,0,'separate regional entries stay separate');
console.log('Pikachu 9/9 selects all nine unique costume IDs, partial counts stay manual and regional 4/4 stays separate');
const progress=ctx.window.PS_SLEEP_PROGRESS;
const regionRows=[1,2,3,4].flatMap(stars=>[{no:37,speciesId:'0037_default',id:`normal${stars}`,stars},{no:37,speciesId:'0037_alola',id:`alola${stars}`,stars}]);
const regionGroups=reader.parseOverview(['No.37\n4/4','No.37\n2/4'],regionRows);
const combined=reader.groupOverview(regionGroups);assert.equal(combined.length,1);assert.equal(combined[0].count,6);assert.equal(combined[0].total,8);assert.equal(combined[0].styleIds.length,0);
const counts=progress.merge({},combined,regionRows);assert.equal(counts[37].count,6);
assert.equal(progress.merge(counts,combined,regionRows)[37].count,6);
assert.equal(progress.progress(37,{normal1:true,normal2:true},counts,regionRows).count,6);
assert.equal(progress.progress(37,{normal1:true,normal2:true},counts,regionRows).unknown,4);
const full=reader.groupOverview(reader.parseOverview(['No.37\n4/4','No.37\n4/4'],regionRows));assert.equal(full[0].styleIds.length,8);
assert.equal(reader.groupOverview(reader.parseOverview(['No.37\n8/8','No.37\n8/8'],regionRows)).length,2);
assert.equal(Object.keys(progress.normalize({'37':{count:9,total:8}},regionRows)).length,0);
assert.equal(progress.merge(counts,[{no:37,count:2,total:4}],regionRows)[37].count,6);
assert(read('templates/core/04-backup.html').includes('sleepCounts:'));assert(read('templates/core/04-backup.html').includes('oldCounts'));
console.log('Regional 6/8 count-only persistence, full 8/8 IDs, overlapping imports, confirmed-ID deduplication and backup inclusion pass');
