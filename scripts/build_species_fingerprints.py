"""Derive small local-comparison references from adopted full-body artwork.
No uploaded screenshots are published. Duplicate references retain all form IDs.
"""
import base64,json,pathlib
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
def feature(im,screen=False):
 a=np.array(im.convert('RGBA')); rgb=a[:,:,:3]
 mask=a[:,:,3]>100
 if screen: mask &= ~((rgb[:,:,0]>240)&(rgb[:,:,1]>230)&(rgb[:,:,2]>180))
 ys,xs=np.nonzero(mask)
 if len(xs)<10:return None
 a=a[ys.min():ys.max()+1,xs.min():xs.max()+1];mask=mask[ys.min():ys.max()+1,xs.min():xs.max()+1]
 h,w=mask.shape;values=[]
 for y in range(16):
  for x in range(16):
   ay,ax=int(y*h/16),int(x*w/16);by,bx=max(int((y+1)*h/16),ay+1),max(int((x+1)*w/16),ax+1)
   cell=a[ay:by,ax:bx];m=mask[ay:by,ax:bx];c=cell[:,:,:3][m].mean(axis=0) if m.any() else [0,0,0]
   values.extend([*c,m.mean()*255])
 return bytes(np.floor(np.array(values)+.5).astype(np.uint8))
def build():
 text=(ROOT/'review.html').read_text();maps=json.JSONDecoder().raw_decode(text.split('for(const [kind,entries] of Object.entries(')[1])[0]
 paths={f'{int(no):04d}_default':path for no,path in maps['pokemon'].items()};paths.update(maps['pokemonBySpecies'])
 grouped={}
 for sid,path in paths.items():
  # Some fallback entries are face-only: these are not full-body references.
  if 'face' in path:continue
  values=feature(Image.open(ROOT/path));encoded=base64.b64encode(values).decode()
  grouped.setdefault(encoded,[]).append(sid)
 result={'version':1,'method':'16x16 foreground RGBA / expected local candidate only','entries':[{'speciesIds':ids,'values':values} for values,ids in grouped.items()]}
 (ROOT/'assets/import/species-fullbody-fingerprints.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
 print('Full-body reference groups:',len(grouped),'species/forms:',sum(map(len,grouped.values())))
if __name__=='__main__':build()
