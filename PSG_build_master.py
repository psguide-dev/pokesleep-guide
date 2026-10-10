"""Validate master folders and produce the GitHub Pages review with external image assets."""
import json
import hashlib
import re
from pathlib import Path

from PSG_build_sources import TEMPLATE_NAMES, STYLE_NAMES
from PSG_image_assets import image_path, face_sheet_script
from PSG_retired_images import purge_retired_images, clean_retired_references
from PSG_trim_assets import restore_trim_assets, restore_additional_trim_assets
from PSG_standard_art import restore_standard_art
from PSG_biblo_assets import restore_biblo_assets
from PSG_received_art import restore_received_art, bind_received_art
from PSG_import_cooking import validate as validate_cooking

ROOT = Path(__file__).resolve().parent
MASTER = ROOT / 'master'
TEMPLATE = ROOT / 'PSG_source_template.html'
TEMPLATE_PARTS = tuple(ROOT / 'templates' / name for name in TEMPLATE_NAMES)
CSS = ROOT / 'PSG_styles.css'
STYLE_FILES = tuple(ROOT / 'styles' / name for name in STYLE_NAMES)
ART = ROOT / 'PSG_specialty_images.js'
FACE_SHEET = ROOT / 'assets/faces/kanto_vol1_sheet.png'
FACE_SCRIPT = ROOT / 'PSG_face_sheet.js'
PREVIEW = ROOT / 'review.html'
MARKER = '/* PSG_BUILD_CATALOG */'


def records(kind):
    folder = MASTER / kind
    result = {}
    for path in sorted(folder.glob('*/data.json')):
        obj = json.loads(path.read_text())
        key = str(obj['no']) if kind == 'pokemon' else obj['id']
        assert path.parent.name == (f'{int(key):04d}' if kind == 'pokemon' else key), path
        assert key not in result, f'duplicate {kind} id: {key}'
        result[key] = (obj, path.parent)
    return result


