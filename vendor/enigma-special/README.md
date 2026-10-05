Source: Biblo consolidated Enigma handoff dated 2026-10-05, provisional and not game verified.
The kernel and effect table are copied unchanged. The browser adapter is templates/day/04-special-skills.html.

Stage 2 integrates direct energy, berry rewards, ingredients, immediate helps and base candy.
Recovery and energy loss now feed subsequent collection and trigger estimates through
templates/day/05-energy-feedback.html. This is a bounded expectation approximation,
not the upstream Monte Carlo simulator: target and energy correlations are projected to means.
Existing expected carry occupancy and stock caps remain. Unfinished helps retain their interval.
Normal teams keep their existing forecast path. Special recovery teams use discrete help completions.
Meals still use existing fixed times. Guarantees and exact low-energy target preference are omitted.
Pot/cooking integration lives in templates/day/06-pot-feedback.html. A shared pot distribution
contains at most 201 integer states; blocked activations retain stock and resume after cooking.
Pending stock is projected to per-member expectations, omitting joint stock/pot/energy correlations.
Cooking resets additions at the existing meal times, and capacity forecasts never mutate settings. Zone is fixed at the user input; predicted accumulation is reserved
for a future opt-in feature and must never write back to the user's input or saved conditions.
Manual Mago zone applies; held berry transfer is not counted as an additional reward.
Unknown additions are omitted explicitly. Random ingredient pools remain unspecified totals.
Expected trigger counts use an adjacent integer distribution. Stockpile starts at zero;
disguise starts eligible. Their bounded state distributions persist across the day's activations.
Individual skill food rewards are attributed to the caster, including helps performed by allies.
No intermediate rounding. Published totals use the site's final rounding policy.

Validation: node tests/check_special_skills.cjs and tests/check_energy_feedback.cjs and tests/check_pot_feedback.cjs;
upstream kernel 63, adapter 48 and dynamic model 31 cases checked in the handoff workspace.
