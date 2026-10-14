const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRuntime}=require('./berry_model_runtime.cjs');const root=path.resolve(__dirname,'..');const {catalog,ctx}=createRuntime(root);
ctx.speciesKey=p=>p.speciesId||`${String(p.no).padStart(4,'0')}_default`;
for(const f of ['templates/00-standard-evaluation.html','templates/core/13-individual-simple.html','templates/core/14-berry-role.html'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8').replace(/<\/?script[^>]*>/g,''),ctx);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/evaluation/berry_model_refs_v5.json'))),p=catalog.pokemon[85];
const sample={id:'dodrio',no:85,level:51,berryEvaluationLevel:70,skillLevel:2,ribbonHours:0,nature:'がんばりや',subskills:['きのみの数S','おてつだいスピードS','スキル確率アップM','おてつだいスピードM','おてつだいボーナス'],ingredients:{1:'ワカクサ大豆',30:'リラックスカカオ',60:'マメミート'}};
function hostFor(item){const host={html:ctx.renderIndividualEvaluation(item,p),level:{value:'70'},skill:{value:'2'},result:{innerHTML:''},retry:{},attached:true};host.panel={};Object.defineProperty(host.panel,'outerHTML',{set(html){host.html=html}});host.querySelector=s=>({'.psg-berry-role':host.panel,'.psg-berry-level':host.level,'.psg-berry-skill-level':host.html.includes('psg-berry-skill-level')?host.skill:null,'.psg-berry-detail-result':host.result,'.psg-berry-retry':host.html.includes('psg-berry-retry')?host.retry:null}[s]||null);host.contains=element=>host.attached&&element===host.panel;return host;}
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
(async()=>{let fetches=0;ctx.fetch=async()=>{fetches++;return {ok:true,json:async()=>data}};
const host=hostFor(sample),stored=JSON.stringify(sample);ctx.bindIndividualEvaluation(host,sample,p);await settle();assert(host.html.includes('理想個体の'));assert.equal(fetches,1);
const main=host.html.split('<details')[0];host.skill.value='6';host.skill.onchange();assert(host.result.innerHTML.includes('スキルLv.6'));assert.equal(host.html.split('<details')[0],main);assert.equal(JSON.stringify(sample),stored);
host.level.value='80';host.level.onchange();assert(host.html.includes('Lv.80・予測'));assert(host.html.includes('value="2" selected'));assert.equal(fetches,1);
vm.runInContext('berryModelLoading=null;berryModelError=null;window.PS_BERRY_MODEL_DATA=null;',ctx);ctx.fetch=async()=>({ok:false});const failed=hostFor(sample);ctx.bindIndividualEvaluation(failed,sample,p);await settle();assert(failed.html.includes('再読込'));
ctx.fetch=async()=>({ok:true,json:async()=>data});failed.retry.onclick();await settle();assert(failed.html.includes('理想個体の'));
vm.runInContext('berryModelLoading=null;berryModelError=null;window.PS_BERRY_MODEL_DATA=null;',ctx);let release;ctx.fetch=()=>new Promise(resolve=>release=resolve);const detached=hostFor(sample);ctx.bindIndividualEvaluation(detached,sample,p);detached.attached=false;const before=detached.html;release({ok:true,json:async()=>data});await settle();assert.equal(detached.html,before);
console.log(JSON.stringify({interactionChecksPassed:11,method:'unit DOM doubles; not a visual browser test'}));})().catch(e=>{console.error(e);process.exit(1)});