def catalog_and_images():
    received = json.loads((ROOT / "data-import/received-v506/manifest.json").read_text())
    received_skills = {binding["key"]: row["path"] for row in received["images"]
                       for binding in row["bindings"] if binding["kind"] == "skills"}
    data = json.loads((MASTER / 'catalog.json').read_text())
    natures = json.loads((MASTER / 'natures' / 'data.json').read_text())
    subskills = json.loads((MASTER / 'subskills' / 'data.json').read_text())
    axes = natures['axes']
    assert len(axes) == 5 and len(set(axes)) == 5
    assert set(natures['factors']) == set(axes)
    for factors in natures['factors'].values():
        assert 0 < factors['up'] <= 2 and 0 < factors['down'] <= 2
    rows = natures['rows']
    assert len(rows) == len(axes) and all(len(row) == len(axes) for row in rows)
    nature_names = [name for row in rows for name in row]
    assert len(set(nature_names)) == 25 and all(nature_names)
    allowed_effects = {'berryQtyBonus','teamSpeedReduction','speedReduction','foodRateBonus','skillRateBonus','carryBonus','skillLevelBonus','sleepEnergyBonus','sleepExpBonus','dreamShardBonus','researchExpBonus'}
    skill_names = [item['name'] for item in subskills['records']]
    assert len(set(skill_names)) == len(skill_names) and all(skill_names)
    for item in subskills['records']:
        assert item['effect'] in allowed_effects
        assert isinstance(item['value'],(int,float)) and item['value'] > 0
    kinds = {kind:records(kind) for kind in ('pokemon','ingredients','berries','skills','recipes','fields')}
    ingredients = kinds['ingredients']
    assert kinds['pokemon'], 'empty pokemon master'
    by_name = {obj['name']:key for key,(obj,_) in ingredients.items()}
    assert len(by_name) == len(ingredients), 'duplicate ingredient name'
    images = {key:{} for key in ('pokemon','pokemonFaces','ingredients','berries','skills','recipes','sleepStyles','sleepStylesBySpecies','fields','subskills','types','sleepTypes')}
    ui_icons = json.loads((ROOT / 'assets/ui-icons/manifest.json').read_text())
    assert set(ui_icons) == {'items','ranks','ribbons'}
    assert len(ui_icons['items']) == 16 and len(ui_icons['ranks']) == len(ui_icons['ribbons']) == 4
    for kind, entries in ui_icons.items():
        images[kind] = {}
        for name, path in entries.items():
            assert path.startswith('assets/ui-icons/') and (ROOT/path).is_file(), path
            images[kind][name] = path
    images['ui'] = json.loads((ROOT / 'assets/ui/manifest.json').read_text())
    assert len(images['ui']) == 22
    for path in images['ui'].values():
        assert path.startswith('assets/ui/') and (ROOT/path).is_file(), path
    catalog = {**data,'pokemon':{},'sleepStyles':{},'recipes':{},'skills':{},'ingredientAssets':{},'berries':{},'fields':{},
               'natures':natures,'subskills':subskills['records']}
    catalog['infoReference'] = json.loads((ROOT / 'data-import/reference-v544/berries_natures.json').read_text())
    catalog['cooking'] = json.loads((MASTER / 'cooking/data.json').read_text())
    catalog['nightcap'] = json.loads((MASTER / 'nightcap/data.json').read_text())
    assert [row['level'] for row in catalog['nightcap']['rows']] == list(range(1, 21))
    assert all(value is None for value in catalog['nightcap']['probabilities'].values())
    catalog['researchRanks'] = json.loads((MASTER / 'research/ranks.json').read_text())
    rank_total = 0
    for rank, row in enumerate(catalog['researchRanks']['rows'], 1):
        assert row['rank'] == rank
        rank_total += row['expToReach']
        assert row['cumulativeExp'] == rank_total
    assert len(catalog['researchRanks']['rows']) == catalog['researchRanks']['rankCap'] == 70
    catalog['growth'] = json.loads((MASTER / 'growth/data.json').read_text())
    growth = catalog['growth']
    assert growth['levelCap'] == 70 and len(growth['rows']) == 69
    assert growth['subskillUnlockLevels'] == [10, 25, 50, 70, 80]
    previous = {key: 0 for key in growth['expTypeMultipliers']}
    for level, row in enumerate(growth['rows'], 1):
        assert row['current_level'] == level and row['target_level'] == level + 1
        assert row['dream_shards_per_candy_at_current_level'] > 0
        assert set(row['candy_exp']) == {'neutral', 'up', 'down'}
        assert all(value > 0 for value in row['candy_exp'].values())
        for key, multiplier in growth['expTypeMultipliers'].items():
            values = row['exp_types'][key]
            cumulative = int(row['base_cumulative_exp_at_target'] * multiplier + 0.5)
            assert values['cumulative_exp_at_target'] == cumulative
            assert values['exp_to_next'] == cumulative - previous[key] > 0
            previous[key] = cumulative
    catalog['fieldSpawnCounts'] = json.loads((MASTER / 'research/field-spawn-counts.json').read_text())
    assert len(catalog['fieldSpawnCounts']['fields']) == 9
    for rows in catalog['fieldSpawnCounts']['fields'].values():
        assert [row['count'] for row in rows] == [4, 5, 6, 7, 8]
        for row in rows:
            lo, hi = row['observedPreviousMax'], row['observedNextMin']
            assert hi > 0 and (lo is None or 0 <= lo < hi)
            assert row['exactThreshold'] == (hi if lo is not None and hi - lo == 1 else None)
    catalog['friendship'] = json.loads((MASTER / 'friendship/data.json').read_text())
    assert len(catalog['friendship']['medals']['ポケモン']) == 250
    assert len(catalog['friendship']['normalSpeciesMapping']) == len(kinds['pokemon'])
    validate_cooking(catalog['cooking'])
    catalog['recipeEvaluation'] = json.loads((MASTER / 'cooking/evaluation.json').read_text())
    catalog['dailySupply'] = json.loads((MASTER / 'cooking/daily-supply.json').read_text())
    assert set(catalog['dailySupply']['scenarios']) == {f'collect{h}h_meals{m}' for h in (1,3,6) for m in (0,1)}
    for scenario in catalog['dailySupply']['scenarios'].values():
        for level in ('30','60'):
            assert len(scenario['tiers'][level]) == 19 and len(scenario['burdens'][level]) == 78
    for level in ('30', '60'):
        assert len(catalog['dailySupply']['tiers'][level]) == 19
        assert len(catalog['dailySupply']['burdens'][level]) == 78
        for row in catalog['dailySupply']['tiers'][level].values():
            assert row['daily'] > 0 and row['tier'] in 'SABCD' and row['top']
        for row in catalog['dailySupply']['burdens'][level].values():
            assert 0 < row['relaxed'] <= row['dedicated'] + 1e-7
    for kind in ('specialties', 'sleepTypes'):
        catalog[kind] = {}
        for key, (obj, folder) in records(kind).items():
            assert obj.get('name') and obj.get('icon') == 'icon.webp', f'invalid icon record: {kind}/{key}'
            image = obj.get('iconAsset') or image_path(ROOT, folder, 'icon')
            assert image and (ROOT / image).is_file(), f'missing icon: {kind}/{key}'
            catalog[kind][key] = {**obj, 'image':image}
        assert len(catalog[kind]) == (4 if kind == 'specialties' else 3), f'incomplete {kind}'
    for key, name in json.loads((MASTER / 'sleepTypes/manifest.json').read_text()).items():
        icon = image_path(ROOT, MASTER / 'sleepTypes' / key, 'icon')
        assert icon, f'missing sleep type icon: {key}'
        images['sleepTypes'][name] = icon
    type_names = json.loads((MASTER / 'types/manifest.json').read_text())
    assert len(type_names) == 18 and len(set(type_names.values())) == 18, 'type image manifest must cover 18 unique types'
    for type_id,name in type_names.items():
        assert type_id.isascii() and type_id.replace('_','').isalnum(), f'invalid type ID: {type_id}'
        icon = image_path(ROOT, MASTER / 'types' / type_id, 'icon')
        if icon:
            images['types'][name] = icon
    badges = json.loads((ROOT / 'assets/subskills/manifest.json').read_text())
    assert set(badges) == set(skill_names), 'subskill badge manifest must cover all master records'
    for name,filename in badges.items():
        custom = image_path(ROOT, MASTER / 'subskills/icons', filename.rsplit('.',1)[0])
        if custom:
            images['subskills'][name] = custom
        else:
            svg = ROOT / 'assets/subskills' / filename
            assert svg.is_file(), svg
            images['subskills'][name] = svg.relative_to(ROOT).as_posix()
    for key,(field,folder) in kinds['fields'].items():
        assert field['id'] == key and field.get('name') and field.get('mode') in ('normal','expert')
        assert field.get('favoriteMode') in ('fixed','weekly_random'), key
        favorites = field.get('favoriteBerries')
        assert isinstance(favorites,list) and len(favorites) == (3 if field['favoriteMode'] == 'fixed' else 0), key
        assert all(isinstance(name,str) and name for name in favorites) and len(set(favorites)) == len(favorites), key
        ranks = field.get('rankThresholds')
        assert isinstance(ranks,list) and len(ranks) == 35, f'{key}: expected Normal/Great/Ultra 1-5 and Master 1-20'
        expected_ranks = [(tier,level) for tier,limit in (('ノーマル',5),('スーパー',5),('ハイパー',5),('マスター',20)) for level in range(1,limit+1)]
        assert [(rank.get('tier'),rank.get('level')) for rank in ranks] == expected_ranks, f'{key}: invalid rank order'
        assert ranks[0]['energy'] == 0 and all(isinstance(rank['energy'],int) and rank['energy'] > ranks[i-1]['energy'] for i,rank in enumerate(ranks) if i), f'{key}: invalid energy thresholds'
        catalog['fields'][key] = field
        image = image_path(ROOT, folder,'image') or image_path(ROOT, ROOT / 'assets/fields' / key, 'image')
        if image:
            images['fields'][key] = image
    for key,(berry,folder) in kinds['berries'].items():
        assert berry['id'] == key and berry.get('name') and isinstance(berry.get('baseEnergy'),int) and berry['baseEnergy'] > 0
        assert berry['name'] not in catalog['berries'], f'duplicate berry name: {berry["name"]}'
        catalog['berries'][berry['name']] = berry['baseEnergy']
        icon = image_path(ROOT, folder, 'icon')
        if icon:
            images['berries'][berry['name']] = icon
    catalog['berryNames'] = sorted(set(catalog['berries']) | {name for field in catalog['fields'].values() for name in field['favoriteBerries']})
    for key,(obj,folder) in ingredients.items():
        assert obj['id'] == key and obj['name']
        catalog['ingredientAssets'][obj['name']] = {field:value for field,value in obj.items() if field not in ('id','name')}
        icon = image_path(ROOT, folder, 'icon')
        if icon:
            images['ingredients'][obj['name']] = icon
    for key,(obj,folder) in kinds['skills'].items():
        assert obj['id'] == key and obj.get('levels')
        if obj.get('effectType') == 'reference_only':
            assert obj.get('calculationStatus') == 'not_implemented' and obj.get('sources') and obj.get('sourceTable'), key
            assert sorted(map(int,obj['levels'])) == list(range(1,obj['maxLevel']+1)), key
            assert all(level.get('description') and level.get('referenceValues') for level in obj['levels'].values()), key
        if obj.get('effectType') == 'variable_energy':
            assert sorted(map(int,obj['levels'])) == list(range(1,obj['maxLevel']+1)), key
            assert all(isinstance(level.get('min'),int) and isinstance(level.get('max'),int) and 0 < level['min'] <= level['max'] for level in obj['levels'].values()), key
        if key in received_skills:
            obj = {**obj, 'iconAsset': received_skills[key]}
        catalog['skills'][key] = obj
        icon = obj.get('iconAsset') or image_path(ROOT, folder, 'icon')
        if obj.get('iconAsset'):
            assert icon.startswith(('assets/skill-icons/', 'assets/received-v506/skills/')) and (ROOT/icon).is_file(), key
        if icon:
            images['skills'][key] = icon
    for key,(obj,folder) in kinds['pokemon'].items():
        assert obj['no'] == int(key) and obj.get('name') and obj.get('mainSkillId') in catalog['skills']
        assert obj.get('type') and obj.get('sleepType') and obj.get('specialty')
        assert obj.get('specialTeamLimited',False) in (True,False), f'{key}: invalid special team rule'
        assert obj.get('berry') in catalog['berries'], f'{key}: unknown berry {obj.get("berry")}'
        for field in ('help','carry','berryQty'):
            if field in obj:
                assert isinstance(obj[field],(int,float)) and obj[field] > 0, f'{key}: invalid {field}'
        for field in ('foodRate','skillRate'):
            if field in obj:
                assert isinstance(obj[field],(int,float)) and 0 <= obj[field] <= 100, f'{key}: invalid {field}'
        if 'foodRate' in obj or 'skillRate' in obj:
            assert obj.get('rateStatus') in ('推定','確認済み'), f'{key}: missing rateStatus'
        obj = obj.copy()
        styles = obj.pop('sleepStyles', [])
        seen_styles = set()
        for style in styles:
            assert style['id'].startswith(f'{int(key):04d}_') and style['id'] not in seen_styles
            assert style['name'] and 1 <= style['stars'] <= 5
            seen_styles.add(style['id'])
            photo = image_path(ROOT, folder / 'sleep', style['id'])
            if photo:
                images['sleepStyles'][style['id']] = photo
        catalog['sleepStyles'][key] = [[style['name'],style['stars'],style['id']] for style in styles]
        for slot in obj.get('ingredientSlots', []):
            assert slot['unlock'] in (1,30,60) and slot.get('candidates')
            for candidate in slot['candidates']:
                ingredient_id = candidate.pop('ingredientId')
                assert ingredient_id in ingredients, f'{key}: unknown ingredient {ingredient_id}'
                assert isinstance(candidate.get('qty'),int) and candidate['qty'] > 0
                candidate['name'] = ingredients[ingredient_id][0]['name']
        catalog['pokemon'][key] = obj
        for role, asset_key in (('face','pokemonFaces'),('full','pokemon')):
            image = image_path(ROOT, folder,role)
            if image:
                images[asset_key][key] = image
        # Keep source files separate; details share the face until full art is supplied.
        if key not in images['pokemon'] and key in images['pokemonFaces']:
            images['pokemon'][key] = images['pokemonFaces'][key]
    style_index = {style[2]:(no,style) for no,styles in catalog['sleepStyles'].items() for style in styles}
    tiers = {'ノーマル','スーパー','ハイパー','マスター'}
    drowsy_by_style = {}
    for field_id,field in catalog['fields'].items():
        seen = set()
        for encounter in field.get('encounters',[]):
            style_id = encounter['sleepStyleId']
            assert style_id in style_index and style_id not in seen, f'{field_id}: invalid/duplicate style {style_id}'
            seen.add(style_id)
            rank = encounter['rank']
            assert rank['tier'] in tiers and isinstance(rank['level'],int) and rank['level'] >= 1, field_id
            assert encounter['drowsyPower'] is None or (isinstance(encounter['drowsyPower'],int) and encounter['drowsyPower'] > 0), field_id
            if encounter.get('unlockEnergy') is not None:
                assert any(r['tier']==rank['tier'] and r['level']==rank['level'] and r['energy']==encounter['unlockEnergy'] for r in field['rankThresholds']), field_id
            if encounter['drowsyPower'] is not None and field['mode']=='normal':
                assert drowsy_by_style.setdefault(style_id,encounter['drowsyPower']) == encounter['drowsyPower'], f'{style_id}: inconsistent normal DPR'
    seen_recipes = set()
    for key,(recipe,folder) in kinds['recipes'].items():
        identity = (recipe.get('category'), recipe.get('name'))
        assert identity not in seen_recipes, f'duplicate recipe: {identity}'
        seen_recipes.add(identity)
        for item in recipe['ingredients']:
            food = ingredients[item['ingredientId']][0]
            assert isinstance(food.get('baseEnergy'), int) and food['baseEnergy'] > 0
            assert food.get('baseEnergySource') and food.get('baseEnergyStatus') == '資料確認'
        assert key == recipe['id'] and recipe['name'] and recipe.get('ingredients')
        assert recipe.get('category') in ('カレー・シチュー','サラダ','デザート・ドリンク'), key
        energy = recipe.get('energy', {})
        for bound,level in (('min',1),('max',70)):
            if bound in energy:
                assert energy[bound].get('level') == level, key
                assert isinstance(energy[bound].get('value'),int) and energy[bound]['value'] > 0, key
        if 'min' in energy and 'max' in energy:
            assert energy['min']['value'] <= energy['max']['value'], key
        observed = energy.get('observed', [])
        assert isinstance(observed,list), key
        assert energy.get('min') or energy.get('max') or observed, f'{key}: no verified energy'
        assert len({v.get('level') for v in observed}) == len(observed), key
        for value in observed:
            assert isinstance(value.get('level'),int) and 1 <= value['level'] <= 70, key
            assert isinstance(value.get('value'),int) and value['value'] > 0 and value.get('source'), key
        seen_ingredients = set()
        for ingredient in recipe['ingredients']:
            ingredient_id = ingredient.pop('ingredientId')
            assert ingredient_id in ingredients, f'{key}: unknown ingredient {ingredient_id}'
            assert ingredient_id not in seen_ingredients, f'{key}: duplicate ingredient {ingredient_id}'
            seen_ingredients.add(ingredient_id)
            assert isinstance(ingredient.get('qty'),int) and ingredient['qty'] > 0
            ingredient['name'] = ingredients[ingredient_id][0]['name']
        catalog['recipes'][key] = recipe
        image = image_path(ROOT, folder,'image')
        if image:
            images['recipes'][key] = image
    # The old catalog entries may contain pending numbers. New records are authoritative.
    forms = json.loads((MASTER / 'forms/data.json').read_text())
    assert len(forms['detailFormGroups']) == 5 and len(forms['species']) == 32
    assert len(kinds['pokemon']) + len(forms['species']) == 250
    assert all(record.get('boxEligible') is True for record in forms['species'])
    assert len(set(record['speciesId'] for record in forms['species'])) == 32
    for record in forms['species']:
        assert record['mainSkillId'] in catalog['skills'], record['speciesId']
        for slot in record['ingredientSlots'] or []:
            for candidate in slot['candidates']:
                ingredient_id = candidate['ingredientId']
                assert ingredient_id in ingredients, ingredient_id
                candidate['name'] = ingredients[ingredient_id][0]['name']
    images['pokemonFacesBySpecies'] = {}
    images['pokemonBySpecies'] = {}
    for record in forms['species']:
        sid = record['speciesId']
        folder = MASTER / 'forms/artwork' / sid
        face = image_path(ROOT, folder, 'face')
        full = image_path(ROOT, folder, 'full')
        if face: images['pokemonFacesBySpecies'][sid] = face
        if full or face: images['pokemonBySpecies'][sid] = full or face
    catalog['forms'] = forms
    catalog['pendingNationalNos'] = [n for n in data.get('pendingNationalNos',[]) if str(n) not in catalog['pokemon']]
    return catalog, images


