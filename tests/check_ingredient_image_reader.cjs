const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('templates/import/03-ingredient-reader.html','utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const reader=ctx.window.PS_INGREDIENT_READER,refs=JSON.parse(fs.readFileSync('assets/import/ingredient-fingerprints.json'));
for(const p of JSON.parse(fs.readFileSync('tests/fixtures/ingredient-local-probes.json'))){const values=Array.from(Buffer.from(p.values,'base64')),allowed=refs.filter(r=>p.allowed.includes(r.name));assert.equal(reader.choose(values,allowed,true,refs),p.expected,p.source+' Lv.'+p.level);assert.equal(reader.choose(values,refs.filter(r=>!p.allowed.includes(r.name)),true,refs),null,'out-of-species references cannot invent an ingredient')}
assert.equal(reader.fingerprint(new Uint8ClampedArray(480*400*4).fill(255),480,400,{x:280,y:120,width:65,height:65}),null);
assert.equal(reader.locate(new Uint8ClampedArray(480*400*4).fill(255),480,400).length,0);
assert.equal(reader.choose(null,refs,true),null);
const pixels=new Uint8ClampedArray(480*400*4).fill(255);
const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels.set([...c,255],4*(yy*480+xx))};
rect(284,120,66,66,[255,250,220]);rect(364,121,45,65,[255,250,220]);
const boxes=reader.locate(pixels,480,400);assert.equal(boxes.length,3);assert.equal(boxes[2].width,65,'partly obscured circle uses observed height for its full width');
const merged=reader.mergeChoices([[null,'ワカクサ大豆','とくせんリンゴ'],[null,'とくせんリンゴ','とくせんリンゴ']]);assert.equal(merged.ingredients[1],null);assert(merged.conflicts.includes('Lv.30 食材'));
console.log('Six real ingredient vectors: constrained references, faded oil circle, blank/unknown and conflict guards verified');
