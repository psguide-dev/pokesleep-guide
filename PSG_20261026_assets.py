"""User-confirmed ghost species rates and sleep names (2026-10-28)."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def supplement(catalog, images):
    skill=json.loads((ROOT/'master/supplements/magical-flame.json').read_text())
    catalog['skills'][skill['id']]=skill
    images['skills'][skill['id']]='assets/skill-icons/main_skill_placeholder.webp'
    for raw in json.loads((ROOT/'master/supplements/muuma.json').read_text())['species']:
        p=dict(raw);key=str(p['no']);styles=p.pop('sleepStyles')
        catalog['pokemon'][key]=p
        catalog['sleepStyles'][key]=[[s['name'],s['stars'],s['id']] for s in styles]
        prefix=f"assets/pokemon/ghost-20261026/{key}"
        images['pokemon'][key]=prefix+'/body.webp'
        images['pokemonFaces'][key]=prefix+'/face.webp'
        p['shinyImage']=prefix+'/shiny.webp'
        for n,style in enumerate(styles,1): images['sleepStyles'][style['id']]=prefix+f'/sleep_{n}.webp'
    catalog['pendingNationalNos']=[n for n in catalog['pendingNationalNos'] if n not in (200,429)]
