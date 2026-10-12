const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('templates/00-moon-status.html','utf8').replace(/<\/?script[^>]*>/g,'');
const c={window:{}};vm.createContext(c);vm.runInContext(source,c);
const moon=c.window.PS_SLEEP_MOON;
for(const [count,total,expected] of [[0,9,'new'],[1,9,'crescent'],[3,9,'crescent'],[4,9,'quarter'],[6,9,'quarter'],[7,9,'gibbous'],[9,9,'full'],[10,9,'full'],[6,8,'gibbous'],[0,0,null],[-1,4,null],[NaN,4,null],[1,Infinity,null]])assert.equal(moon.phase(count,total),expected,`${count}/${total}`);
assert.equal(moon.labelArt('—/—'),'');assert.equal(moon.labelArt('0/0'),'');
for(const label of ['0/9','1/9','4/9','7/9','9/9']){
 const html=moon.labelArt(label),path=/src="([^"]+)"/.exec(html)[1];
 assert(fs.existsSync(path),path);assert(html.includes('alt=""'));
}
class Node{
 constructor(){this.children=[];this.attributes={};this.innerHTML='';this.textContent=''}
 append(...nodes){this.children.push(...nodes)} appendChild(node){this.append(node)}
 replaceChildren(...nodes){this.children=nodes} setAttribute(k,v){this.attributes[k]=v}
}
const storage={},sleep=new Node(),count=new Node(),tab=new Node();tab.querySelector=()=>count;
let dexRefreshes=0;
Object.assign(c,{document:{createElement:()=>new Node()},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},sleep,tabs:{querySelector:()=>tab},V:{sleepStyles:{25:[{id:'025-normal-1',stars:1,name:'まるまり寝'}]}}});
Object.assign(c.window,{addEventListener(){},PS:{renderDex(){throw Error("Full Dex rendering must not run on a moon toggle")},refreshDexSleep(no,saved){assert.equal(no,25);dexRefreshes++}},PS_SLEEP_PROGRESS:{progress(){return {count:6,total:9,unknown:6}}}});
vm.runInContext(fs.readFileSync('templates/dex/04-sleep-and-fields.html','utf8'),c);
c.renderSleepStyles({no:25,name:'ピカチュウ'});
const toggle=()=>sleep.children.find(x=>x.className==='psg-sleep-grid').children[0].children[0].children.at(-1);
assert.equal(count.textContent,'0/1','current form count ignores aggregate observations');
const originalGrid=sleep.children[0],originalToggle=toggle();
assert.equal(toggle().attributes['aria-pressed'],'false','count-only observations do not invent an individual discovery');
assert(toggle().innerHTML.includes('moon_new_64.webp'));
toggle().onclick();
assert.equal(JSON.parse(storage['psg-sleep-discoveries-v1'])['025-normal-1'],true);
assert.equal(sleep.children[0],originalGrid,'sleep photos are not rebuilt');
assert.equal(toggle(),originalToggle,'button identity and focus remain stable');
assert.equal(count.textContent,'1/1');
assert.equal(toggle().attributes['aria-pressed'],'true');assert(toggle().innerHTML.includes('moon_full_64.webp'));
toggle().onclick();
assert.deepEqual(JSON.parse(storage['psg-sleep-discoveries-v1']),{});
assert.equal(toggle().attributes['aria-pressed'],'false');assert(toggle().innerHTML.includes('moon_new_64.webp'));
assert.equal(dexRefreshes,2);
const regional=Array.from({length:4},(_,i)=>({id:`037-alola-${i+1}`,stars:i+1,name:'寝顔'}));
storage['psg-sleep-discoveries-v1']=JSON.stringify(Object.fromEntries([...regional.map(s=>s.id),...regional.map((_,i)=>`037-normal-${i+1}`)].map(id=>[id,true])));
vm.runInContext('sleepFound=readSleepFound()',c);
c.renderSleepStyles({no:37,name:'ロコン（アローラ）',detailPreviewOnly:true,sleepStyles:regional});
assert.equal(count.textContent,'4/4','8 imported discoveries are managed as 4 styles for the active form');
assert.equal(sleep.children.length,1,'no duplicate aggregate explanation');
const nav=fs.readFileSync('templates/core/05-navigation-and-filters.html','utf8');
vm.runInContext(nav.slice(nav.indexOf('function discoveryLabel('),nav.indexOf('function renderFilters(')),c);
const saved=JSON.parse(storage['psg-sleep-discoveries-v1']);
assert.equal(c.discoveryLabel({no:37,detailPreviewOnly:true,sleepStyles:regional},saved),'4/4');
delete saved[regional[0].id];delete saved[regional[1].id];
assert.equal(c.discoveryLabel({no:37,detailPreviewOnly:true,sleepStyles:regional},saved),'2/4','form progress changes independently of the imported total');

console.log('Moon phases, per-form counts and registration without card/image rebuilds verified');
