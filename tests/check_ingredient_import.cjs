const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),ctx={window:{}};vm.createContext(ctx);
vm.runInContext(read('templates/import/03-ingredient-reader.html').replace(/^<script[^>]*>/,'').replace(/<\/script>\s*$/,''),ctx);
const reader=ctx.window.PS_INGREDIENT_READER,refs=JSON.parse(read('assets/import/ingredient-fingerprints.json'));
assert.equal(refs.length,18);assert.equal(new Set(refs.map(r=>r.name)).size,18);
for(const ref of refs){assert.equal(ref.values.length,1024);assert.ok(ref.values.every(v=>Number.isInteger(v)&&v>=0&&v<=255));}
// Another Pokémon's screenshot, excluded from the references, at three widths.
for(const sample of JSON.parse(read('tests/fixtures/ingredient-heldout.json')))assert.equal(reader.choose(sample.values,refs),sample.name,`${sample.source} width ${sample.width}`);
assert.equal(reader.choose(null,refs),null);assert.equal(reader.choose(new Array(1024).fill(0),refs),null);
assert.equal(reader.choose(refs[0].values,[refs[0],{...refs[0],name:'別候補'}]),null,'ambiguous icons stay unknown');
assert.equal(reader.locate(new Uint8ClampedArray(480*1040*4).fill(255),480,1040).length,0,'no slots guessed on another page');
const merged=reader.mergeChoices([[null,'あじわいキノコ','ふといながねぎ'],[null,'あじわいキノコ','モーモーミルク']]);
assert.equal(merged.ingredients[1],'あじわいキノコ');assert.equal(merged.ingredients[2],null);assert.equal(merged.conflicts[0],'Lv.60 食材');
assert.match(read('templates/box/07-image-import.html'),/candidates\.some\(item=>item\.name===imageFoodChoices/,'only species-valid foods are applied');
console.log('Ingredient import: held-out normal/faded icons at three sizes, blank/ambiguous rejection, species filtering and multi-image conflicts passed.');
