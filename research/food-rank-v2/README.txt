PSN food collection rank: 83 species, fixed ingredient patterns

Source delivery: PSN_food_collection_rank_83_species_20261017.zip
SHA256: 9dcdb4819b6206cf43869d61de74a79d2df0638cb55adc202e7b4b015362074b
Source calculation commit: 020204900e4d273867f83dbdf0b7f1035674b7b3

249 species/level files; 83 identities, 494 ingredient patterns, 2964 conditions.
Levels 60/70/80; both camp conditions. Level 80 is a projection.
Original configuration weights are retained (17000/59500/154700).
Recovery models retain skill probability in their signatures.
The four count-only specialists and mythical ingredient configurations are excluded.

prepare.py packages an explicitly supplied extracted delivery. It preserves every
output JSON byte and adds deployment metadata to the manifest. It does not
recalculate or replace the normal-food ideal references.

python3 research/food-rank-v2/prepare.py /absolute/path/to/extracted/delivery
python3 PSG_build_master.py

The build verifies the split transport and restores 250 deployment JSON files.
The page loads one manifest and only the required species/level file; its two
camp conditions share the same file. Invalid references remain pending.
The old two-species trial assets are superseded; their research generators are
retained as historical reproduction material, outside the deployed load path.
