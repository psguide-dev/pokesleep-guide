const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),retired=JSON.parse(fs.readFileSync(path.join(root,'data-import/retired-pokemon-images-v352.json')));
assert.equal(retired.images.length,1165);
const received=JSON.parse(fs.readFileSync(path.join(root,"data-import/received-v506/manifest.json")));
assert.equal(received.retired.length,128);
const ui=JSON.parse(fs.readFileSync(path.join(root,'data-import/retired-ui-images-v545.json')));
assert.equal(ui.images.length,12);
retired.images.push(...received.retired,...ui.images);
for(const row of retired.images)assert(!fs.existsSync(path.join(root,row.path)),`retired file returned: ${row.path}`);
const scripts=[...fs.readFileSync(path.join(root,'review.html'),'utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const c={window:{},console};vm.createContext(c);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','// Resolve form identity'])vm.runInContext(scripts.find(s=>s.includes(marker)),c);
const removed=new Set(retired.images.map(r=>r.path));
const check=x=>{if(typeof x==='string'&&/^(assets|master)\/.*\.(webp|png|jpe?g|svg)$/.test(x)){
 assert(!removed.has(x),`retired reference remains: ${x}`);assert(fs.existsSync(path.join(root,x)),`missing active image: ${x}`);
}else if(x&&typeof x==='object')Object.values(x).forEach(check)};
check(c.window.PS_IMAGE_FILES);
for(const row of received.images)for(const binding of row.bindings)assert.equal(c.window.PS_IMAGE_FILES[binding.kind][binding.key],row.path);
for(const no of [590,591]){const p=c.window.PS_FORMS.resolve(`${String(no).padStart(4,'0')}_default`);assert(p.faceImage.includes('received-v506'));assert(p.image.includes('biblo-v347'));}
for(const p of [...Object.values(c.window.PS_CATALOG.pokemon),...c.window.PS_FORMS.records.values()]){
 assert(p.image&&p.faceImage,`${p.name}: current face/body missing`);check(p.image);check(p.faceImage);
}
for(const sid of ['0590_default','0591_default']){
 const p=c.window.PS_FORMS.resolve(sid);assert.equal(p.boxEligible,true);
 const pending=c.window.PS_CATALOG.pendingSleepArtwork[sid];assert.equal(pending.length,4);pending.forEach(r=>check(r.image));
}
console.log('1305 retired paths absent; every runtime image exists; all current faces/bodies and 8 pending Foongus-family sleep images preserved');
