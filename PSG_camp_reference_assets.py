"""Restore verified OFF reference JSON from the compact repository transport bundles."""
import hashlib
import json
import re
import zipfile
from pathlib import Path


def restore_camp_reference_assets(root):
    root = Path(root)
    manifest_path = root / 'research/camp-references/data/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    if manifest.get('version') != 1 or manifest.get('camp') is not False:
        raise ValueError('Invalid camp reference bundle version/condition')
    seen = set()
    for bundle in manifest['bundles']:
        name = bundle['name']
        if not re.fullmatch(r'camp-off-\d{3}\.zip', name):
            raise ValueError('Invalid camp bundle filename')
        archive = manifest_path.parent / name
        if hashlib.sha256(archive.read_bytes()).hexdigest() != bundle['sha256']:
            raise ValueError(f'Camp bundle checksum mismatch: {name}')
        expected = {entry['path']: entry for entry in bundle['files']}
        with zipfile.ZipFile(archive) as zipped:
            if len(zipped.namelist()) != len(expected) or set(zipped.namelist()) != set(expected):
                raise ValueError('Unexpected camp bundle entries')
            for path, entry in expected.items():
                if not re.fullmatch(r'assets/evaluation/(?:food_[a-z0-9_]+_off_(?:60|70|80)|(?:berry|skill)_manifest_v[0-9]+_off|(?:berry|skill)_camp_off/[a-z0-9_]+)\.json', path) or path in seen:
                    raise ValueError(f'Invalid or duplicate camp reference path: {path}')
                seen.add(path)
                data = zipped.read(path)
                if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                    raise ValueError(f'Camp reference checksum mismatch: {path}')
                target = root / path
                if not target.exists() or target.read_bytes() != data:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
    if len(seen) != manifest['fileCount'] or len(seen) != 169:
        raise ValueError('Incomplete camp reference bundles')
    return len(seen)
