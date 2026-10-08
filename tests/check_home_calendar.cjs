const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('review.html','utf8');
const script=html.match(/<script id="psg-home-calendar">([\s\S]*?)<\/script>/)[1];
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.events={};this.open=false;this.textContent=''}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(key,value){this.attrs[key]=value}
 addEventListener(key,fn){this.events[key]=fn}
}
function setup(instant){
 class Clock extends Date{constructor(...args){super(...(args.length?args:[instant]))}}
 const hosts={};const document={getElementById:id=>hosts[id]??=new Node('div'),createElement:tag=>new Node(tag)};
 vm.runInNewContext(script,{window:{},Date:Clock,Intl,document});return hosts;
}
const cells=h=>h.gameCalendar.children.filter(n=>n.dataset.date),entries=n=>n.children.filter(c=>c.className==='psg-update-entry');
const h=setup('2026-10-07T23:42:00Z');
assert.equal(cells(h).length,21);assert.equal(cells(h)[0].dataset.date,'2026-09-28');assert.equal(cells(h).at(-1).dataset.date,'2026-10-18');
assert.deepEqual(h.gameCalendar.children.slice(0,7).map(n=>n.textContent),['月','火','水','木','金','土','日']);
assert.equal(cells(h).filter(n=>n.className.includes('is-focus-week')).length,7);
assert.equal(cells(h).find(n=>n.className.includes('is-today')).dataset.date,'2026-10-08');
assert.equal(cells(h).find(n=>n.className.includes('is-today')).attrs['aria-current'],'date');
assert.equal(h.gameEvents.children.length,1);assert.equal(h.calendarToday.hidden,true);
h.calendarNext.onclick();assert.equal(cells(h)[0].dataset.date,'2026-10-05');assert.equal(h.calendarToday.hidden,false);
h.calendarPrev.onclick();assert.equal(cells(h)[0].dataset.date,'2026-09-28');
h.calendarPrev.onclick();assert.equal(cells(h)[0].dataset.date,'2026-09-21');
h.calendarToday.onclick();assert.equal(cells(h)[0].dataset.date,'2026-09-28');assert.equal(h.calendarToday.hidden,true);
const year=setup('2025-12-31T15:01:00Z');assert.equal(cells(year)[0].dataset.date,'2025-12-22');assert.equal(cells(year).at(-1).dataset.date,'2026-01-11');
const sunday=setup('2026-10-11T14:59:00Z');assert.equal(cells(sunday)[0].dataset.date,'2026-09-28');
const monday=setup('2026-10-11T15:00:00Z');assert.equal(cells(monday)[0].dataset.date,'2026-10-05');
const leap=setup('2024-02-28T23:00:00Z');assert(cells(leap).some(n=>n.dataset.date==='2024-02-29'));
const visible=entries(h.homeUpdates);assert.equal(visible.length,3);assert.equal(visible[0].children[0].children[0].textContent,'v452');
const history=h.homeUpdates.children.find(n=>n.tagName==='DETAILS');assert(history);assert.equal(history.open,false);assert.equal(entries(history).length,0);
history.open=true;history.events.toggle();const all=[...visible,...entries(history)];assert.equal(all.length,40);assert.equal(new Set(all.map(n=>n.children[0].children[0].textContent)).size,40);
assert.deepEqual([...new Set(all.map(n=>n.children[0].children[2].textContent))].sort(),['データ・情報','機能・計算','画像','表示・軽量化'].sort());
history.open=false;history.events.toggle();history.open=true;history.events.toggle();assert.equal(entries(history).length,37);
console.log('Home: 21 days, Monday weeks, JST rollover, year/leap boundaries, week navigation, three visible updates and lazy categorized history passed');
