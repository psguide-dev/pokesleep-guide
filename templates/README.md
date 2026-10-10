# HTMLの編集場所

`PSG_build_master.py` は以下を `PSG_build_sources.py` の `TEMPLATE_NAMES` の指定順に連結し、`review.html` を生成します。従来の `PSG_source_template.html` は互換用の結合結果で、ビルド時に再生成されます。画面の変更は該当する `templates/` のファイルに加えてください。

| ファイル | 内容 |
| --- | --- |
| `01-shell-head.html` | 文書の先頭、画像設定、共通ヘッダー |
| `02-home.html` | ホーム |
| `03-box.html` | ボックス一覧 |
| `dex/01-list-screen.html` | 図鑑一覧 |
| `05-info.html` | 情報の入口 |
| `06-skills.html` | スキル一覧 |
| `06-ingredients.html` | 食材ページの検索・並び順・Lv切替・一覧の入口 |
| `07-recipes.html` | 料理一覧 |
| `08-fields.html` | フィールド |
| `dex/02-detail-screen.html` | 図鑑詳細 |
| `10-box-detail.html` | 個体詳細 |
| `11-navigation.html` | ナビゲーションと共通の画面構造 |
| `12-swap-engine.html` | 原本ES modulesからビルドする独立の通常おてつだい・交代計算 |
| `12-core-controller.html` | 共通状態・保存キー・ボックス読込保存、クロージャの開始 |
| `core/02-team.html` | チーム保存読み込み・構成・食材候補の集計 |
| `team/02-food-view.html` | チームの食材・対応料理表示 |
| `team/03-cards.html` | チームカード・選択保存・並び替え |
| `team/04-face-dock.html` | スクロール時の固定顔表示 |
| `core/03-profiles.html` | 寝顔記録の検証、フィールド・週の料理・好物・エリアボーナスの保存 |
| `core/04-backup.html` | バックアップ書き出し・復元プレビュー・確認・失敗時の保存復旧 |
| `core/05-navigation-and-filters.html` | 共通画面ナビ、検索・タイプ・食材・得意フィルター、代替アイコン |
| `core/06-lists.html` | ボックスカード一覧、チームへ登録する個体の選択 |
| `core/07-corrections.html` | レベル上限・サブスキル解放・性格と個体補正・チーム速度補正 |
| `core/08-fields.html` | フィールド選択・一覧・寝顔出現・好物・今週の料理の操作 |
| `core/09-day-view.html` | ホームの日産予想表示・キャンプ・食事・起床時げんきの操作 |
| `team/05-swap-assist.html` | Box対応・1食の食材別到達時間と改善探索・条件変更時キャンセル |
| `21-day-calculator.html` | ホームとボックス共通の日産近似計算 |
| `19-box-detail-controller.html` | ボックス詳細の共通参照・開く入口 |
| `box/02-daily-forecast.html` | 日産予想の接続・食材とスキル予想表示 |
| `box/06-growth.html` | 次の解放までの通常アメ・ゆめのかけら目安。現在EXP0・未確認条件の保留 |
| `box/03-view.html` | 個体詳細の表示更新 |
| `box/04-editor.html` | 進化系統・編集フォームの準備 |
| `box/05-actions.html` | レベル・お気に入り・育成・編集保存の操作 |
| `20-core-initialize.html` | 一覧イベント・追加削除・初期化、共通クロージャの終了 |
| `13-catalog-adapter.html` | 図鑑データの接続 |
| `dex/03-detail-controller.html` | 図鑑詳細の共通状態・DOM初期化、クロージャの開始 |
| `dex/04-sleep-and-fields.html` | 寝顔の表示・登録・保存、フィールド出現情報、登録情報の再読み込み |
| `dex/05-identity.html` | タブ切り替え、名前・前後ナビの表示、基本能力 |
| `dex/06-food.html` | 食材候補・数量・対応料理の表示 |
| `detail/05-skill.html` | マスター文言の数値着色・共通レベル値 |
| `detail/05-skill-copy.html` | 図鑑用の個別文言・改行・回復符号・食材候補画像 |
| `detail/05-skill-table.html` | きのみ・おてつだいの種類数別の表 |
| `detail/05-skill-view.html` | スキルのDOM更新・詳細レベルの配置 |
| `dex/07-evolution.html` | 進化条件・系統探索・通常進化・途中分岐・イーブイの表示 |
| `dex/08-navigation.html` | 詳細を開く処理、一覧への復帰、戻る／進む履歴、イベント接続、クロージャの終了 |
| `15-auto-images.html` | 自動画像処理の共通状態・読み込みキャッシュ、クロージャの開始 |
| `images/02-type-alignment.html` | タイプアイコンの可視領域の検出、中央配置 |
| `images/03-type-sheet.html` | 旧タイプシートの切り抜き、採用済みマスター画像を優先 |
| `images/04-catalog-assets.html` | ポケモン・きのみ・食材・スキルの画像パス接続 |
| `images/05-refresh.html` | 読み込み完了後の画面更新、クロージャの終了 |
| `16-swipe.html` | スワイプ操作 |
| `17-skill-controller.html` | スキル一覧の処理 |
| `18-recipe-controller.html` | 料理一覧の共通DOM・状態 |
| `recipes/02-ingredient-filter.html` | 食材アイコン・フィルター候補 |
| `recipes/03-providers.html` | 最終進化の食材拾得候補 |
| `recipes/03-cooking.html` | 比較Lv・実測値優先のエナジーとレベル表示 |
| `recipes/03-pot-settings.html` | 鍋試算・入力検証・設定保存と変更通知 |
| `recipes/03-reference-tables.html` | 鍋・経験値・アメの資料表 |
| `recipes/03-daily-supply.html` | 共通条件の日産量・専任収集負担・実際の構成・日産ティアと前提 |
| `ingredients/01-index.html` | 食材の共通DOM参照・名前の正規化 |
| `ingredients/02-details.html` | 担当ポケモン・対応料理・出典の詳細表示 |
| `ingredients/03-list-view.html` | 食材の検索・並び順・日産量と遅延詳細表示 |
| `ingredients/04-events.html` | 検索・並び順・レベル変更・資料への操作と初期表示 |
| `recipes/03-evaluation.html` | 料理3指標・評価モード・状態維持・評価基準 |
| `recipes/04-list-view.html` | 並び順・料理カード・遅延詳細表示 |
| `recipes/05-events.html` | 絞り込み・カテゴリ切替・料理を開く入口 |

