const assert=require('node:assert/strict'),path=require('node:path');
const {firefox}=require(process.env.PSG_PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await firefox.launch({headless:true,env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'}});try{
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'../review.html'));
  await page.evaluate(()=>PS_AUTO_ASSETS.ready);
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(await page.evaluate(()=>Object.keys(PS_CATALOG.pokemon).length),216);
  assert.equal(await page.evaluate(()=>PS_FORMS.records.size),32);
  assert.equal(await page.evaluate(()=>PS_FORMS.dexEntries.length),19);
  assert.equal(await page.evaluate(()=>PS_CATALOG.pokemon[25].help),2700);
  assert.equal(await page.evaluate(()=>PS_FORMS.resolve('0025_unknown')),null);
  for(const [no,count,kind] of [[25,5,'衣装'],[133,3,'衣装'],[363,2,'衣装'],[710,4,'サイズ'],[711,4,'サイズ']]){
   await page.evaluate(no=>openDexCard(no),no);
   const select=page.locator('.psg-dex-costume');assert.equal(await select.getAttribute('aria-label'),kind);
   assert.equal(await select.locator('option').count(),count);
   const options=await select.locator('option').evaluateAll(els=>els.map(el=>el.value));
   for(const id of options){
    await select.selectOption(id);
    const expected=await page.evaluate(id=>{const p=PS_FORMS.resolve(id);return {help:p.help,carry:p.carry,styles:p.detailPreviewOnly?p.sleepStyles.length:PS_CATALOG.sleepStyles[p.no].length,preview:!!p.detailPreviewOnly}},id);
    const stats=await page.locator('#dexDetail .psg-detail-stats').innerText();assert.ok(stats.includes(expected.help.toLocaleString()+'秒'));assert.ok(stats.includes(String(expected.carry)));
    assert.ok((await page.locator('.psg-sleep-tab-count').innerText()).endsWith('/'+expected.styles));
    assert.equal(await page.locator('#detailArt .psg-form-no-image').count(),expected.preview?1:0);
    assert.equal(await page.locator('#detailEvolution [data-evo-no]').count()>0,expected.preview?[710,711].includes(no):[25,133,363].includes(no));
    await page.evaluate(()=>PSG_REFRESH_DEX_DETAIL());assert.equal(await select.inputValue(),id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
  }
  await page.evaluate(()=>openDexCard(25));await page.locator('.psg-dex-costume').selectOption('0025_halloween_23');
  const halloween=await page.evaluate(()=>PS_FORMS.records.get('0025_halloween_23').sleepStyles.map(s=>s.id));
  assert.deepEqual(await page.evaluate(()=>PS_FORMS.records.get('0025_halloween_24').sleepStyles.map(s=>s.id)),halloween);
  assert.equal(await page.evaluate(()=>PS_CATALOG.pokemon[710]===undefined),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  await page.locator('[data-v12tab="sleep"]').click();await page.locator('#dexDetail .psg-sleep-toggle').first().click();
  await page.locator('.psg-dex-costume').selectOption('0025_halloween_24');assert.equal(await page.locator('.psg-sleep-tab-count').innerText(),'1/2');
  await page.locator('.psg-dex-costume').selectOption('0025_default');assert.equal(await page.locator('.psg-sleep-tab-count').innerText(),'0/4');
  await page.locator('.psg-dex-costume').selectOption('0025_halloween_23');await page.locator('#dexDetail .psg-sleep-toggle').first().click();
  await page.locator('[data-v12tab="ability"]').click();
  if(width===390)await page.screenshot({path:'/tmp/psg259-costume.png'});
  await page.evaluate(()=>openDexCard(710));if(width===390)await page.screenshot({path:'/tmp/psg259-size.png'});
  await page.evaluate(()=>openDexCard(1));assert.equal(await page.locator('.psg-dex-costume').count(),0);
  assert.deepEqual(errors,[]);console.log(width+'px: all 5 groups / 15 variants, separate stats/sleep, refresh preserved, no storage mutation, no overflow');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
