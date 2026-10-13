# Subskill scan v606

The old colored-fill locator failed on all three provided screenshots because
white skill cards broke the first two-column row. The fallback now bounds the
search between the two green section headers, detects horizontal card borders
with a white center gap, and validates three equal-spaced rows and their heights.
It excludes the main-skill panel bottom and refuses to invent a grid without
both headers. The existing colored-card path remains available for other crops.

Real screenshot geometry at a 480px probe: first row y553/562/552 for Raticate,
Dodrio and Typhlosion respectively, with 75px row spacing. All 15 regions were
located. Public-browser OCR initially matched 14/15; Raticate's remaining bonus
was read with two duplicated voiced kana. Located bonus cards now permit at
most two dictionary edits with a unique result. Other names permit one edit;
S/M/L suffixes must still match. Global OCR never assigns approximate labels.

Anonymous fixtures retain the 15 local OCR strings and screenshot ground truth.
No complete user screenshot, nickname or status bar is published. White-border,
missing-header, wrong-panel, ambiguity and grade-preservation regressions remain
in check_image_import.cjs. This three-image result does not establish accuracy
for all game layouts. Species-image matching is unchanged; ingredient and level
improvements remain separate work. Reading does not save a Box record.