ファイル境界は表示順を保つためのものです。新しい部品を追加する場合は、`PSG_build_master.py` の `TEMPLATE_PARTS` に挿入位置を指定してください。CSSは `styles/` を編集します。

12 → core/02 → team/02〜04 → core/03〜09 → 21 → 19 → box/02〜05 → 20 は同じスクリプトとクロージャの断片です。順番を変えたり単独の script タグで囲んだりしないでください。個体詳細はbox/各担当、HTMLは10、CSSは08-box-detail.cssで編集します。

18 → recipes/02〜05も同じスクリプトの断片です。v239は料理、チーム、Box詳細の順に担当別へ分割し、連結後のJavaScriptをv238と完全一致させています。保存キー・計算式・公開入口は変更していません。日産の計算そのものは21に残します。

ビルド後の構文検証：`node tests/check_fragment_assembly.cjs`。整理前とのJS完全一致を確認する場合は比較用リポジトリのパスを追加します。画面比較：`node tests/check_refactor_ui.cjs <比較用リポジトリ>`（Playwright Firefoxが必要）。

日産の基本数値検証：`node tests/check_daily_calculator.cjs`。UI確認とは別に24時間・げんき0・所持数十分の既知条件、キャンプ、満杯、未選択を検証します。

## ホーム・ボックスの共通処理を編集するとき

共通状態 `state` と `master`、保存キーは12にあります。チームの `team` はcore/02、週ごとのフィールド・料理設定 `fieldProfile` はcore/03で初期化します。これらは同じクロージャ内で共有し、windowに新しい状態を公開していません。

- カードの表示はcore/06、検索・絞り込みはcore/05、個体補正の計算はcore/07を編集します。
- ホームの日産の見せ方はcore/09、計算そのものは21を編集します。ボックスの日産も21を使います。
- フィールドの保存形式・週切替はcore/03、画面表示と操作はcore/08を編集します。
- バックアップはcore/04、通常の個体保存は12です。既存の保存キー・検証・復元確認・保存失敗時の処理を維持してください。
- 起動時のイベント接続と `window.PS` の公開は20です。後続の `13-catalog-adapter.html` がカタログを接続します。

v210では741行の共通コントローラーを担当別に分割しました。断片の連結は元の処理と完全一致し、生成テンプレート・review.htmlもバージョン表示以外v209と同一です。

## 図鑑詳細を編集するとき

14 → detail/02 → 03 → 04 → 05 → 06 → 07 は、同じスクリプトとクロージャの断片です。ビルド時にそのまま連結します。断片を単独のscriptタグで囲まず、順序を維持してください。共通状態をwindowへ追加公開する必要はありません。

- データ参照・状態：`V`、`byNo`、`skillOf`、`currentNo`、`currentTab` は14で用意します。
- 表示先：`hero`、`tabs`、`ability`、`sleep`、`field` は14で初期化します。
- 表示更新：07の `openPokemonDetail` が各表示関数を呼び出します。表示内容を変える場合は、その担当ファイルの関数を編集してください。
- 公開入口：`window.openPokemonDetail`、`window.openDexCard`、`window.PS_DETAIL_NAV` は07、寝顔再読み込みの `window.PSG_REFRESH_SLEEP_FOUND` は02です。既存の呼び出し元が使う入口を維持します。

