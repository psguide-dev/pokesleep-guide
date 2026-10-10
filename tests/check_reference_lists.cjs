const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scripts=[...fs.readFileSync('review.html','utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.textContent=''}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
}
const hosts={berryReference:new Element('div'),natureReference:new Element('div')};
const context={window:{},console,document:{createElement:tag=>new Element(tag),getElementById:id=>hosts[id]}};
vm.createContext(context);
for(const marker of ['window.PS_IMAGE_FILES = {','window.PS_CATALOG=','window.PS_SPECIALTY_IMAGES=', 'const c=window.PS_CATALOG,ref=c.infoReference'])vm.runInContext(scripts.find(s=>s.includes(marker)),context);
const find=(node,tag)=>node.children.flatMap(x=>typeof x==='object'?[...(x.tag===tag?[x]:[]),...find(x,tag)]:[]);
for(const [page,host,count] of [['berryPage','berryReference',18],['naturePage','natureReference',25]]){
 context.window.PS_PAGE_RENDERERS[page]();
 const table=find(hosts[host],'table')[0],body=find(table,'tbody')[0];assert.equal(body.children.length,count);
 context.window.PS_PAGE_RENDERERS[page]();assert.equal(find(hosts[host],'table').length,host==='berryReference'?1:2);
}
for(const img of find(hosts.berryReference,'img'))assert(img.src&&fs.existsSync(img.src),'missing berry artwork');
const natureRows=find(find(hosts.natureReference,'table')[0],'tbody')[0].children;
assert.equal(natureRows.filter(tr=>tr.children.some(td=>td.textContent==='補正なし')).length,5);
const receipt=JSON.parse(fs.readFileSync('data-import/reference-v544/ui-receipt.json'));
for(const [kind,key] of Object.entries(receipt.sharedSpecialties))assert.equal(context.window.PS_SPECIALTY_IMAGES[kind],context.window.PS_IMAGE_FILES.ui[key]);
console.log('18 berry rows, 25 nature rows, repeat rendering, artwork and all 4 specialty bindings verified');
