"""Verified standardized assets, with provisional photo identity kept explicit."""
import hashlib
import json
import unicodedata
from pathlib import PurePosixPath
from zipfile import ZipFile


def restore_biblo_assets(root, catalog, images):
    folder = root / 'data-import/biblo-v347'
    manifest = json.loads((folder / 'manifest.json').read_text())
    rows = {r['path']: r for r in manifest['images']}
    assert len(rows) == 961
    assert sum(r['role'] == 'sleep' for r in rows.values()) == 944
    assert hashlib.sha256((folder / 'source-sleep-current-944.json.gz').read_bytes()).hexdigest() == manifest['sourceTableSha256']
    seen = set()
    for pack in manifest['archives']:
        archive = folder / pack['path']
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == pack['sha256']
        with ZipFile(archive) as z:
            for member in z.namelist():
                assert member in rows and member not in seen
                path = PurePosixPath(member)
                assert not path.is_absolute() and '..' not in path.parts
                assert member.startswith(('assets/sleep/biblo-v347/', 'assets/pokemon/biblo-v347/'))
                data = z.read(member)
                assert hashlib.sha256(data).hexdigest() == rows[member]['sha256']
                assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
                target = root / member
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists() or target.read_bytes() != data:
                    target.write_bytes(data)
                seen.add(member)
    assert seen == set(rows)
    previews = json.loads((folder / 'new-species.json').read_text())
    assert len(previews) == 2 and all(p['boxEligible'] is False for p in previews)
    catalog['forms']['species'].extend(previews)
    catalog['forms']['independentDexEntries'].extend(p['speciesId'] for p in previews)
    for kind, bindings in manifest['bindings'].items():
        assert set(bindings.values()) <= seen
        images[kind].update(bindings)
    # Replace photographs only, leaving permanent style/discovery IDs unchanged.
    catalog['sleepArtworkStatus'] = manifest['sleepBindingStatus']
    catalog['pendingSleepArtwork'] = manifest['pendingSleepArtwork']
    forms = {p['speciesId']: p for p in catalog['forms']['species']}
    for sid, bindings in manifest['sleepBindings'].items():
        if sid in forms:
            valid = {s['id'] for s in catalog['forms']['sleepStyleGroups'][forms[sid]['sleepStyleGroupId']]['styles']}
        else:
            valid = {s[2] for s in catalog['sleepStyles'][str(int(sid.split('_')[0]))]}
        assert set(bindings) <= valid and set(bindings.values()) <= seen
        images['sleepStylesBySpecies'].setdefault(sid, {}).update(bindings)
        if sid.endswith('_default') and str(int(sid.split('_')[0])) in catalog['pokemon']:
            images['sleepStyles'].update(bindings)
    apply_sleep_corrections(root, catalog, images, manifest)
    print('Biblo: 944 sleep / 11 portraits / 6 normal bodies restored; v348 user corrections applied')


def apply_sleep_corrections(root, catalog, images, manifest):
    forms = {p['speciesId']: p for p in catalog['forms']['species']}

    def styles_for(sid):
        if sid in forms:
            return catalog['forms']['sleepStyleGroups'].get(forms[sid]['sleepStyleGroupId'], {}).get('styles', [])
        return [{'id': s[2], 'name': s[0], 'stars': s[1]}
                for s in catalog['sleepStyles'].get(str(int(sid.split('_')[0])), [])]

    def bind(sid, style_id, path, status):
        assert style_id in {s['id'] for s in styles_for(sid)}, (sid, style_id)
        images['sleepStylesBySpecies'].setdefault(sid, {})[style_id] = path
        if sid.endswith('_default') and str(int(sid.split('_')[0])) in catalog['pokemon']:
            images['sleepStyles'][style_id] = path
        catalog['sleepArtworkStatus'].setdefault(sid, {})[style_id] = status
        catalog['pendingSleepArtwork'][sid] = [r for r in catalog['pendingSleepArtwork'].get(sid, []) if r['image'] != path]

    # Combining and precomposed kana must not leave received pictures disconnected.
    normalize = lambda name: unicodedata.normalize('NFC', name or '')
    for row in manifest['images']:
        if row['role'] != 'sleep' or row['bindings']:
            continue
        name = row['sleepStyleName'] or row['proposedSleepStyleName']
        stars = row['stars'] if row['sleepStyleName'] else row['proposedStars']
        if not name:
            continue
        for sid in row['speciesIds']:
            matches = [s for s in styles_for(sid) if normalize(s['name']) == normalize(name) and s['stars'] == stars]
            if len(matches) == 1:
                bind(sid, matches[0]['id'], row['path'], 'confirmed' if row['sleepStyleName'] else 'provisional')
    corrections = json.loads((root / 'data-import/biblo-v347/corrections-v348.json').read_text())
    for row in corrections['bindings']:
        assert hashlib.sha256((root / row['path']).read_bytes()).hexdigest() == row['sha256']
        bind(row['speciesId'], row['sleepStyleId'], row['path'], 'confirmed')
    # Rejected duplicate artwork never returns through the pending gallery.
    rejected = set(corrections['rejectedImages'])
    for sid, pending in catalog['pendingSleepArtwork'].items():
        catalog['pendingSleepArtwork'][sid] = [r for r in pending if r['image'] not in rejected]