v208の分割では処理内容を変更せず、断片の連結が元のコントローラーと完全一致することを確認しました。生成テンプレート・review.htmlも、Reviewのバージョン表示以外はv207と同一です。

## 画像処理を編集するとき

15 → images/02 → 03 → 04 → 05 も同じスクリプトの断片です。単独のscriptタグで囲まず、順番を維持してください。`catalog`、`assets`、`explicit`、`lookup`、`jobs` は15の共通状態です。公開入口 `PS_AUTO_ASSETS.ready` は05で設定します。

- タイプの位置合わせは02、旧シートからの切り抜きは03を編集します。採用済みの画像は描き直さず、表示用の画像だけを中央配置します。
- 未登録画像の自動探索は04を編集します。明示されたマスター画像を優先し、存在しないファイルは現在の表示を維持します。同じパスの読み込みは15のキャッシュを共有します。
- 読み込み後の一覧・詳細の再表示は05を編集します。
- ビルド側の画像パス・シート設定は `PSG_image_assets.py` にあります。`PSG_build_master.py` はこのモジュールを呼び出します。
- 顔シートの座標は `PSG_face_sheet.js`、画像のプレースホルダーと共通設定は `01-shell-head.html`、採用画像そのものは `master/` を編集します。

v209の整理でも、生成テンプレート・review.htmlはバージョン表示以外v208と同一です。画像ファイルと座標は変更していません。


v268：Boxは受領248レコードに対応。ミュウ/ダークライのmythicalStateは12-coreで検証、04-editorで入力、05-actionsで保存。通常個体のingredients/subskillsと別に解放状態を記録。core/07は解放済みAND到達Lvのみ有効、21-dayは特殊スキル含むチーム全体を保留。バックアップv5はcore/03・04、旧v1〜4読み込みを保持。

## v325 個体詳細の編集場所（2026-10-03）

- マークアップ：`10-box-detail.html`。ヘッダーのサブメニューに個体値設定・削除を集約。
- 表示更新：`box/03-view.html`、単体予想：`box/02-daily-forecast.html`。
- 編集欄の生成：`box/04-editor.html`、保存・フラグ：`box/05-actions.html`。
- 評価：`core/10-individual-evaluation.html`、育成：`box/06-growth.html`。
- スタイル：`styles/08-box-detail.css` の Individual editor セクションに入力欄を集約。
- 入力順：リボン → 食材 → サブスキル → スキルLv・役割 → 性格。
- favorite/training は編集フォームで上書きせず、詳細内の専用トグルで変更する。
- `review.html` / `PSG_source_template.html` / `PSG_styles.css` は生成物。直接編集しない。

## v355 スキル・育成資料を編集するとき

- `17-skill-controller.html`：スキル検索・レベル効果・所有種リンク。
- `skills/02-friendship-reference.html`：フレンドメダルの名前検索、保証仕様、サブスキルの育成資料・出典。
- 2ファイルは同じクロージャの断片として順に連結する。スクリプトを個別に開閉しない。
- v354の笛計算は `whistle/01-calculator.html`（収量）、`02-additive-recommendation.html`（加算型編成）、`03-balanced-recommendation.html`（割合バランス編成）を編集する。

### v427 図鑑の個別ページ

- `01-detail-routing.html`: `pokemon.html?species=種族・姿ID` のURL、移動前の検索/タイプ/食材/得意と位置をsessionStorageへ保存し、一覧へ戻った時に復元。
- `dex/08-navigation.html`: 通常の詳細呼び出しは別HTMLへ移動。初回表示と画像更新だけ `local:true` で同じページを描画。寝顔/フィールドタブはURLの `tab` に保持。
- 図鑑カードは通常のリンク。長押し・別タブ・ブラウザーの戻る/進むに対応。ボックス個体編集は変更しない。
- ビルドは共通テンプレートから `review.html` と `pokemon.html` を生成し、workflowで両方配信。生成HTMLを手編集しない。
- この版はページと履歴の分離。カタログ・計算コードは共用しており、初回転送サイズの削減やSEO最適化を実施済みとは扱わない。広告枠は未追加。

## 図鑑スキル表示の編集

05-skill → 05-skill-copy → 05-skill-table → 05-skill-view は同じクロージャの断片です。文言の変更はcopy、表はtable、配置はviewを編集します。共通のskillDescription / skillVariablesはマスター文言を保持し、図鑑の省略表記と分けます。各レベルのHTMLはviewで一度生成して配置判定と描画に使います。

作業環境が空の場合は `git clone --depth 1 https://github.com/psguide-dev/pokesleep-guide.git psn` で最新mainを復元できます。生成物を手編集せず、公開前にビルドとworkflowのチェックを実行します。

## v547 図鑑モジュール
一覧・詳細の編集場所と共通部分の依存は [dex/README.md](dex/README.md) を参照。読み込み順の正本は PSG_build_sources.py です。
