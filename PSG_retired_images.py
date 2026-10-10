"""Retire only the explicitly audited, superseded artwork; preserve received packs."""
import hashlib
import json
from functools import lru_cache


@lru_cache(maxsize=None)
def retired_images(root):
    data = json.loads((root / 'data-import/retired-pokemon-images-v352.json').read_text())
    rows = {r['path']: r for r in data['images']}
    assert len(rows) == data['count'] == 1165
    assert all(name.startswith(('assets/pokemon/', 'assets/sleep/', 'assets/faces/',
                                'master/pokemon/', 'master/forms/artwork/'))
               and '..' not in name.split('/') for name in rows)
    replacement = json.loads((root / 'data-import/received-v506/manifest.json').read_text())
    for row in replacement['retired']:
        name = row['path']
        assert name.startswith(('master/ingredients/', 'master/berries/', 'master/recipes/',
                                'assets/skill-icons/', 'assets/pokemon/biblo-v347/'))
        assert '..' not in name.split('/') and name not in rows
        rows[name] = row
    return rows


def purge_retired_images(root):
    rows = retired_images(root)
    allowed = {name: {row['sha256']} for name, row in rows.items()}
    # Checked-in originals may precede the received trimmed version.
    for package in ('picasso-trim-v305', 'picasso-trim-v326'):
        manifest = json.loads((root / 'data-import' / package / 'manifest.json').read_text())
        for row in manifest['images']:
            if row['path'] in allowed and row.get('originalSha256'):
                allowed[row['path']].add(row['originalSha256'])
    removed = 0
    for name in rows:
        file = root / name
        if file.exists():
            assert hashlib.sha256(file.read_bytes()).hexdigest() in allowed[name], f'retired path has changed: {name}'
            file.unlink()
            removed += 1
    print(f'Retired artwork: {removed} old files removed; {len(rows)} paths protected against restoration')


def clean_retired_references(root, images):
    retired = retired_images(root)
    def clean(mapping):
        for key, value in list(mapping.items()):
            if isinstance(value, dict):
                clean(value)
            elif isinstance(value, str) and value in retired:
                del mapping[key]
    clean(images)
