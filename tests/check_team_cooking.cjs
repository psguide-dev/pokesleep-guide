const assert=require('node:assert/strict'),path=require('node:path');
const {firefox}=require(process.env.PSG_PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await firefox.launch({headless:true,env:{...process.env,MOZ_DISABLE_CONTENT_SANDBOX:'1'}});try{
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'../review.html'));
  await page.locator('#homeMealSelect').selectOption('カレー・シチュー');
  assert.equal(await page.locator('#teamPotCapacity').innerText(),'鍋未設定');
  assert.match(await page.locator('.psg-team-recipe-pot').first().innerText(),/容量未設定/);
  const example=await page.evaluate(()=>Object.values(PS_CATALOG.recipes).find(r=>r.category==='カレー・シチュー'&&r.ingredients.reduce((n,i)=>n+i.qty,0)>45&&r.ingredients.reduce((n,i)=>n+i.qty,0)<=68));
  assert(example);const row=page.locator(`.psg-team-recipe-row[data-recipe-id="${example.id}"]`);
  await page.locator('#teamPotBase').selectOption('45');assert.equal(await page.locator('#teamPotCapacity').innerText(),'現在 45個');
  assert.match(await row.locator('.psg-team-recipe-pot').innerText(),/あと\d+個/);
  await page.locator('#teamGoodCamp').click();assert.match(await page.locator('#teamPotCapacity').innerText(),/現在 68個（キャンプON）/);
  assert.match(await row.locator('.psg-team-recipe-pot').innerText(),/容量内/);
  assert.match(await row.locator('.psg-team-recipe-status').innerText(),/チーム未設定/);
  await row.scrollIntoViewIfNeeded();await page.waitForFunction(selector=>{const img=document.querySelector(selector+' img');return img?.complete&&img.naturalWidth>0},`.psg-team-recipe-row[data-recipe-id="${example.id}"]`);
  if(width===390)await page.screenshot({path:'/tmp/psg264-team-cooking.png'});
  await row.click();assert.equal(await page.locator(`.psg-recipe-entry[data-recipe-id="${example.id}"]`).evaluate(el=>el.open),true);
  await page.locator('#cookingPotBase').evaluate(el=>el.closest('details').open=true);
  assert.equal(await page.locator('#cookingCamp').isChecked(),true);assert.equal(await page.locator('#cookingPotBase').inputValue(),'45');
  await page.locator('#cookingCamp').uncheck();assert.equal(await page.evaluate(()=>PS.cookingContext().camp),false);
  await page.locator('#cookingSunday').check();await page.locator('#cookingSkill').fill('10');
  assert.equal(await page.locator('#cookingPotResult').innerText(),'試算容量 100個');
  await page.evaluate(()=>PS.go('home'));assert.equal(await page.locator('#teamPotCapacity').innerText(),'現在 100個（日曜・スキル＋10）');
  await page.reload();assert.equal(await page.locator('#teamPotCapacity').innerText(),'現在 100個（日曜・スキル＋10）');
  await page.locator('#teamGoodCamp').click();assert.match(await page.locator('#teamPotCapacity').innerText(),/現在 150個/);
  await page.evaluate(()=>PS.go('skillPage'));await page.locator('#skillSearch').fill('ほっぺすりすり');await page.locator('.psg-skill-entry>summary').click();await page.locator('.psg-skill-conditions>summary').click();
  assert.match(await page.locator('.psg-skill-conditions').innerText(),/誰か1匹の交代で消失/);assert.match(await page.locator('.psg-skill-conditions').innerText(),/未確認の項目/);
  assert(await page.locator('.psg-skill-conditions a').count()>0);
  await page.evaluate(()=>openDexCard('0777_default'));await page.locator('#v12Ability .psg-skill-summary').click();assert.match(await page.locator('#skillLevels').innerText(),/通常ストックと別/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log(width+'px: recipe image, unknown pot, OFF45/ON68, cross-screen camp/sunday/skill, persistence, rule notes/sources');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
