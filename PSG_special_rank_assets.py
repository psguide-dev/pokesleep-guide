"""Restore verified native-trigger rank curves without accepting stale model inputs."""
import hashlib
import json
import re
import zipfile
from pathlib import Path


def restore_special_rank_assets(root):
    root = Path(root)
    transport = root / 'research/special4-rank/data/transport.json'
    manifest = json.loads(transport.read_text())
    if manifest.get('version') != 1 or manifest.get('fileCount') != 13:
        raise ValueError('Invalid special rank transport')
    for path, expected in manifest['sourceInputs'].items():
        source = root / path
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise ValueError('Special rank model changed; regenerate references: ' + path)
    seen = set()
    for bundle in manifest['bundles']:
        name = bundle['name']
        if not re.fullmatch(r'special4-rank-\d{3}\.zip', name):
            raise ValueError('Invalid special rank bundle name')
        archive = transport.parent / name
        if hashlib.sha256(archive.read_bytes()).hexdigest() != bundle['sha256']:
            raise ValueError('Special rank bundle checksum mismatch: ' + name)
        expected = {entry['path']: entry for entry in bundle['files']}
        with zipfile.ZipFile(archive) as zipped:
            if len(zipped.namelist()) != len(expected) or set(zipped.namelist()) != set(expected):
                raise ValueError('Unexpected special rank bundle entries')
            for path, entry in expected.items():
                if not re.fullmatch(r'assets/evaluation/special4_rank/(?:manifest|output/(?:0122|0132|0439|0442)_default_(?:60|70|80))\.json', path) or path in seen:
                    raise ValueError('Invalid or duplicate special rank path: ' + path)
                seen.add(path)
                data = zipped.read(path)
                if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
                    raise ValueError('Special rank reference checksum mismatch: ' + path)
                target = root / path
                if not target.exists() or target.read_bytes() != data:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
    if len(seen) != manifest['fileCount']:
        raise ValueError('Incomplete special rank transport')
    return len(seen)
