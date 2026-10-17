const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('templates/core/16-evaluation-page.html','utf8');
function fixture(url,records,saved){
 const events={},calls=[],elements={},memory={saved};
 const element=id=>elements[id]??={textContent:'',innerHTML:'',classList:{add(){}},querySelector(){return null},append(){},events:{},addEventListener(name,fn){this.events[name]=fn}};
 const state={box:records,boxFilters:{types:new Set(),ingredients:new Set(),specs:new Set(),tags:new Set()}};
 const context={URL,URLSearchParams,structuredClone,Set,location:new URL(url),history:{length:1},sessionStorage:{getItem:()=>JSON.stringify(memory.saved),setItem:(key,value)=>{memory.saved=JSON.parse(value)}},state,boxSearch:{value:''},boxEsc:String,
 document:{referrer:'',documentElement:{classList:{add(){}}},getElementById:element,addEventListener:(name,fn)=>events[name]=fn,createElement:()=>({innerHTML:'',content:{querySelector(){return null}}})},
 window:{scrollTo:(x,y)=>calls.push(['scroll',y]),addEventListener:(name,fn)=>events[name]=fn},requestAnimationFrame:fn=>fn(),
 go:id=>calls.push(['go',id]),openBox:id=>calls.push(['open',id]),speciesFor:()=>({specialty:'スキル'}),
 renderBerryRole:()=>'',renderSkillRole:()=>'',renderIndividualEvaluation:item=>{calls.push(['render',structuredClone(item)]);return '<p>評価</p>'},
 bindIndividualEvaluation:(host,item)=>calls.push(['bind',structuredClone(item)]),renderIndividualEvaluationDetails:()=>''};
 vm.createContext(context);vm.runInContext(source,context);events.DOMContentLoaded();return {context,calls,elements,memory,events};
}
const item={id:'record-1',level:60,skillLevel:3,subskills:['スキル確率アップM']},before=JSON.stringify(item);
const saved={id:item.id,y:432,search:'デンリュウ',filters:{types:['でんき']},skillLevel:'80'};
const page=fixture('https://example.test/evaluation.html?individual=record-1',[item],saved);
assert.equal(page.calls.find(x=>x[0]==='render')[1].skillEvaluationLevel,80);
assert.equal(JSON.stringify(item),before,'evaluation uses a clone and leaves registered values intact');
assert(page.calls.some(x=>x[0]==='go'&&x[1]==='individualEvaluationPage'));
const returned=fixture('https://example.test/review.html?screen=box&restore=evaluation',[item],saved);
assert(returned.calls.some(x=>x[0]==='open'&&x[1]===item.id));
assert(returned.calls.some(x=>x[0]==='scroll'&&x[1]===432));
assert.equal(returned.context.boxSearch.value,'デンリュウ');assert(returned.context.state.boxFilters.types.has('でんき'));
const missing=fixture('https://example.test/evaluation.html?individual=missing',[],null);
assert(missing.elements.individualEvaluationContent.textContent.includes('見つかりません'));
assert(fs.existsSync('evaluation.html'));assert(fs.readFileSync('.github/workflows/build-review.yml','utf8').includes('cp evaluation.html public/'));
console.log('Evaluation page: cloned inputs, evaluation level, individual/filter/scroll return and missing-record recovery passed');

const host=page.elements.individualEvaluationContent;host.querySelector=selector=>selector==='.psg-skill-eval-level'?{value:'70'}:null;host.events.change({target:{matches:()=>true}});assert.equal(page.memory.saved.skillLevel,'70');assert.equal(page.memory.saved.search,saved.search);assert.equal(page.memory.saved.y,432);assert.equal(JSON.stringify(item),before);
const reloaded=fixture('https://example.test/evaluation.html?individual=record-1',[item],page.memory.saved);assert.equal(reloaded.calls.find(x=>x[0]==='render')[1].skillEvaluationLevel,70,'comparison level survives reload without changing registered level');
page.events['psg-camp-change']();assert.equal(page.calls.filter(x=>x[0]==='render').at(-1)[1].skillEvaluationLevel,70,'camp refresh retains selected comparison level');
console.log('Evaluation comparison levels: session-only save, reload, return metadata and camp refresh passed');

// The level row lives inside the role panel, so asynchronous replacement never detaches controls.
const overview=fixture('https://example.test/review.html?screen=box',[],null);
let controls=null,insertCount=0;
const label={before(node){controls=node},parentElement:null};
const makeControl=()=>({className:'',entry:null,children:[],append(child){this.children.push(child);child.parentElement=this},querySelector(selector){return selector==='.psg-evaluation-page-link'?this.entry:null},insertAdjacentHTML(position,html){insertCount++;const attributes={href:html.match(/href="([^"]+)"/)[1]};this.entry={parentElement:this,getAttribute:key=>attributes[key],setAttribute:(key,value)=>{attributes[key]=value},remove:()=>{this.entry=null}}}});
overview.context.document.createElement=makeControl;
const panel={querySelector(selector){return selector==='label'?label:selector==='.psg-role-evaluation-controls'?controls:null}};
const overviewHost={querySelector(selector){return selector.includes('.psg-food-role')?panel:null},querySelectorAll(){return controls?.entry?[controls.entry]:[]},prepend(node){controls=node}},species={ingredientSlots:[{unlock:1}]};
overview.context.placeEvaluationControls(overviewHost,{id:'first'},species);const firstLink=controls.entry;
assert(controls.children.includes(label));assert.equal(label.parentElement,controls);assert.equal(controls.className,'psg-role-evaluation-controls psg-evaluation-heading');
overview.context.placeEvaluationControls(overviewHost,{id:'first'},species);assert.equal(insertCount,1);assert.equal(controls.entry,firstLink);
overview.context.placeEvaluationControls(overviewHost,{id:'second'},species);assert.equal(controls.entry,firstLink);assert.equal(firstLink.getAttribute('href'),'https://example.test/evaluation.html?individual=second');
// A replaced role panel gets one fresh row and reuses the normal host-level selection/binding path.
controls=null;overview.context.placeEvaluationControls(overviewHost,{id:'second'},species);assert.equal(insertCount,2);assert(controls.children.includes(label));
overview.context.placeEvaluationControls(overviewHost,{},species);assert.equal(controls.entry,null);
const boxTemplate=fs.readFileSync('templates/10-box-detail.html','utf8');assert(!boxTemplate.includes('<span>個体の評価</span>'));assert(!source.includes('psg-role-camp'));
console.log('Evaluation row: level replaces heading inside the live panel, repeated binding/replacement, destination updates and no camp caption passed');
