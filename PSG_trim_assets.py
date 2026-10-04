"""Restore received trimmed images verbatim before catalog assembly."""
import hashlib
import json
from zipfile import ZipFile
from PSG_retired_images import retired_images


def restore_trim_assets(root):
    folder = root / 'data-import/picasso-trim-v305'
    manifest = json.loads((folder / 'manifest.json').read_text())
    rows = {row['path']: row for row in manifest['images']}
    assert len(rows) == 381
    seen = set()
    for pack in manifest['archives']:
        path = folder / pack['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pack['sha256']
        with ZipFile(path) as archive:
            for member in archive.namelist():
                assert member in rows and member not in seen
                row = rows[member]
                data = archive.read(member)
                assert hashlib.sha256(data).hexdigest() == row['sha256']
                if member in retired_images(root):
                    seen.add(member)
                    continue
                destination = root / member
                assert destination.is_file()
                assert hashlib.sha256(destination.read_bytes()).hexdigest() in (row['originalSha256'], row['sha256']), member
                if destination.read_bytes() != data:
                    destination.write_bytes(data)
                seen.add(member)
    assert seen == set(rows) - set(retired_images(root))
    print(f'Trimmed artwork: {len(seen)} current images restored unchanged')


def restore_additional_trim_assets(root):
    """Apply the received non-sleep raster/SVG pack after the original 381 assets."""
    folder = root / 'data-import/picasso-trim-v326'
    manifest = json.loads((folder / 'manifest.json').read_text())
    rows = {row['path']: row for row in manifest['images']}
    assert len(rows) == 107
    seen = set()
    for pack in manifest['archives']:
        path = folder / pack['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == pack['sha256']
        with ZipFile(path) as archive:
            for member in archive.namelist():
                assert member in rows and member not in seen
                row = rows[member]
                data = archive.read(member)
                assert hashlib.sha256(data).hexdigest() == row['sha256']
                if member in retired_images(root):
                    seen.add(member)
                    continue
                destination = root / member
                if destination.exists():
                    assert hashlib.sha256(destination.read_bytes()).hexdigest() in (row['originalSha256'], row['sha256']), member
                else:
                    assert row['originalSha256'] is None, member
                    destination.parent.mkdir(parents=True, exist_ok=True)
                if not destination.exists() or destination.read_bytes() != data:
                    destination.write_bytes(data)
                seen.add(member)
    assert seen == set(rows) - set(retired_images(root))
    print(f'Additional trimmed artwork: {len(seen)} current images restored unchanged')
