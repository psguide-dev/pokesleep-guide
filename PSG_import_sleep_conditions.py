"""Import supplied rank conditions; never infer drowsy power or form identity."""
import json,re,zipfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
FIELD_IDS=dict(zip(['ワカクサ本島','シアンの砂浜','トープ洞窟','ウノハナ雪原','ラピスラズリ湖畔','ゴールド旧発電所','アンバー渓谷','ワカクサ本島 EX','シアンの砂浜 EX'],['greengrass','cyan','taupe','snowdrop','lapis','old_gold','amber','greengrass_ex','cyan_ex']))
def run(archive):
 with zipfile.ZipFile(archive) as z:
  files={n.split('/')[-1]:n for n in z.namelist()}
  data=json.loads(z.read(files['PSG_sleep_style_energy_master_20261001.json']))
  ranks=z.read(files['PSG_snorlax_ranks_20261001.txt']).decode('utf-8-sig')
 pokemon={p.parent.name:json.loads(p.read_text()) for p in (ROOT/'master/pokemon').glob('*/data.json')}
 fields={};pending=[];count=0
 for name,id in FIELD_IDS.items():
  path=ROOT/'master/fields'/id/'data.json'
  fields[name]=json.loads(path.read_text()) if path.exists() else dict(id=id,name=name,mode='expert',favoriteMode='weekly_random',favoriteBerries=[],encounters=[])
  section=ranks.split('\n'+name+'\n')[1].split('\n\n')[0]
  threshold=[]
  for line in section.splitlines():
   m=re.match(r'^(ノーマル|スーパー|ハイパー|マスター)(\d+)\t([\d,]+)',line)
   if m:threshold.append(dict(tier=m[1],level=int(m[2]),energy=int(m[3].replace(',',''))))
  assert len(threshold)==35
  fields[name]['rankThresholds']=threshold
 for row in data['寝顔一覧']:
  p=pokemon.get(f"{row['全国図鑑番号']:04d}")
  if row['全国図鑑番号'] in (710,711):
   forms=json.loads((ROOT/'master/forms/data.json').read_text())
   p={'name':row['ポケモン'],'sleepStyles':forms['sleepStyleGroups'][f"{row['全国図鑑番号']:04d}_sizes"]['styles']}
  if not p or p['name']!=row['ポケモン']:
   pending.append(row);continue
  styles=[s for s in p.get('sleepStyles',[]) if s['name']==row['寝顔'] and s['stars']==row['星']]
  assert len(styles)==1,(row['ポケモン'],row['寝顔'])
  field=fields[row['フィールド']];id=styles[0]['id'];m=re.fullmatch(r'(ノーマル|スーパー|ハイパー|マスター)(\d+)',row['最低カビゴン評価']);assert m
  hit=next((e for e in field['encounters'] if e['sleepStyleId']==id),None)
  if hit is None:hit=dict(sleepStyleId=id,drowsyPower=None);field['encounters'].append(hit)
  power=row.get('必要ねむけパワー')
  if power is not None:
   assert isinstance(power,int) and power>0
   hit.update(drowsyPower=power,drowsyPowerSource=row.get('DPR出典'),drowsyPowerVerifiedAt=row.get('DPR確認日'),drowsyPowerStatus=row.get('DPR確認状態'))
  hit.update(rank=dict(tier=m[1],level=int(m[2])),unlockEnergy=row['解放エナジー'],source=row['出典'],verifiedAt=data['調査日'],status=row['確認状態'],eventOnly=row['イベント限定'])
  count+=1
 for field in fields.values():
  folder=ROOT/'master/fields'/field['id'];folder.mkdir(exist_ok=True)
  (folder/'data.json').write_text(json.dumps(field,ensure_ascii=False,indent=2)+'\n')
 folder=ROOT/'data-import';folder.mkdir(exist_ok=True)
 (folder/'sleep-conditions-pending.json').write_text(json.dumps(dict(verifiedAt=data['調査日'],notes=data['注意'],records=pending),ensure_ascii=False,separators=(',',':'))+'\n')
 print(f'Linked {count}; pending species/forms {len(pending)}')
if __name__=='__main__':run(sys.argv[1])