def swap_engine():
    folder = ROOT / 'vendor/enigma-swap'
    daily = re.sub(r'\bexport ', '', (folder / 'daily-supply.mjs').read_text())
    swap = re.sub(r'^import .*?;\n', '', (folder / 'swap-assist.mjs').read_text(), count=1)
    swap = re.sub(r'\bexport ', '', swap)
    return ('window.PS_SWAP_ENGINE=(()=>{const daily=(()=>{' + daily +
            '\nreturn {modifiers,selectSlots,InputError,countEvents,BASELINE,ribbon};})();' +
            '\nconst {modifiers,selectSlots,InputError,countEvents,BASELINE}=daily;\n' + swap +
            '\nreturn {simulateTeam,evaluateSwap,findSwapOptionsAsync,mealTiming,findMealOptionsAsync,supplementTiming,berryUnitEnergy,ribbon:daily.ribbon};})();')


def special_engine():
    folder = ROOT / 'vendor/enigma-special'
    kernel = re.sub(r'\bexport ', '', (folder / 'special_skill_kernel.mjs').read_text())
    tables = json.loads((folder / 'effect_tables.json').read_text())
    names = {key: obj['name'] for key, (obj, _) in records('ingredients').items()}
    payload = json.dumps({'tables': tables, 'ingredientNames': names}, ensure_ascii=False).replace('<', '\\u003c')
    return ('window.PS_SPECIAL_ENGINE=(()=>{' + kernel + '\nconst data=' + payload +
            ';return {kernel:createKernel(data.tables),tables:data.tables,ingredientNames:data.ingredientNames,initialState,provisionalCountDistribution};})();')


