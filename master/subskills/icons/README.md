# サブスキル画像の差し替え

画像ファイルの名前は `assets/subskills/manifest.json` のPNG名から拡張子だけを外したものです。例：きのみの数Sは `icons/berry_finding_s.webp`、スキル確率アップMは `icons/skill_trigger_m.webp`。PNG/JPEGも使えます。

未追加なら採用済み中央寄せv2の `assets/subskills/` のPNGを使います。旧SVG・旧配置版は破棄済みで復元しません。`data.json` の効果値には画像を入れません。画像を追加した後は `python3 PSG_build_master.py` で `review.html` を再生成します。
