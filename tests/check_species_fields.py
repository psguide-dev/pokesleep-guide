"""Ensure source mismatches prevent a build instead of silently reaching Pages."""
import copy
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PSG_build_master import pokemon_field_payloads, validate_pokemon_field_payloads

row = {'sleepStyleId': '0001_01', 'rank': {'tier': 'ノーマル', 'level': 2}, 'unlockEnergy': 3118, 'drowsyPower': 418000}
catalog = {'pokemon': {'1': {}, '2': {}}, 'sleepStyles': {'1': [['こうごうせい寝', 1, '0001_01']]}, 'fields': {'greengrass': {'id': 'greengrass', 'name': 'ワカクサ本島', 'mode': 'normal', 'encounters': [row]}}}
payloads = pokemon_field_payloads(catalog)
assert payloads['2'] == {}
for mutation in ('rank', 'unlockEnergy', 'drowsyPower', 'sleepStyleId', 'name', 'missing'):
    bad = copy.deepcopy(payloads)
    entry = bad['1']['greengrass']
    if mutation == 'missing':
        entry['encounters'].clear()
    elif mutation == 'name':
        entry['name'] = '別フィールド'
    elif mutation == 'rank':
        entry['encounters'][0]['rank']['level'] = 3
    elif mutation == 'sleepStyleId':
        entry['encounters'][0]['sleepStyleId'] = '0002_01'
    else:
        entry['encounters'][0][mutation] += 1
    try:
        validate_pokemon_field_payloads(catalog, bad)
    except AssertionError:
        pass
    else:
        raise AssertionError(f'{mutation} mismatch passed validation')
assert catalog['fields']['greengrass']['encounters'][0] == row
print('Rank, energy, power, sleep ID, field metadata and missing-row mismatches block publication')
