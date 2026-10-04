from pathlib import Path
import json,zipfile,hashlib
r=Path(__file__).resolve().parent.parent;ret={x['path'] for x in json.loads((r/'data-import/retired-pokemon-images-v352.json').read_text())['images']}
for name in ['picasso-trim-v305','picasso-trim-v326','biblo-v347']:
 m=json.loads((r/'data-import'/name/'manifest.json').read_text());rows={x['path']:x for x in m['images']};seen=set()
 for a in m['archives']:
  p=r/'data-import'/name/a['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
  with zipfile.ZipFile(p) as z:
   for n in z.namelist():
    assert n not in ret and n not in seen
    assert hashlib.sha256(z.read(n)).hexdigest()==rows[n]['sha256'];seen.add(n)
 assert seen==set(rows)-ret
 print(name,len(seen),'current archive payloads verified')
for name in ['picasso-sleep-v277','picasso-sleep-v281']:assert not list((r/'data-import'/name).glob('*.zip'))