def pokemon_field_payloads(catalog):
    """Derive species encounters from the canonical field records, then audit coverage."""
    result = {no: {} for no in catalog['pokemon']}
    for field_id, field in catalog['fields'].items():
        for encounter in field.get('encounters', []):
            no = str(int(encounter['sleepStyleId'].split('_')[0]))
            assert no in result, f'{field_id}: unknown encounter species {no}'
            entry = result[no].setdefault(field_id, {key: field[key] for key in ('id', 'name', 'mode')})
            entry.setdefault('encounters', []).append(dict(encounter))
    validate_pokemon_field_payloads(catalog, result)
    return result


def validate_pokemon_field_payloads(catalog, payloads):
    assert set(payloads) == set(catalog['pokemon']), 'species field coverage mismatch'
    actual = {}
    for no, fields in payloads.items():
        known_styles = {row[2] for row in catalog['sleepStyles'].get(no, [])}
        for field_id, field in fields.items():
            source = catalog['fields'][field_id]
            assert all(field[key] == source[key] for key in ('id', 'name', 'mode')), f'{no}: field metadata mismatch'
            for row in field['encounters']:
                style_id = row['sleepStyleId']
                assert str(int(style_id.split('_')[0])) == no and style_id in known_styles, f'{no}: foreign/unknown sleep style {style_id}'
                key = (field_id, style_id)
                assert key not in actual, f'duplicate species encounter {key}'
                actual[key] = row
    expected = {(field_id, row['sleepStyleId']): row for field_id, field in catalog['fields'].items() for row in field.get('encounters', [])}
    assert actual == expected, 'species encounters differ from field source; publication stopped'


