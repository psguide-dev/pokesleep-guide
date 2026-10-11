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
