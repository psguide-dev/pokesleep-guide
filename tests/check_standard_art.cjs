const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'data-import/picasso-standard-v340/manifest.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'review.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const c={window:{},console};vm.createContext(c);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','// Resolve form identity']){
 const script=scripts.find(s=>s.includes(marker));assert(script,marker);vm.runInContext(script,c);
}
const catalog=c.window.PS_CATALOG,forms=c.window.PS_FORMS;
assert.equal(Object.keys(catalog.pokemon).length,216);assert.equal(forms.records.size,34);
for(const [kind,bindings] of Object.entries(manifest.bindings))for(const [id,asset] of Object.entries(bindings)){
 const p=kind.endsWith('BySpecies')?forms.resolve(id):catalog.pokemon[id];
 const field=kind.includes('Faces')?'faceImage':'image';assert.equal(p[field],asset,`${kind}:${id}`);
 assert(fs.existsSync(path.join(root,asset)),asset);
}
assert.notEqual(catalog.pokemon[37].image,forms.resolve('0037_alola').image);
assert.notEqual(catalog.pokemon[194].image,forms.resolve('0194_paldea').image);
assert.notEqual(forms.resolve('0849_amped').image,forms.resolve('0849_low_key').image);
assert.notEqual(catalog.pokemon[25].image,forms.resolve('0025_captain').image);
for(const no of [710,711])for(const size of ['small','medium','large','jumbo']){
 assert.equal(forms.resolve(`${no.toString().padStart(4,'0')}_${size}`).image,forms.resolve(`${no.toString().padStart(4,'0')}_large`).image);
}
for(const no of [38,440])assert.notEqual(catalog.pokemon[no].image,catalog.pokemon[no].faceImage);
assert(!manifest.images.some(row=>row.sourceFile.includes('/shiny/')));
console.log('471 assets: generated catalog, exact form identities, size aliases and face fallback verified');
