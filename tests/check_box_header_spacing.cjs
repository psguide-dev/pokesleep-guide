const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('templates/10-box-detail.html','utf8');
assert.equal((source.match(/id="boxIngredientRows"/g)||[]).length,1);
assert(!source.includes('psg-box-food-pinned'));
assert(source.includes('aria-label="食材"><div class="psg-box-food-heading"><div id="boxIngredientRows">'));
for(const file of ['styles/06-mobile-overrides.css','styles/07-current-ui.css']){
 const css=fs.readFileSync(file,'utf8');
 for(const [,selector,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  if(selector.includes('#boxDetail.active'))assert(!/padding-top\s*:\s*0\s*!important/.test(body),'Box fixed-header compensation must not be overridden by zero padding: '+file);
 }
}
assert(fs.readFileSync('styles/07-current-ui.css','utf8').includes('body:has(#boxDetail.active)>main{padding-top:var(--psg-header-height)}'));
console.log('Box fixed app header retains its flow space; ingredient slots remain in the normal scrolling food section.');
const detailCss=fs.readFileSync('styles/10-detail-facts.css','utf8');
assert(detailCss.includes('body:has(#dexDetail.active)>main,body:has(#boxDetail.active)>main{padding-bottom:0}'));
assert(detailCss.includes('#dexDetail.active,#boxDetail.active{padding-bottom:86px}'));
assert(detailCss.includes('body:has(#dexDetail.active),body:has(#boxDetail.active){overscroll-behavior-y:none}'));
console.log('Detail footer clearance remains inside sticky ancestors; root overscroll is contained without locking scrolling.');
