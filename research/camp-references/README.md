# キャンチケ共通条件（v631）

共通設定は既存の `psg-day-settings-v1.goodCamp`。未設定はあり、保存済みのなしを維持する。チーム・鍋に加えてボックスと個体評価へ適用する。ブラウザで戻る場合・同じサイトの別タブの変更も再読込する。

個体の標準条件は回収4時間・開始げんき100・食事3回・フィールド補正なしを維持し、キャンチケだけ共通設定へ接続する。ボックスの括弧内は反対条件。理想比・順位は同じ条件の基準と比較する。個体の登録値は変更しない。

## 基準

- 食材83種、Lv60/70/80、1,482条件をON/OFFそれぞれ用意する。
- きのみ73種、Lv50/60/70/80、基本292条件・詳細スキルLvを含む332主軸条件と1,036換算込み条件を両条件で用意する。
- スキル88種、Lv50/60/70/80、352条件を両条件で用意する。
- OFFは共通日産エンジンで独立に全列挙する。ON値の倍率換算をしない。
- 食材のONは全1,482条件を従来の固定ON呼び出し・保存済み日産・食材別数量と照合して数値不変を確認した。条件選択引数と説明文の変更に伴う指紋更新は `audit-on.cjs` と `on-audit.json` に記録する。既存3種54条件の内容は不変。
- きのみ・スキルの生成は既存全列挙器を移植。等価な補正状態をまとめ、元の構成数を重みに持つ。未解放のおてつだいボーナスを統合キーに入れない。ライチュウ・デンリュウの全4レベルを元の全構成ループと照合し、理想構成と分布区間まで一致を確認した。

## 再生成

`PSN_REFERENCE_COMMIT=<照合済みの40桁SHA> node research/camp-references/run.cjs`

生成はオフライン専用。食材は既存台帳の対象IDを明示して生成器に渡す。6プロセスを上限に種類単位で生成し、食材は指紋・条件一致の途中結果だけ再利用する。ログと食材の種類別中間ファイルは公開しない。全条件がそろってから以下を実行する。

`node research/food-expansion-prep/assemble.cjs direct false research/food-expansion-prep/output-off`

`node research/food-expansion-prep/assemble.cjs recovery false research/food-expansion-prep/output-off`

`node research/camp-references/assemble.cjs`

ON/OFFのテーブル・通信中のPromise・エラーを分離し、計算キャッシュにも条件を含める。切替前の遅い応答はその条件の格納先だけを更新する。必要な種類だけ読み込む。OFFは `*_off` の別マニフェスト・ファイル群を使う。

## 検証

`node tests/check_camp_evaluation.cjs` は両条件の食材2,964件、きのみ/スキル1,368件、換算込み2,072件を検証する。理想100%、分布順位0%、登録値不変、条件別キャッシュ、切替後の遅い応答の分離も確認する。`check_camp_settings.cjs` は保存、再表示、別タブ、履歴復元を検証する。

## 転送パッケージ

OFFの169 JSONは `pack.py` で600KB以下の決定的な分割ZIP（LZMA）にまとめ、`data/manifest.json` とアーカイブをGitへ保存する。`PSG_build_master.py` はビルドの最初に `PSG_camp_reference_assets.py` を呼び、アーカイブと全ファイルのSHA-256、パス、件数を確認して展開する。公開先では従来どおり個々のJSONを必要分だけ取得する。再生成後は `python research/camp-references/pack.py` を実行する。元のON JSONとその読み込み先は維持する。

ラッタ・ドードリオの詳細比較用スキルLv.1〜6もON/OFFで対応する。`generate-berry-levels.cjs` はこの追加40条件を生成して既存のOFFファイルへ統合する。`run.cjs` の全種生成後に自動実行する。