def build():
    purge_retired_images(ROOT)
    restore_trim_assets(ROOT)  # Verify received pack hashes before applying artwork.
    restore_additional_trim_assets(ROOT)
    received = restore_received_art(ROOT)
    catalog, images = catalog_and_images()
    restore_standard_art(ROOT, catalog, images)
    restore_biblo_assets(ROOT, catalog, images)
    bind_received_art(received, images)
    clean_retired_references(ROOT, images)
    core = ('help','carry','berryQty','foodRate','skillRate','ingredientSlots')
    missing = [(f'{int(no):04d} {obj["name"]}',[field for field in core if field not in obj])
               for no,obj in catalog['pokemon'].items()]
    missing = [(name,fields) for name,fields in missing if fields]
    for name,fields in missing:
        print(f'Forecast data pending: {name}: {", ".join(fields)}')
    print(f'Forecast core fields: {len(catalog["pokemon"])-len(missing)}/{len(catalog["pokemon"])} species complete')
    source = ''.join(path.read_text() for path in TEMPLATE_PARTS)
    if not TEMPLATE.exists() or TEMPLATE.read_text() != source:
        TEMPLATE.write_text(source)  # Compatibility copy; edit templates/*.html instead.
    assert source.count(MARKER) == source.count('/* PSG_BUILD_STYLES */') == source.count('/* PSG_BUILD_SPECIALTY_IMAGES */') == source.count('/* PSG_BUILD_FACE_SCRIPT */') == 1
    assert source.count('Review v545') == 2
    serialize = lambda value: json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    field_data = serialize({'fields': catalog['fields'], 'fieldSpawnCounts': catalog['fieldSpawnCounts']})
    field_asset = 'fields-' + hashlib.sha256(field_data.encode()).hexdigest()[:12] + '.js'
    data_dir = ROOT / 'data'
    data_dir.mkdir(exist_ok=True)
    (data_dir / field_asset).write_text('window.PS_FIELD_DATA=' + field_data + ';')
    # Only small settings needed by team calculations remain in the main catalog.
    common_catalog = {**catalog, 'fields': {key: {k:v for k,v in entry.items() if k not in ('encounters','rankThresholds')} for key,entry in catalog['fields'].items()}}
    common_catalog.pop('fieldSpawnCounts')
    cooking_data = serialize({key:catalog[key] for key in ('recipes','dailySupply','recipeEvaluation')})
    cooking_asset = 'cooking-' + hashlib.sha256(cooking_data.encode()).hexdigest()[:12] + '.js'
    (data_dir / cooking_asset).write_text('window.PS_COOKING_DATA=' + cooking_data + ';')
    common_catalog.pop('dailySupply')
    common_catalog.pop('recipeEvaluation')
    for no, payload in pokemon_field_payloads(catalog).items():
        species_data = serialize(payload)
        species_asset = f'pokemon-fields/{no}-' + hashlib.sha256(species_data.encode()).hexdigest()[:12] + '.js'
        path = data_dir / species_asset
        path.parent.mkdir(exist_ok=True)
        path.write_text(f'window.PS_POKEMON_FIELDS??={{}};window.PS_POKEMON_FIELDS["{no}"]=' + species_data + ';')
        common_catalog['pokemon'][no]['fieldDataURL'] = 'data/' + species_asset
    js_data = serialize(common_catalog)
    js_images = json.dumps(images,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    injection = ('window.PS_CATALOG='+js_data+';\n'
                 'if(window.PS_FIELD_DATA)Object.assign(window.PS_CATALOG,window.PS_FIELD_DATA);\n'
                 'if(window.PS_COOKING_DATA)Object.assign(window.PS_CATALOG,window.PS_COOKING_DATA);\n'
                 'for(const [kind,entries] of Object.entries('+js_images+'))'
                 'Object.assign(window.PS_IMAGE_FILES[kind],entries);')
    face_script = face_sheet_script(ROOT, FACE_SCRIPT, FACE_SHEET)
    css_text = ''.join(path.read_text() for path in STYLE_FILES)
    if not CSS.exists() or CSS.read_text() != css_text:
        CSS.write_text(css_text)  # Compatibility copy; edit styles/*.css instead.
    assert source.count('/* PSG_BUILD_SWAP_ENGINE */') == 1
    def assemble(page_source, page_injection):
        return page_source.replace(MARKER,page_injection).replace('/* PSG_BUILD_STYLES */',css_text).replace('/* PSG_BUILD_SPECIALTY_IMAGES */',ART.read_text()).replace('/* PSG_BUILD_FACE_SCRIPT */',face_script).replace('/* PSG_BUILD_SWAP_ENGINE */',swap_engine()).replace('/* PSG_BUILD_SPECIAL_ENGINE */',special_engine())
    field_only = ('fields/02-gallery.html','fields/03-details.html','fields/01-spawn-calculator.html','core/11-field-spawn.html')
    main_source = source
    cooking_first = next(i for i,p in enumerate(TEMPLATE_PARTS) if p.name == '18-recipe-controller.html')
    cooking_last = next(i for i,p in enumerate(TEMPLATE_PARTS) if str(p).endswith('recipes/05-events.html'))
    cooking_source = ''.join(p.read_text() for p in TEMPLATE_PARTS[cooking_first:cooking_last+1])
    cooking_code = re.sub(r'</?(?:script|body|html)\b[^>]*>', '', cooking_source)
    cooking_package = 'cooking-view-' + hashlib.sha256(cooking_code.encode()).hexdigest()[:12] + '.js'
    package_dir = ROOT / 'packages'
    package_dir.mkdir(exist_ok=True)
    (package_dir / cooking_package).write_text(cooking_code)
    injection += '\nwindow.PS_COOKING_PACKAGE=' + serialize({'data':'data/'+cooking_asset, 'view':'packages/'+cooking_package}) + ';'
    main_source = main_source.replace(cooking_source, '<script>window.PS_OPEN_RECIPE=id=>window.PS_INFO_ROUTE.open("recipePage",{recipe:id});</script>', 1)
    for name in field_only:
        main_source = main_source.replace((ROOT / 'templates' / name).read_text(), '', 1)
    main_source = main_source.replace((ROOT / 'templates/core/08-fields.html').read_text(), (ROOT / 'templates/core/08-fields.html').read_text() + (ROOT / 'templates/fields/04-main-bridge.html').read_text(), 1)
    html = assemble(main_source, injection)
    trim_bounds = json.loads((ROOT / 'assets/ui/icon-trim-bounds.json').read_text())
    trim_script = (ROOT / 'templates/icon-trim.js').read_text().replace('/* PSG_ICON_TRIM_BOUNDS */', json.dumps(trim_bounds,separators=(',',':')))
    def finish(page):
        page = page.replace(css_text, re.sub(r'(?<![\w-])img(?![\w-])', ':is(img,svg.psg-trimmed-icon)', css_text))
        return page.replace('</head>', '<script>'+trim_script+'</script></head>',1)
    html = finish(html)
    assert MARKER not in html
    PREVIEW.write_text(html)
    field_script = f'<script src="data/{field_asset}"></script>'
    (ROOT / 'pokemon.html').write_text(html)
    cooking_script = f'<script src="data/{cooking_asset}"></script>'
    for filename in ('recipes.html', 'ingredients.html'):
        page = html.replace('<script id="psg-catalog">', cooking_script + '<script id="psg-catalog">', 1)
        page += f'<script src="packages/{cooking_package}"></script></body></html>'
        (ROOT / filename).write_text(page)
    # The standalone field document does not carry recipe/ingredient/skill UI code.
    fields_source = source
    first = next(i for i,p in enumerate(TEMPLATE_PARTS) if p.name == '17-skill-controller.html')
    last = next(i for i,p in enumerate(TEMPLATE_PARTS) if str(p).endswith('recipes/05-events.html'))
    for path in TEMPLATE_PARTS[first:last+1]:
        fields_source = fields_source.replace(path.read_text(), '', 1)
    fields_catalog = {**common_catalog, 'recipes': {}}
    fields_injection = injection.replace('window.PS_CATALOG='+js_data+';', 'window.PS_CATALOG='+serialize(fields_catalog)+';', 1)
    fields_html = finish(assemble(fields_source, fields_injection))
    fields_html = fields_html.replace('<script id="psg-catalog">', field_script + '<script id="psg-catalog">', 1)
    (ROOT / 'fields.html').write_text(fields_html)
    print(f'{len(catalog["pokemon"])} pokemon, {len(catalog["sleepStyles"])} sleep groups, '
          f'{len(catalog["recipes"])} recipes: {len(html)} characters')


if __name__ == '__main__':
    build()
