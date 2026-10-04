const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {firefox}=require(process.env.PSG_PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await firefox.launch({headless:true,env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'}});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve(__dirname,'../review.html'));
 const bindings=await page.evaluate(()=>PS_IMAGE_FILES.sleepStylesBySpecies);
 assert.ok(Object.values(bindings).reduce((n,b)=>n+Object.keys(b).length,0)>900);
 const forms=await page.evaluate(()=>[...PS_FORMS.records.values()].map(p=>({id:p.speciesId,styles:p.sleepStyles})));
 for(const p of forms)for(const s of p.styles)assert.equal(s.image,bindings[p.id]?.[s.id]||null);
 assert.equal(Object.keys(bindings['0025_halloween_23']).length,2);assert.equal(Object.keys(bindings['0025_halloween_24']).length,2);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  for(const id of [1,25,132,'0025_holiday','0037_alola','0150_default','0849_low_key','0710_medium']){
   await page.evaluate(id=>openDexCard(id),id);await page.locator('[data-v12tab="sleep"]').click();
   const photos=page.locator('.psg-sleep-photo img');
   await photos.evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>{img.loading='eager';return img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})}));});
   if(id!=='0710_medium')assert.ok(await photos.count()>0,`photos ${id}`);
   assert.ok(await photos.evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===390&&id===1)await page.screenshot({path:'/tmp/psg277-sleep.png'});
   if(id==='0710_medium')assert.equal(await photos.count(),4);
  }
 }
 await page.evaluate(()=>openDexCard(1));await page.locator('[data-v12tab="sleep"]').click();
 await page.locator('.psg-sleep-toggle').first().click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('psg-sleep-discoveries-v1'))['0001_01']),true);
 await page.reload();await page.evaluate(()=>openDexCard(1));await page.locator('[data-v12tab="sleep"]').click();
 assert.equal(await page.locator('.psg-sleep-toggle').first().getAttribute('aria-pressed'),'true');
 await page.locator('.psg-sleep-toggle').first().click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('psg-sleep-discoveries-v1'))['0001_01']),undefined);
 assert.deepEqual(errors,[]);console.log('Current connected sleep artwork; real decoded photos; 320/390/768px; discovery persistence passed');
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
