const assert=require('node:assert/strict'),path=require('node:path');
const {firefox}=require(process.env.PSG_PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await firefox.launch({headless:true,env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'}});try{
 const page=await b.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve(__dirname,'../review.html'));
 for(const size of ['small','medium','large','jumbo']){
  const id='0710_'+size,target='0711_'+size;
  for(const hours of [0,199,200,499,500,999,1000,1999,2000])for(const no of [710,711]){
   const row=await page.evaluate(({size,hours,no})=>{const p=PS_FORMS.resolve('0'+no+'_'+size),x={id:'size-test',no,speciesId:p.speciesId,name:p.name,level:1,nature:'まじめ',ribbonHours:hours};PS.state.box=[x];PS.state.selected=x;PS.refreshBoxDetail();PS.go('boxDetail');return {help:p.help,carry:p.carry,stats:[...document.querySelectorAll('#boxStats strong')].map(x=>x.textContent)}},{size,hours,no});
   const gain=hours>=2000?8:hours>=1000?6:hours>=500?3:hours>=200?1:0,factor=no===710?(hours>=2000?.88:hours>=500?.95:1):1;
   assert.equal(row.stats[0],Math.floor(row.help*factor).toLocaleString()+'秒');assert.equal(row.stats[1],String(row.carry+gain));
  }
  await page.evaluate(id=>{const p=PS_FORMS.resolve(id),x={id:'retain-size',no:710,speciesId:id,name:p.name,level:1,nature:'まじめ',favorite:true};PS.state.box=[x];PS.state.selected=x;PS.refreshBoxDetail();PS.go('boxDetail');document.getElementById('boxEditor').open=true},id);
  assert.deepEqual(await page.locator('#boxEditEvolution option').evaluateAll(els=>els.map(x=>x.value)),[id,target]);
  await page.locator('#boxEditEvolution').selectOption(target);await page.evaluate(()=>document.getElementById('boxEditForm').requestSubmit());assert.equal(await page.evaluate(()=>PS.state.box[0].speciesId),target);assert.equal(await page.evaluate(()=>PS.state.box[0].id),'retain-size');
  await page.evaluate(id=>openDexCard(id),id);await page.locator(`#detailEvolution [data-evo-species="${target}"] .psg-evo-open`).click();assert.equal(await page.locator('.psg-dex-costume').inputValue(),target);
 }
 for(const [origin,target,item] of [['0037_alola','0038_alola','こおりのいし'],['0194_paldea','0980_default',null]]){
  for(const id of [origin,target]){
   await page.evaluate(id=>openDexCard(id),id);
   const nodes=await page.locator('#detailEvolution [data-evo-species]').evaluateAll(els=>els.map(el=>el.dataset.evoSpecies));
   assert.deepEqual(nodes,[origin,target],`${id}: complete family without normal-form mixing`);
   assert.equal(await page.locator('#detailEvolution .psg-evo-edge').count(),1);
   if(item)assert.equal(await page.locator('#detailEvolution .psg-evo-items').getAttribute('aria-label'),item);
   else assert.ok((await page.locator('#detailEvolution').innerText()).includes('Lv.15'));
  }
 }
 await page.evaluate(()=>openDexCard(475));
 assert.equal(await page.locator('#detailEvolution .psg-evo-gender').innerText(),'♂\uFE0Eのみ');
 assert.equal(await page.locator('#detailEvolution .psg-evo-gender').evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
 assert.deepEqual(errors,[]);console.log('4 sizes × 2 species × 9 ribbon boundaries; same-size Box/Dex evolution and individual ID preserved');
}finally{await b.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
