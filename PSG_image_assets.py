"""Resolve common master artwork and prepare the face sheet reference.

No image pixels are rewritten during the build. Runtime rendering lives in
templates/images; master files remain the source of adopted artwork.
"""

import json


def image_path(root, folder, basename):
    """Return the existing asset's relative URL; reject ambiguous extensions."""
    found = [p for p in folder.glob(f'{basename}.*')
             if p.suffix.lower() in ('.webp', '.png', '.jpg', '.jpeg', '.svg')]
    assert len(found) <= 1, f'ambiguous image: {folder}/{basename}'
    if not found:
        return None
    return found[0].relative_to(root).as_posix()


def face_sheet_script(root, script, sheet):
    """Keep face coordinates in their existing renderer; supply its sheet URL."""
    source = script.read_text()
    assert source.count('/* PSG_BUILD_FACE_SHEET */') == 1
    return source.replace('/* PSG_BUILD_FACE_SHEET */',
                          json.dumps(sheet.relative_to(root).as_posix() if sheet.exists() else None))
