// Read the same ordered skill fragments as the build manifest.
const fs=require('node:fs'),path=require('node:path');
module.exports=()=>{
 const root=path.join(__dirname,'..');
 const manifest=fs.readFileSync(path.join(root,'PSG_build_sources.py'),'utf8').split('STYLE_NAMES')[0];
 return [...manifest.matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(p=>p.startsWith('detail/05-skill')).map(p=>fs.readFileSync(path.join(root,'templates',p),'utf8')).join('');
};
