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
Object.assign(c.window,{addEventListener(){},PS:{renderDex(){dexRefreshes++}},PS_SLEEP_PROGRESS:{progress(){return {count:6,total:9,unknown:6}}}});
vm.runInContext(fs.readFileSync('templates/dex/04-sleep-and-fields.html','utf8'),c);
c.renderSleepStyles({no:25,name:'ピカチュウ'});
const toggle=()=>sleep.children.find(x=>x.className==='psg-sleep-grid').children[0].children[0].children.at(-1);
assert.equal(count.textContent,'6/9','aggregate progress remains authoritative');
assert.equal(toggle().attributes['aria-pressed'],'false','count-only observations do not invent an individual discovery');
assert(toggle().innerHTML.includes('moon_new_64.webp'));
toggle().onclick();
assert.equal(JSON.parse(storage['psg-sleep-discoveries-v1'])['025-normal-1'],true);
assert.equal(toggle().attributes['aria-pressed'],'true');assert(toggle().innerHTML.includes('moon_full_64.webp'));
toggle().onclick();
assert.deepEqual(JSON.parse(storage['psg-sleep-discoveries-v1']),{});
assert.equal(toggle().attributes['aria-pressed'],'false');assert(toggle().innerHTML.includes('moon_new_64.webp'));
assert.equal(dexRefreshes,2);
console.log('Moon phases, unknown totals, shared progress and reversible individual registration verified');
