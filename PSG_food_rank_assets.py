"""Restore the verified, split transport for lazily loaded food-rank references."""
import hashlib
import json
import re
import zipfile
from pathlib import Path


def restore_food_rank_assets(root):
    root = Path(root)
    transport = root / 'research/food-rank-v2/data/transport.json'
    manifest = json.loads(transport.read_text())
    if manifest.get('version') != 1 or manifest.get('fileCount') != 250:
        raise ValueError('Invalid food rank transport')
    seen = set()
    for bundle in manifest['bundles']:
        name = bundle['name']
        if not re.fullmatch(r'food-rank-\d{3}\.zip', name):
            raise ValueError('Invalid food rank bundle name')
        archive = transport.parent / name
        if hashlib.sha256(archive.read_bytes()).hexdigest() != bundle['sha256']:
            raise ValueError('Food rank bundle checksum mismatch: ' + name)
        expected = {entry['path']: entry for entry in bundle['files']}
        with zipfile.ZipFile(archive) as zipped:
            if len(zipped.namelist()) != len(expected) or set(zipped.namelist()) != set(expected):
                raise ValueError('Unexpected food rank bundle entries')
            for path, entry in expected.items():
                if not re.fullmatch(r'assets/evaluation/food_rank_v2/(?:manifest|output/\d{4}_[a-z0-9_]+_(?:60|70|80))\.json', path) or path in seen:
                    raise ValueError('Invalid or duplicate food rank path: ' + path)
                seen.add(path)
                data = zipped.read(path)
                if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                    raise ValueError('Food rank reference checksum mismatch: ' + path)
                target = root / path
                if not target.exists() or target.read_bytes() != data:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
    if len(seen) != manifest['fileCount']:
        raise ValueError('Incomplete food rank transport')
    return len(seen)
