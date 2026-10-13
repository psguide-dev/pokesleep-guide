# Level and ingredient scan v607

The individual Lv line is now independently located by green text within the
orange summary card and read as one cropped line. Ingredient/subskill unlock
numbers do not enter that crop. A unique local reading takes priority over
full-image OCR; conflicting local values stay unknown. The explicit annotation
also preserves this reading through text-only reparsing.

Ingredient comparison is narrowed to the detected species' slot candidates.
The global best match must still belong to those candidates; narrowing cannot
invent a lower-ranked alternative. Normal comparison keeps .95 minimum cosine
similarity; species-constrained comparison uses .90 with .06 candidate margin.
These are matching thresholds, not accuracy probabilities.

Faded locked oil overlaps the cream circle and fragmented its connected region.
The locator now retains a partial region when it aligns with the complete Lv30
circle. Its observed height reconstructs the circle width. No unseen ingredient
is inferred from the unlocked icon. Lv1 retains the existing single-candidate
species fill; the covered Lv1 picture is not read.

Three provided screenshots produce correct Lv30/Lv60 vectors for soybean/apple,
cacao/cacao, and ginger/oil. Fixtures retain six anonymous icon vectors, not
complete screenshots. Tests cover impossible-species matches, empty images,
partial-circle reconstruction, reading conflicts and unlock-level isolation.
The expected individual levels are 30, 51 and 34; live OCR verification follows
deployment. Other species/forms and layouts are not fully validated.
