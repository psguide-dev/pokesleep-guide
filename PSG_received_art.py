"""Restore the adopted October 10 replacement artwork without changing game data."""
import hashlib
import json
from pathlib import PurePosixPath
from zipfile import ZipFile


def restore_received_art(root):
    folder = root / 'data-import/received-v506'
    manifest = json.loads((folder / 'manifest.json').read_text())
    rows = {row['path']: row for row in manifest['images']}
    assert len(rows) == 131
    seen = set()
    for pack in manifest['archives']:
        archive = folder / pack['path']
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == pack['sha256']
        with ZipFile(archive) as z:
            for member in z.namelist():
                path = PurePosixPath(member)
                assert member in rows and member not in seen
                assert not path.is_absolute() and '..' not in path.parts
                assert member.startswith('assets/received-v506/')
                data = z.read(member)
                assert hashlib.sha256(data).hexdigest() == rows[member]['sha256']
                assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
                target = root / member
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists() or target.read_bytes() != data:
                    target.write_bytes(data)
                seen.add(member)
    assert seen == set(rows)
    return manifest


def bind_received_art(manifest, images):
    for row in manifest['images']:
        for binding in row['bindings']:
            images[binding['kind']][binding['key']] = row['path']
