// Load whistle calculations in the same order as the production build.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const manifest=fs.readFileSync(path.join(root,'PSG_build_master.py'),'utf8');
const files=[...manifest.matchAll(/^\s+'(whistle\/[^']+)',$/gm)].map(m=>m[1]);
if(!files.includes('whistle/01-calculator.html'))throw new Error('Whistle calculations missing from build manifest');
module.exports=files.map(file=>fs.readFileSync(path.join(root,'templates',file),'utf8')).join('');
