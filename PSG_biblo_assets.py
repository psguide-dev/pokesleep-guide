"""Verified standardized assets, with provisional photo identity kept explicit."""
import hashlib
import json
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
    print(f'Biblo v347: 944 sleep / 11 portraits / 6 normal bodies restored; 2 species previews; provisional identities retained')
