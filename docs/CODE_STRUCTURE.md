# 編集元と参照の境界

`master/`は種族・スキル・料理等のマスター、`templates/`はHTMLとJavaScript、`styles/`はCSS。`PSG_build_master.py`が順序を決めて組み立てる。`review.html`、`PSG_source_template.html`、`PSG_styles.css`は生成物であり直接編集しない。公開はGitHub Actionsのビルドから行う。

## 種族・姿の参照

`templates/01-species-catalog.html`はマスターと画像の初期接続後、Boxを読み込む前に実行する。

| 用途 | 参照先 | 注意 |
| --- | --- | --- |
| 全国番号・明示IDから個体の種族を解決 | `PS_SPECIES(item, catalog)` | 不正ID・番号の不一致・曖昧なサイズはnull。通常姿へ置き換えない |
| 個別の姿を解決 | `PS_FORMS.resolve(speciesId)` | Box個体は上記の番号整合チェックも必要 |
| 通常と姿別の全レコード | `PS_SPECIES_CATALOG.all(catalog)` | 248件。画面に応じてdexVisible等を絞り込む |
| 共通のID生成 | `PS_SPECIES_CATALOG.key(species)` | 通常は4桁番号_default、姿別は固有speciesId |
| Box登録候補と並び | `PS_SPECIES_CATALOG.box()` | 通常のdexVisible、姿別のboxEligibleを維持 |
| 図鑑の代表エントリー | 通常マスター＋`PS_FORMS.dexEntries` | サイズの代表表示を含む235項目。全248件の集合と区別 |

マスターは種族の基本能力、Boxは個体の選択食材・解放・サブスキル・ミュウのセット効果を保持する。全件集合を取得しても、未対応の日産や未確認の出現条件が計算可能になったとは扱わない。

## コア内部

`12-core-controller.html`は共有状態と定数、`core/01-box-storage.html`はBox正規化・読み込み・保存。以後の`core/`・`team/`・`box/`は同じコントローラー内へ組み立てられる。関数宣言は後方参照できるが、初期化時に呼ぶグローバルは先に読み込む。

日産計算は次の責務に分かれる。すべて同じコントローラー内に組み立て、計算順序を維持する。

| 編集元 | 責務 |
| --- | --- |
| `day/01-calculation-helpers.html` | 種族参照のラッパー、発動在庫期待値、きのみLvエナジー、食事回復、ブーストの種数 |
| `day/02-member-context.html` | 個体の食材選択・不足データの検証、日産計算用の個体状態 |
| `day/03-skill-effects.html` | 回収境界での回復・ランダム食材・追加おてつだい |
| `21-day-calculator.html` | 未対応チームの保留、時間帯・回収・満杯・睡眠、チーム集計 |

`core/09-day-view.html`と`box/02-daily-forecast.html`は結果表示、`box/05-actions.html`は編集操作。日産保留を0や部分合計に変換しない。Box保存キーとバックアップ形式は構成整理だけで変更しない。

## 笛・出現匹数の責務

| 編集元 | 責務 |
| --- | --- |
| `whistle/01-calculator.html` | 笛1回分の個体計算・不足条件・チーム集計。DOMを持たない |
| `whistle/02-additive-recommendation.html` | きのみ／単一食材の加算型最適編成と既存重み付き参照計算 |
| `whistle/03-balanced-recommendation.html` | 指定割合で揃う食材量を最大化する編成探索 |
| `team/06-whistle.html` | 笛の表示・割合によるチーム提案・操作イベント |
| `fields/01-spawn-calculator.html` | 睡眠スコアから必要エナジーと観測範囲を計算 |
| `core/11-field-spawn.html` | 出現匹数表・出典の表示と入力イベント |

笛と出現匹数のCSSは `styles/16-whistle.css` と `styles/17-field-spawn.css` に分ける。結合順は既存CSSと同じ位置を維持する。`check_whistle.cjs` は計算ファイルを直接読み込み、表示コード内の文字列で切り出さない。v286は整理前と生成JavaScript・CSSが完全一致。

## 整理後の確認

ビルドと`check_fragment_assembly.cjs`で組み立て・構文を確認。種族参照変更は`check_species_catalog.cjs`（前版HTMLを任意指定して同値比較）、登録/保存変更は`check_all_pokemon.cjs`、姿の進化は`check_size_evolution.cjs`、候補表示は`check_form_providers.cjs`、計算は`check_daily_calculator.cjs`を使う。検証対象に応じて選び、一度に機能変更と構成変更を広げない。

計算の単体検証は`tests/daily_kernel.cjs`がビルド側のファイル順を読み取る。テスト専用の別実装や手書きの第二の順序を持たない。構成変更時は`check_daily_refactor.cjs <前版の21-day-calculator.html>`で全結果を比較できる。v274は1666条件で整理前と一致。

笛の編成検証は `tests/whistle_kernel.cjs` が本番の結合順を読み取り、推定値と最適編成を別々の責務で検証する。v354では関数の内容・結合結果は変更しない。

## スキル一覧と育成資料の表示

`17-skill-controller.html` は情報タブのスキル検索・レベル効果・所有種リンク、`skills/02-friendship-reference.html` はフレンドメダル検索・保証仕様・サブスキル育成資料の表示を担当する。同じスクリプト内へこの順で連結し、既存の初期化条件と共有catalogを維持する。独立scriptタグで囲まない。v355は処理内容・実行順を変えず分離のみ。

## 図鑑詳細の見出し

`templates/detail/03-identity.html` の `renderDexHeading` が番号・名前・衣装/サイズ選択・前後移動をまとめて描画する。`detail/07-navigation.html` はURL移動・履歴と文書タイトルのみを扱い、描画済みのh2を名前だけで上書きしない。画像再表示でも同じ見出し関数を使う。スマホのタイトルは番号＋名前の行と選択欄を縦に配置する。戻るの表示・押せる範囲は `styles/10-page-headers.css` の共通指定を維持する。

## 食材・料理の構成整理（v466）

食材は `ingredients/01-index.html`（共通参照）、`02-details.html`（担当・対応料理・出典）、`03-list-view.html`（検索・並び順・一覧）、`04-events.html`（操作・初期化）に分離。料理は `recipes/03-cooking.html`（Lvとエナジー）、`03-pot-settings.html`（鍋計算・保存）、`03-reference-tables.html`（資料表）に分離する。これらは同じ料理コントローラー内の断片であり、独立したscriptタグで囲まない。ビルド順・初期化順・関数の内容を維持し、v465と生成HTML全体がバージョン表示以外は一致する。CSS・在庫保存・日産・収集時間・交代比較には変更を加えない。
