"""Deterministic split archives for transport; production still serves individual JSON."""
from pathlib import Path
import hashlib
import io
import json
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DEST = Path(__file__).resolve().parent / 'data'
paths = sorted((ROOT / 'assets/evaluation/berry_camp_off').glob('*.json'))
paths += sorted((ROOT / 'assets/evaluation/skill_camp_off').glob('*.json'))
paths += [ROOT / f'assets/evaluation/{kind}_manifest_v{version}_off.json' for kind, version in [('berry', 6), ('skill', 2)]]
paths += [ROOT / f'assets/evaluation/{group}_off_{level}.json' for group in ['food_direct_v3', 'food_recovery_v4'] for level in [60, 70, 80]]
assert len(paths) == 169
payloads = [(str(path.relative_to(ROOT)), path.read_bytes()) for path in paths]
DEST.mkdir(parents=True, exist_ok=True)


def archive(rows):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_LZMA) as zipped:
        for name, content in rows:
            entry = zipfile.ZipInfo(name, (2026, 10, 16, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_LZMA
            entry.external_attr = 0o100644 << 16
            zipped.writestr(entry, content)
    return output.getvalue()


def chunks(rows):
    content = archive(rows)
    if len(content) > 600000:
        assert len(rows) > 1, 'An individual reference exceeds the bundle size limit'
        middle = len(rows) // 2
        return chunks(rows[:middle]) + chunks(rows[middle:])
    return [(rows, content)]


groups = []
current = []
size = 0
for row in payloads:
    if current and size + len(row[1]) > 2000000:
        groups.extend(chunks(current))
        current, size = [], 0
    current.append(row)
    size += len(row[1])
if current:
    groups.extend(chunks(current))
bundles = []
for index, (rows, content) in enumerate(groups, 1):
    name = f'camp-off-{index:03}.zip'
    (DEST / name).write_bytes(content)
    bundles.append({'name': name, 'sha256': hashlib.sha256(content).hexdigest(), 'files': [{'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)} for name, data in rows]})
manifest = {'version': 1, 'camp': False, 'fileCount': len(payloads), 'bundles': bundles}
(DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
print(json.dumps({'files': len(payloads), 'bundles': len(bundles), 'rawBytes': sum(len(data) for _, data in payloads), 'compressedBytes': sum((DEST / entry['name']).stat().st_size for entry in bundles)}))

for obsolete in DEST.glob('camp-off-*.zip'):
    if obsolete.name not in {entry['name'] for entry in bundles}:
        obsolete.unlink()
