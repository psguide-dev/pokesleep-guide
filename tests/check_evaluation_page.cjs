const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('templates/core/16-evaluation-page.html','utf8');
function fixture(url,records,saved){
 const events={},calls=[],elements={};
 const element=id=>elements[id]??={textContent:'',innerHTML:'',classList:{add(){}},querySelector(){return null},append(){}};
 const state={box:records,boxFilters:{types:new Set(),ingredients:new Set(),specs:new Set(),tags:new Set()}};
 const context={URL,URLSearchParams,structuredClone,Set,location:new URL(url),history:{length:1},sessionStorage:{getItem:()=>JSON.stringify(saved)},state,boxSearch:{value:''},boxEsc:String,
 document:{referrer:'',documentElement:{classList:{add(){}}},getElementById:element,addEventListener:(name,fn)=>events[name]=fn,createElement:()=>({innerHTML:'',content:{querySelector(){return null}}})},
 window:{scrollTo:(x,y)=>calls.push(['scroll',y]),addEventListener:(name,fn)=>events[name]=fn},requestAnimationFrame:fn=>fn(),
 go:id=>calls.push(['go',id]),openBox:id=>calls.push(['open',id]),speciesFor:()=>({specialty:'スキル'}),
 renderBerryRole:()=>'',renderSkillRole:()=>'',renderIndividualEvaluation:item=>{calls.push(['render',structuredClone(item)]);return '<p>評価</p>'},
 bindIndividualEvaluation:(host,item)=>calls.push(['bind',structuredClone(item)]),renderIndividualEvaluationDetails:()=>''};
 vm.createContext(context);vm.runInContext(source,context);events.DOMContentLoaded();return {context,calls,elements};
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
