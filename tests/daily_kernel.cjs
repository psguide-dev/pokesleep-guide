// Read the production fragment order from the build manifest, without maintaining a second list.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const manifest=fs.readFileSync(path.join(root,'PSG_build_sources.py'),'utf8');
const files=[...manifest.matchAll(/^\s+'(day\/[^']+|21-day-calculator\.html)',$/gm)].map(m=>m[1]);
if(!files.includes('21-day-calculator.html'))throw new Error('Daily calculation fragments missing from build manifest');
module.exports=files.map(file=>fs.readFileSync(path.join(root,'templates',file),'utf8')).join('\n');
