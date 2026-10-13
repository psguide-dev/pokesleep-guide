# Local species image comparison, v605

Uses adopted full-body artwork, not OCR of nicknames. There are 244 distinct
fingerprint groups covering 250 species/form identities. Matching bytes are
derived from existing images; no user screenshot is included in production.
Duplicate artwork retains every possible identity and is never auto-resolved.

The orange individual-summary card locates the miniature artwork. Pale card
background is excluded, foreground bounds normalized, and 16x16 local color /
occupancy vectors compared. Only a small reference JSON is fetched on demand;
all screenshot processing remains on-device. No population enumeration or
server image upload is introduced.

Three provided screenshots (Raticate, Dodrio, Typhlosion) placed the correct
identity first against all references, both at native size and after the
production-size reduction. This is a regression sample, not an accuracy claim
for all species, costumes, regional forms, shiny artwork or other layouts.

Auto-selection requires error <= .09, runner-up margin >= .05 and a unique
identity. These are provisional thresholds, not confidence probabilities.
Ambiguous candidates are buttons for manual selection. Text/image disagreement
and multiple strong identities require review. No image-read result saves or
changes a Box record without the existing confirmation step.

The SP label also supports level extraction when a nickname hides the species.
Subskill slot detection and ingredient-image detection are unchanged here;
their previously diagnosed failures are separate pending work.

Rebuild numeric references with python3 scripts/build_species_fingerprints.py
after building review.html; the generator requires Pillow and NumPy.
Regression fixtures retain only coarse Pokemon appearance vectors, not full
screenshots, nickname text, status bars or other user-specific pixels.
