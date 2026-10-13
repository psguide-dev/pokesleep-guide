# Berry role trial, v604

Received `PSN_Enigma_berry_usable_20261013.zip` via Biblo's 16:35 handoff.
The reference engine commit is v602 `fe9c4ae62815b623653d21ac3c2a6dba36e3d87d`.
v603 added an observation hook only; this integration reuses it without applying
the two duplicate daily-engine patch hunks.

Coverage: 154 ingredient/level contexts for Butterfree, Raticate, Raichu,
Dodrio, Meganium, Typhlosion, Feraligatr and Walrein. Levels 50/60/70/80;
80 uses the current formula as a prediction. Normal registration remains capped at 70.

Role evaluation normalizes ribbon hours to zero and main-skill level to one.
Actual daily forecasts retain saved values. Only the selected evaluation level
is simulated, with a bounded 64-entry cache. Missing required inputs or references
yield a pending result, never a fabricated configuration or zero score.

Standard is the equal-design-weight median; ideal is the maximum from that same
reference population. These are not observed capture probabilities or percentiles.
Trial position is `(dailyBerryEnergy-standard)/(ideal-standard)`;
S >= .90, A >= .60, B >= .25, C >= -.25, D below. Standard is C.
No food value or skill-created energy is added to the berry axis.

Runtime data lives in `templates/core/14-berry-role.html`; the original reference
configurations/provenance are retained in `tests/fixtures/berry-role-references.json`.
Tests reproduce all 154 medians and maxima, verify ribbon/skill normalization,
selected-level/cache behavior, missing-input handling, and saved-forecast equality.
The daily observation regression and existing delayed evaluation tests also run in CI.

Food and skill evaluations keep their existing path. A dedicated detailed
evaluation page remains a separate task. Desktop public-page verification is not
an iPhone real-device or empirical in-game yield validation.
