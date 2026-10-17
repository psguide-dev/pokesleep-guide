from pathlib import Path
import json
import shutil
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PSG_special_rank_assets import restore_special_rank_assets

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
    copy = Path(temp)
    transport = root / 'research/special4-rank/data'
    shutil.copytree(transport, copy / 'research/special4-rank/data')
    manifest = json.loads((transport / 'transport.json').read_text())
    for name in manifest['sourceInputs']:
        target = copy / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / name, target)
    assert restore_special_rank_assets(copy) == 13
    target = copy / manifest['bundles'][1]['files'][0]['path']
    original = target.read_bytes()
    target.write_bytes(b'corrupt')
    restore_special_rank_assets(copy)
    assert target.read_bytes() == original
    source = copy / next(iter(manifest['sourceInputs']))
    source.write_bytes(source.read_bytes() + b'changed')
    try:
        restore_special_rank_assets(copy)
        raise AssertionError('stale model accepted')
    except ValueError as error:
        assert 'regenerate references' in str(error)
    shutil.copyfile(root / source.relative_to(copy), source)
    bundle = copy / 'research/special4-rank/data' / manifest['bundles'][1]['name']
    bundle.write_bytes(bundle.read_bytes() + b'corrupt')
    try:
        restore_special_rank_assets(copy)
        raise AssertionError('corrupt bundle accepted')
    except ValueError as error:
        assert 'checksum mismatch' in str(error)
print('Special rank transport: 13 files restored, output repaired, stale model and corrupt archive rejected')
