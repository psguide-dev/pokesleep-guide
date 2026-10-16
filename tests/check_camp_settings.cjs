const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('templates/core/08-fields.html','utf8').split('const berryChoices=')[0];
const camp=fs.readFileSync('templates/core/08-camp-settings.html','utf8');
function fixture(initial,fail=false){
 const storage=new Map(initial),nodes=new Map(),calls=[],events={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value}});return nodes.get(id)};
 const context={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('quota');storage.set(key,value)}},document:{getElementById:node,querySelectorAll:()=>[]},window:{PS_CATALOG:{cooking:{pot:{'拡張表':[{'容量':15},{'容量':81}]}},fields:{test:{mode:'expert'}}},addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>calls.push(event.type)},fieldProfile:{selectedFieldId:'test'},state:{screen:'accountPage'},Event:class{constructor(type){this.type=type}},renderTeamDay:()=>calls.push('day'),renderTeamFood:()=>calls.push('food'),go:id=>calls.push(id)};
 vm.createContext(context);vm.runInContext(source+'\n'+camp,context);
 const api=vm.runInContext('({set:setGoodCamp,get:()=>teamGoodCamp,settings:()=>({...daySettings}),pot:cookingContext})',context);
 return {context,api,storage,node,calls,events};
}
const key='psg-day-settings-v1',fresh=fixture();
assert.equal(fresh.api.get(),true,'new users default to camp ON');assert.equal(fresh.node('accountGoodCamp').value,'true');assert.equal(fresh.storage.has(key),false,'initialization does not overwrite stored data');
assert.equal(fresh.node('commonCampBasis').attributes['aria-pressed'],'true');
assert.match(fresh.node('commonCampBasis').attributes['aria-label'],/あり.*なしに切り替える/);
const saved={collectionHours:8,initialEnergy:120,goodCamp:false,meals:1,exWeeklyEffect:'berry'},other=JSON.stringify({box:['keep'],team:['keep']});
const f=fixture([[key,JSON.stringify(saved)],['unrelated',other]]);
assert.equal(f.api.get(),false,'preserve existing OFF');assert.match(f.node('accountCampBasis').textContent,/なし/);
f.api.set(true);assert.equal(f.node('teamGoodCamp').attributes['aria-pressed'],'true');assert.equal(f.node('accountGoodCamp').value,'true');assert.equal(f.node('commonCampBasis').attributes['aria-pressed'],'true');
assert.deepEqual(JSON.parse(f.storage.get(key)),{...saved,goodCamp:true});assert.equal(f.storage.get('unrelated'),other);assert(f.calls.includes('day')&&f.calls.includes('food')&&f.calls.includes('psg-cooking-settings-change'));
f.node('accountGoodCamp').onchange({target:{value:'false'}});assert.equal(f.api.get(),false);assert.equal(f.api.pot().camp,false);
assert.equal(fixture([...f.storage]).api.get(),false,'OFF survives reload');
f.context.state.screen='ingredientPage';f.node('commonCampBasis').onclick();assert.equal(f.api.get(),true);assert.equal(f.context.state.screen,'ingredientPage');assert(!f.calls.includes('accountPage'),'header toggles in place without navigating');
assert.equal(f.node('teamGoodCamp').attributes['aria-pressed'],'true');assert.equal(f.node('accountGoodCamp').value,'true');assert.equal(JSON.parse(f.storage.get(key)).goodCamp,true);assert.equal(f.storage.get('unrelated'),other);
const campEvents=f.calls.filter(name=>name==='psg-camp-change').length;f.node('commonCampBasis').onclick();assert.equal(f.api.get(),false);assert.equal(f.calls.filter(name=>name==='psg-camp-change').length,campEvents+1);assert.equal(f.node('commonCampBasis').attributes['aria-pressed'],'false');assert.match(f.node('commonCampBasis').title,/なし.*ありに切り替える/);assert.equal(fixture([...f.storage]).api.get(),false);
const broken=fixture([[key,JSON.stringify(saved)]],true);broken.api.set(true);assert.match(broken.node('accountCampSaveStatus').textContent,/保存できません/);assert.equal(JSON.parse(broken.storage.get(key)).goodCamp,false);assert.equal(broken.api.get(),true,'current display still applies selection after save failure');
assert.equal(fixture([[key,'broken json']]).api.get(),true,'invalid settings recover to the default');
console.log('Common camp settings: default ON, existing OFF, shared controls, save/reload, other settings retained, navigation and storage failure passed');

const resumed=fixture([[key,JSON.stringify({...saved,goodCamp:true})]]);resumed.storage.set(key,JSON.stringify(saved));resumed.events.pageshow({persisted:true});assert.equal(resumed.api.get(),false);assert.equal(resumed.node('commonCampBasis').attributes['aria-pressed'],'false');assert(resumed.calls.includes('psg-camp-change'));resumed.storage.set(key,JSON.stringify({...saved,goodCamp:true}));resumed.events.storage({key});assert.equal(resumed.api.get(),true);
const shell=fs.readFileSync('templates/01-shell-head.html','utf8'),header=shell.match(/<button[^>]*id="commonCampBasis"[\s\S]*?<\/button>/)[0];assert.match(header,/psg-camp-toggle/);assert.match(header,/aria-pressed="true"/);assert.match(header,/assets\/ui\/camp_tent\.png/);assert(!camp.includes('basis.textContent'),'sync must preserve the tent image');
assert(fs.readFileSync('styles/02-detail-layout.css','utf8').includes(':is(.psg-home-image-toggles button,.psg-camp-toggle)[aria-pressed="true"]'));
console.log('Header tent toggle: one click flips shared condition, no navigation, preserved records/settings, pressed/title state and team-shared styling passed');
