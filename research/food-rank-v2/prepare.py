"""Package an explicitly supplied Enigma 83-species delivery without recalculating it."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1]).resolve()
manifest = json.loads((source / 'manifest.json').read_text())
assert len(manifest['files']) == 249
fingerprint = json.loads((root / 'assets/evaluation/food_direct_v3_80.json').read_text())['engineFingerprint']
manifest.update(schemaVersion=2, engineFingerprint=fingerprint, sourceCommit='020204900e4d273867f83dbdf0b7f1035674b7b3')
files = [('assets/evaluation/food_rank_v2/manifest.json', (json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n').encode())]
for row in manifest['files']:
    data = (source / row['file']).read_bytes()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
    files.append(('assets/evaluation/food_rank_v2/' + row['file'], data))
output = root / 'research/food-rank-v2/data'
output.mkdir(parents=True, exist_ok=True)
bundles, batch, size = [], [], 0

def save():
    if not batch:
        return
    name = f'food-rank-{len(bundles) + 1:03d}.zip'
    target = output / name
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, data in batch:
            info = zipfile.ZipInfo(path, (2026, 10, 17, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compresslevel=9)
    bundles.append({'name': name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'files': [{'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for path, data in batch]})

for path, data in files:
    if batch and size + len(data) > 1600000:
        save()
        batch, size = [], 0
    batch.append((path, data))
    size += len(data)
save()
(output / 'transport.json').write_text(json.dumps({'version': 1, 'fileCount': len(files), 'bundles': bundles}, separators=(',', ':')) + '\n')
print(json.dumps({'files': len(files), 'bundles': len(bundles), 'compressedBytes': sum((output / b['name']).stat().st_size for b in bundles)}))
