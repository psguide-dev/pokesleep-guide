const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(root+'/'+f,'utf8'),clean=s=>s.replace(/<\/?script[^>]*>/g,'');
const catalog=JSON.parse(read('review.html').split('window.PS_CATALOG=')[1].split(';\n')[0]);
for(const key of ['fields','sleepStyles','recipes','cooking','growth','friendship','recipeEvaluation','dailySupply','ingredientAssets'])delete catalog[key];
function moduleBundle(file){const s=read(file),names=[...s.matchAll(/^export (?:const|class|function) (\w+)/gm)].map(m=>m[1]);return '(()=>{'+s.replace(/^export /gm,'')+';return {'+names.join(',')+'}})()'}
let source='window.PS_CATALOG='+JSON.stringify(catalog)+';window.PS_IMAGE_FILES={berries:{}};window.boxEsc=s=>String(s).replace(/[&<>"\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",\x27"\x27:\x27&quot;\x27,"\x27":"&#39;"}[c]));';
// Escape text using DOM textContent in the UI; core only receives internal names.
source='window.PS_CATALOG='+JSON.stringify(catalog)+';window.PS_IMAGE_FILES={berries:{}};window.boxEsc=String;';
source+='window.PS_SWAP_ENGINE='+moduleBundle('vendor/enigma-swap/daily-supply.mjs')+';';
source+=clean(read('templates/01-species-catalog.html'));
source+='window.PS_SPECIAL_ENGINE='+moduleBundle('vendor/enigma-special/special_skill_kernel.mjs')+';';
source+='window.PS_SPECIAL_ENGINE.tables='+read('vendor/enigma-special/effect_tables.json')+';window.PS_SPECIAL_ENGINE.kernel=window.PS_SPECIAL_ENGINE.createKernel(window.PS_SPECIAL_ENGINE.tables);window.PS_SPECIAL_ENGINE.ingredientNames='+JSON.stringify(Object.fromEntries(fs.readdirSync(root+'/master/ingredients').map(d=>{const x=JSON.parse(read('master/ingredients/'+d+'/data.json'));return [x.id,x.name]})))+';';
for(const f of ['00-number-format.html','core/07-corrections.html','core/10-individual-evaluation.html','core/12-individual-trial.html'])source+=clean(read('templates/'+f)).replace('const MAX_POKEMON_LEVEL=70;','const MAX_POKEMON_LEVEL=80;');
source+=require(root+'/tests/daily_kernel.cjs');source+=read('research/food-role-v2/evaluate.js');source+='const FOOD_REFS='+read('research/food-role-v2/references.json')+';';source+=read('research/food-role-v2/ui.js');
const html=read('research/food-role-v2/shell.html').replace('<!--SCRIPT-->','<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>');fs.writeFileSync(__dirname+'/food_trial.html',html);console.log('Standalone prototype',Buffer.byteLength(html),'bytes');
