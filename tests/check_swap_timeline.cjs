const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{Worker:NodeWorker}=require('node:worker_threads');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const engine=read('review.html').match(/<script id="psg-special-skill-engine">([\s\S]*?)<\/script>/)[1];
const ctx={window:{},structuredClone,console,DOMException,AbortController};vm.createContext(ctx);vm.runInContext(engine,ctx);vm.runInContext(require('./daily_kernel.cjs'),ctx);
vm.runInContext(read('templates/core/02-team.html').split('function normalizeTeam')[0]+read('templates/team/07-swap-comparison.html')+read('templates/team/08-swap-worker.html'),ctx);
ctx.box=Array.from({length:7},(_,i)=>({id:'m'+i,no:i+1,name:'member'+i,level:1,skillLevel:6}));
ctx.catalog={pokemon:Object.fromEntries(ctx.box.map((x,i)=>[x.no,{no:x.no,type:'ノーマル',berry:'berry',specialty:'スキル',mainSkillId:'normal',ingredientSlots:[{unlock:1,candidates:[{name:i===0?'tomato':'coffee',qty:2}]}]}])),berries:{berry:10},skills:{normal:{id:'normal',name:'normal',effectType:'fixed_energy',maxLevel:1,levels:{1:{energy:100}}}}};
ctx.teamSpeedContext=ids=>({members:new Map(ids.map(id=>[id,{speed:ids.includes('m5')?3000:3600,carry:20,food:50,berryQty:1,skill:0,energyFactor:1}]))});
ctx.request={ids:['m0','m1','m2','m3','m4'],box:ctx.box,catalog:ctx.catalog,interval:2,energy:30,camp:false,meals:3,favorites:['berry'],areaBonus:80,zones:{},energies:{m5:150,m6:30},demand:{coffee:300,tomato:20}};
const snapshot=JSON.stringify(ctx.request),run=(exchange=null)=>{ctx.exchange=exchange;return vm.runInContext('dailyTimedForecast(request,exchange)',ctx)};
const baseline=run(),short=run({outgoing:'m0',id:'m5',hours:2}),long=run({outgoing:'m0',id:'m5',hours:24});
assert(short.foods.get('tomato')>0);assert.equal(long.foods.get('tomato')||0,0);assert(short.foods.get('coffee')>baseline.foods.get('coffee'));
assert.equal(short.trace[0].ids[0],'m5');assert.equal(short.trace[1].ids[0],'m0');assert(short.trace[0].members.every(m=>m.pendingHelpSeconds>0));
const returning=short.members.find(m=>m.id==='m0');assert(returning.energy>=0&&returning.normalHelps>0);
assert.notEqual(short.foods.get('coffee')-baseline.foods.get('coffee'),(long.foods.get('coffee')-baseline.foods.get('coffee'))/12,'No daily/24 proportional estimate');
assert.deepEqual(Array.from(vm.runInContext('dailySwapDurationPoints(4)',ctx)),[4,8,12,16,24]);assert(run({outgoing:'m0',id:'m5',hours:3}).missing);
assert.equal(JSON.stringify(ctx.request),snapshot,'No input mutation');
// Recovery feedback and fixed zones remain active with timed exchange.
ctx.catalog.pokemon[7].mainSkillId='healing_pulse_energy_cheer_s';ctx.catalog.skills.healing_pulse_energy_cheer_s={id:'healing_pulse_energy_cheer_s',name:'healing',effectType:'reference_only',maxLevel:6,levels:{6:{}}};
ctx.teamSpeedContext=ids=>({members:new Map(ids.map(id=>[id,{speed:3600,carry:100,food:50,berryQty:1,skill:id==='m6'?100:0,energyFactor:1}]))});
const healed=run({outgoing:'m4',id:'m6',hours:8});assert(healed.members.some(m=>m.specialRecoveryNet>0));
// A continuing caster keeps its discrete state through return and later collections.
ctx.catalog.pokemon[1].mainSkillId='disguise_berry_burst';ctx.catalog.skills.disguise_berry_burst={id:'disguise_berry_burst',name:'disguise',effectType:'reference_only',maxLevel:6,levels:{6:{}}};
ctx.request.interval=1;ctx.request.energy=0;ctx.request.meals=0;
ctx.teamSpeedContext=ids=>({members:new Map(ids.map(id=>[id,{speed:3600,carry:100,food:0,berryQty:1,skill:id==='m0'?100:0,energyFactor:1}]))});
const stateful=run({outgoing:'m4',id:'m5',hours:8}),caster=stateful.members.find(m=>m.id==='m0'),states=stateful.states.get('m0');
assert(Math.abs([...states.values()].reduce((n,s)=>n+s.probability,0)-1)<1e-9);
assert(Math.abs([...states.values()].filter(s=>s.eligible).reduce((n,s)=>n+s.probability,0)-.8**caster.skillTriggers)<1e-9,'Disguise does not reset at collection or team return');
// Stockpile's state distribution and reward continue across collection boundaries.
ctx.catalog.pokemon[1].mainSkillId='stockpile_energy_charge_s';ctx.catalog.skills.stockpile_energy_charge_s={id:'stockpile_energy_charge_s',name:'stockpile',effectType:'reference_only',maxLevel:6,levels:{6:{}}};
const stocked=run();ctx.sharedIds=ctx.request.ids;
const ledger=vm.runInContext('dailyBaseline(sharedIds,box,catalog,1,0,false,0,["berry"],80)',ctx);
assert(Math.abs(stocked.skillEnergy-ledger.skillEnergy)<1e-7,'Stockpile state persists instead of resetting every collection');
// Exercise the exact generated Worker program in a real isolated thread.
const blobs=new Map();let seq=0;
ctx.Blob=class{constructor(parts){this.source=parts.join('')}};
ctx.URL={createObjectURL(blob){const id=String(++seq);blobs.set(id,blob.source);return id},revokeObjectURL(id){blobs.delete(id)}};
ctx.document={getElementById:()=>({textContent:engine})};
ctx.Worker=class{constructor(id){this.thread=new NodeWorker("const {parentPort}=require('node:worker_threads');const self={postMessage:data=>parentPort.postMessage(data)};\n"+blobs.get(id)+"\nparentPort.on('message',data=>self.onmessage({data}));",{eval:true});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.message}));}postMessage(data){this.thread.postMessage(data)}terminate(){this.thread.terminate()}};
(async()=>{
 ctx.teamSpeedContext=ids=>({members:new Map(ids.map(id=>[id,{speed:3600,carry:100,food:50,berryQty:1,skill:0,energyFactor:1}]))});
 const direct=run();ctx.request.demand.coffee=direct.foods.get('coffee')+.5;ctx.request.demand.tomato=100;
 const controller=new AbortController();ctx.signal=controller.signal;const worker=vm.runInContext('createSwapWorker(signal)',ctx),request=vm.runInContext('swapWorkerRequest(request)',ctx);
 try{const result=await worker.call({kind:'init',request});assert.equal(result.foods.get('coffee'),run().foods.get('coffee'));
 const proposal=await worker.call({kind:'pair',outgoing:'m0',id:'m5',focus:'coffee',baseline:result});assert(proposal.focusMet);assert.equal(proposal.hours,1);assert(proposal.foods.tomato.deficit>0,'Target food reached is not a claim that the whole recipe is ready');
 controller.abort();await assert.rejects(worker.call({kind:'pair'}),e=>e.name==='AbortError');
 }finally{worker.close()}
 console.log('Timed exchange: return, outgoing loss, help carry, nonlinear production, recovery, persistent disguise, no mutation, real Worker and cancellation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
