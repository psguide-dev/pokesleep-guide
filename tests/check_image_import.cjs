const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(read('templates/import/01-image-reader.html').replace(/^<script[^>]*>\n/,'').replace(/<\/script>\s*$/,''),ctx);
const reader=ctx.window.PS_IMAGE_READER,dictionary={species:[{no:1,name:'フシギダネ'},{no:4,name:'ヒトカゲ'},{no:25,name:'ピカチュウ'},{no:25,name:'ピカチュウ（ホリデー）',speciesId:'0025_holiday'}],natures:['いじっぱり','ひかえめ'],subskills:['きのみの数S','おてつだいスピードM','食材確率アップM','スキル確率アップS','最大所持数アップL'],levels:[10,25,50,70,80]};
const parsed=reader.parse('フシギダネ\nLv. 35\nRP 1200\nメインスキル\n食材ゲットS\nLv. 3\nサブスキル\nLv.10 きのみの数 S\nLv.25\nおてつだいスピード M\nLv.50 食材確率アップ M\nLv.70 スキル確率アップ S\nLv.80 最大所持数アップ L\nせいかく\nいじっぱり',dictionary);
assert.equal(parsed.speciesId,'0001_default');assert.equal(parsed.level,35);assert.equal(parsed.skillLevel,3);assert.equal(parsed.nature,'いじっぱり');
assert.deepEqual(Array.from(parsed.subskills),dictionary.subskills);
const nickname=reader.parse('わがやのエース\nLv. 62\nRP 2,345\nサブスキル\nLv.10\nきのみの数S\nLv.25\nおてつだいスピードM',dictionary);
assert.equal(nickname.speciesId,null);assert.equal(nickname.level,62);
const cropped=reader.parse('サブスキル\nLv.10 きのみの数S\nLv.25 おてつだいスピードM\nメインスキル\nLv.4',dictionary);
assert.equal(cropped.level,null);assert.equal(cropped.skillLevel,4);
assert.equal(reader.parse('食材\nLv.30\nLv.60',dictionary).level,null,'unlock levels never become individual level');
assert.equal(reader.parse('ピカチュウ（ホリデー）\nLv.20',dictionary).speciesId,'0025_holiday');
assert.equal(reader.parse('ピカチュウ大好き\nLv.20',dictionary).speciesId,null,'no substring species guesses');
const unassigned=reader.parse('サブスキル\n食材確率アップM\n最大所持数アップL',dictionary);
assert.equal(unassigned.subskills.every(x=>x===null),true);assert.equal(unassigned.candidates.length,2);
const conflict=reader.merge([parsed,reader.parse('ヒトカゲ\nLv.30\n性格:ひかえめ\nサブスキル\nLv.10 スキル確率アップS',dictionary)]);
assert.equal(conflict.speciesId,null);assert.equal(conflict.level,null);assert.equal(conflict.nature,null);assert.equal(conflict.subskills[0],null);
assert.ok(conflict.conflicts.includes('ポケモン'));assert.equal(parsed.level,35,'merging does not mutate source');
const two=reader.merge([parsed,reader.parse('性格:いじっぱり',dictionary)]);assert.equal(two.level,35);assert.equal(two.nature,'いじっぱり');
const combined=reader.parse('Lv.35 フシギダネ\nLv.60\nメインスキル・サブスキル\n食材ゲットS\nLv.3',dictionary,[{kind:'nature',text:'いじっぱり'},...dictionary.subskills.map((text,index)=>({kind:'subskill',index,text}))]);
assert.equal(reader.parse('',{...dictionary,subskills:['おてつだいボーナス']},[{kind:'subskill',index:0,text:'おてつだいボポーナス'}]).subskills[0],'おてつだいボーナス');
assert.equal(reader.parse('',dictionary,[{kind:'subskill',index:0,text:'スキル確率アップM'}]).subskills[0],null,'never replace an S/M/L grade');
assert.equal(reader.parse('おてつだいボポーナス',{...dictionary,subskills:['おてつだいボーナス']}).subskills[0],null,'approximate names require a located card');
assert.equal(combined.speciesId,'0001_default');assert.equal(combined.level,35);assert.equal(combined.skillLevel,3);assert.equal(combined.nature,'いじっぱり');assert.deepEqual(Array.from(combined.subskills),dictionary.subskills);
// Same two-column layout as the game: unlocked cards retain colored backgrounds,
// locked cards do not. Their positions come from the validated grid, not Lv text.
const pixels=new Uint8ClampedArray(480*1040*4).fill(255);
function rectangle(x,y,w,h,color){for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)pixels.set([...color,255],4*(row*480+col))}
rectangle(24,365,430,26,[30,210,90]);rectangle(24,815,430,26,[30,210,90]);
rectangle(36,565,188,44,[250,235,140]);rectangle(255,565,188,44,[195,235,255]);rectangle(36,643,188,44,[195,235,255]);
const regions=reader.regionsFromPixels(pixels,480,1040);assert.equal(regions.filter(r=>r.kind==='subskill').length,5);assert.ok(regions.some(r=>r.kind==='nature'));assert.ok(regions.some(r=>r.kind==='main'));
assert.equal(regions.find(r=>r.index===4).y,717);assert.equal(reader.regionsFromPixels(new Uint8ClampedArray(480*1040*4).fill(255),480,1040).length,0,'no grid guessed on a different screenshot');
// Exercise the production save validation with catalog-backed options, without touching storage.
const p={no:1,name:'フシギダネ',specialty:'食材',ingredientSlots:[{unlock:1,candidates:[{name:'あまいミツ'}]},{unlock:30,candidates:[{name:'あまいミツ'},{name:'あんみんトマト'}]}],mainSkillId:'food'};
const saveCtx=vm.createContext({boxCatalog:()=>[p],speciesKey:x=>x.speciesId||`${String(x.no).padStart(4,'0')}_default`,MAX_POKEMON_LEVEL:70,SUBSKILL_LEVELS:dictionary.levels,SUBSKILL_NAMES:dictionary.subskills,NATURE_EFFECTS:{いじっぱり:{}},defaultIndividualRole:()=> '食材',window:{PS_CATALOG:{skills:{food:{maxLevel:7}}}}});
const actions=read('templates/box/07-image-import.html');vm.runInContext(actions.slice(actions.indexOf('function validatedImageIndividual'),actions.indexOf('imageForm.onsubmit=')),saveCtx);
const values={level:'35',skillLevel:'3',nature:'いじっぱり','food-1':'あまいミツ','food-30':'あんみんトマト','sub-0':'きのみの数S'};
const check=override=>saveCtx.validatedImageIndividual({get:name=>({...values,...override})[name]??null},p);
const valid=check({}).value;assert.equal(valid.level,35);assert.equal(valid.subskills.length,5);assert.equal(valid.ingredients[30],'あんみんトマト');assert.equal(valid.mint,false);
assert.ok(check({'sub-1':'きのみの数S'}).error);assert.ok(check({'food-60':'あまいミツ'}).error);assert.ok(check({level:''}).error);assert.ok(check({level:'71'}).error);assert.ok(check({skillLevel:''}).error);assert.ok(check({nature:'<script>alert(1)</script>'}).error);
assert.equal(check({nature:''}).value.nature,'','unknown nature stays unknown');
assert.match(actions,/commitBox\(\[\.\.\.state\.box,item\]\)/,'save appends, never replaces an existing individual');
assert.match(actions,/token!==imageEpoch/,'cancelled runs cannot publish stale results');
assert.match(actions,/worker\.terminate/,'worker is released');
console.log('Image import: field/slot parsing, nickname/manual species, unlock isolation, unassigned candidates, conflicts, forms, validation, append-only save and stale-job guards passed.');
// Actual submit handler: failed persistence leaves the review and existing individuals intact.
let succeed=false,submitted=null,closed=0,opened=0;
const original=[{id:'existing',level:60}],messages={textContent:''};
Object.assign(saveCtx,{imageForm:{hidden:false},imageBusy:false,FormData:class{get(name){return values[name]??null}},imageSpecies:()=>p,state:{box:original},document:{getElementById:()=>messages},globalThis:{crypto:{randomUUID:()=> 'new-id'}},commitBox:next=>{submitted=next;return succeed},boxUndoPanel:{},closeBoxAdd(){},boxSearch:{},imageDialog:{close(){closed++}},openBox(){opened++}});
vm.runInContext(actions.slice(actions.indexOf('imageForm.onsubmit=')),saveCtx);
saveCtx.imageForm.onsubmit({preventDefault(){}});assert.equal(submitted.length,2);assert.equal(submitted[0],original[0]);assert.equal(original.length,1);assert.equal(closed,0);assert.match(messages.textContent,/保存できません/);
succeed=true;saveCtx.imageForm.onsubmit({preventDefault(){}});assert.equal(submitted[1].id,'new-id');assert.equal(closed,1);assert.equal(opened,1);
// Cancellation while worker initialization is pending: the late worker must be terminated.
(async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:false,disabled:false,addEventListener(){},elements:{species:{}}});return nodes.get(id)};
 node('boxImageFiles').files=[{name:'screenshot.png'}];
 let resolveWorker,workerStarted,terminated=0;
 const started=new Promise(resolve=>{workerStarted=resolve});
 const pendingWorker=new Promise(resolve=>{resolveWorker=resolve});
 const cancelCtx=vm.createContext({document:{getElementById:node},window:{PS_IMAGE_READER:{loadEngine:async()=>({createWorker:()=>{workerStarted();return pendingWorker}})}},setTimeout:()=>1,clearTimeout(){},SUBSKILL_LEVELS:dictionary.levels});
 vm.runInContext(actions,cancelCtx);
 const run=node('boxImageRead').onclick();await started;
 node('boxImageStop').onclick();resolveWorker({terminate:async()=>{terminated++}});await run;
 assert.equal(terminated,1);assert.equal(node('boxImageRead').disabled,false);assert.match(node('boxImageStatus').textContent,/中止/);assert.equal(node('boxImageForm').hidden,true);
 console.log('Production submit/cancel: append preserves prior individuals, save failure retains review, confirmed save opens new detail, cancelled initialization releases late worker.');
})().catch(error=>{console.error(error);process.exitCode=1});
