from pathlib import Path
import json
import shutil
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PSG_food_rank_assets import restore_food_rank_assets

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as temp:
    target = Path(temp)
    shutil.copytree(root / 'research/food-rank-v2/data', target / 'research/food-rank-v2/data')
    assert restore_food_rank_assets(target) == 250
    manifest = json.loads((target / 'assets/evaluation/food_rank_v2/manifest.json').read_text())
    assert len(manifest['files']) == 249
    item = target / 'assets/evaluation/food_rank_v2' / manifest['files'][0]['file']
    expected = item.read_bytes()
    item.write_text('damaged')
    assert restore_food_rank_assets(target) == 250 and item.read_bytes() == expected
    bundle = next((target / 'research/food-rank-v2/data').glob('*.zip'))
    bundle.write_bytes(b'damaged')
    try:
        restore_food_rank_assets(target)
    except ValueError:
        pass
    else:
        raise AssertionError('Corrupted transport was accepted')
print('Food rank transport: 250 files, exact hashes, damaged local asset restoration and corrupted bundle rejection passed')
