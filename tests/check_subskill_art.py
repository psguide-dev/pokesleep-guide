import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
mapping = json.loads((root / 'assets/subskills/manifest.json').read_text())
records = json.loads((root / 'master/subskills/data.json').read_text())['records']
assert set(mapping) == {row['name'] for row in records}
assert len(mapping) == len(set(mapping.values())) == 17
html = (root / 'review.html').read_text()
for name, filename in mapping.items():
    assert filename.endswith('.png')
    path = root / 'assets/subskills' / filename
    with Image.open(path) as image:
        image.load()
        assert image.mode == 'RGBA' and image.size == (256, 256)
        assert all(image.getpixel(point)[3] == 0 for point in [(0,0),(255,0),(0,255),(255,255)])
    assert 'assets/subskills/' + filename in html
assert 'assets/subskills/berry_count_s.svg' not in html
assert 'filter:grayscale(1);opacity:.65' in html
print('All 17 adopted PNGs: master mapping, dimensions, transparency and runtime connection verified')
