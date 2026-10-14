function createRuntime(rootPath,project=true){
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(rootPath);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const catalog=JSON.parse(read('review.html').split('window.PS_CATALOG=')[1].split(';\n')[0]);
const ctx={window:{PS_CATALOG:catalog,PS_SWAP_ENGINE:require(path.join(root,'vendor/enigma-swap/daily-supply.mjs'))},structuredClone,boxEsc:String};vm.createContext(ctx);
ctx.window.PS_IMAGE_FILES={berries:{}};
vm.runInContext(read('templates/01-species-catalog.html').replace(/<\/?script[^>]*>/g,''),ctx);
const specialModule=require(path.join(root,'vendor/enigma-special/special_skill_kernel.mjs'));
const tables=JSON.parse(read('vendor/enigma-special/effect_tables.json'));
// Same special-skill engine as the production build, including recovery feedback.
const ingredientNames=Object.fromEntries(fs.readdirSync(path.join(root,'master/ingredients')).map(dir=>{
 const record=JSON.parse(read(`master/ingredients/${dir}/data.json`));return [record.id,record.name];
}));
ctx.window.PS_SPECIAL_ENGINE={...specialModule,tables,kernel:specialModule.createKernel(tables),ingredientNames};
for(const f of ['templates/00-number-format.html','templates/core/07-corrections.html','templates/core/10-individual-evaluation.html','templates/core/12-individual-trial.html']){
 let source=read(f).replace(/<\/?script[^>]*>/g,'');
 // Prediction sandbox ONLY. Production cap/source are not changed.
 if(project&&f.endsWith('07-corrections.html')){
  if(!source.includes('const MAX_POKEMON_LEVEL=70;'))throw new Error('Review cap before projection');
  source=source.replace('const MAX_POKEMON_LEVEL=70;','const MAX_POKEMON_LEVEL=80;');
 }
 vm.runInContext(source,ctx);
}
vm.runInContext(require(path.join(root,'tests/daily_kernel.cjs')),ctx);
return {catalog,ctx,root,commit:cp.execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()};
}
module.exports={createRuntime};
