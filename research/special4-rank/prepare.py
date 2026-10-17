from pathlib import Path
import json,hashlib,zipfile
import argparse
parser=argparse.ArgumentParser(description='Package an extracted PSN special4 rank delivery')
parser.add_argument('delivery',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
source=args.delivery.resolve()
folder=root/'research/special4-rank'
# Preserve delivery bytes; record model inputs so a changed engine cannot silently use stale curves.
sources=json.loads((source/'runtime-sources.json').read_text())+json.loads((source/'special-sources.json').read_text())
input_hashes={row['path']:hashlib.sha256(row['content'].encode()).hexdigest() for row in sources}
manifest=json.loads((source/'manifest.json').read_text());manifest['sourceCommit']='020204900e4d273867f83dbdf0b7f1035674b7b3'
files=[('assets/evaluation/special4_rank/manifest.json',(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n').encode())]
files.extend(('assets/evaluation/special4_rank/'+row['file'],(source/row['file']).read_bytes()) for row in manifest['files'])
bundles=[]
# One species/level per archive keeps uploads small and distribution reads lazy.
for index,(path,data) in enumerate(files,1):
 name=f'special4-rank-{index:03}.zip';out=folder/'data'/name
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  info=zipfile.ZipInfo(path,date_time=(2026,10,17,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data,compresslevel=9)
 bundles.append({'name':name,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'files':[{'path':path,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}]})
transport={'version':1,'fileCount':13,'sourceCommit':manifest['sourceCommit'],'sourceInputs':input_hashes,'bundles':bundles}
(folder/'data/transport.json').write_text(json.dumps(transport,ensure_ascii=False,indent=2)+'\n')
(folder/'README.txt').write_text('PSN special4 native skill trigger rank — 2026-10-17\nSource: PSN_special4_skill_rank_20261017.zip (Enigma → Biblo → Friday).\nOriginal outputs retained byte-for-byte. 4 species × 3 levels × 6 patterns × 2 camp conditions = 144.\nOnly native skill triggers, effects excluded, stock limit 1, 4-hour collection.\nPopulation: Lv60 17,000 / Lv70 59,500 / Lv80 154,700. Lv80 predicted.\nNot a food collection rank, cross-species ranking, or catch probability.\nBuild restores 13 deployment files after checking transport and model source hashes.\n')
print('archives',len(bundles),'compressed bytes',sum((folder/'data'/b['name']).stat().st_size for b in bundles))
