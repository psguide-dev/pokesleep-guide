# 図鑑モジュール

読み込み順は `PSG_build_sources.py` が管理します。元のクロージャと順序を保って連結する構成です。各断片を単独の script で囲まないでください。

| 微調整する内容 | 編集先 |
| --- | --- |
| 一覧の配置・検索欄 | 01-list-screen.html |
| 一覧のカード・寝顔登録数 | 00-list-view.html |
| 一覧の余白・文字・画像サイズ | ../../styles/dex/01-list-cards.css |
| 詳細の配置 | 02-detail-screen.html |
| 詳細の状態・DOM参照 | 03-detail-controller.html |
| 寝顔・フィールド | 04-sleep-and-fields.html |
| 基本能力・姿切り替え | 05-identity.html |
| 食材表示 | 06-food.html |
| 進化 | 07-evolution.html |
| 詳細を開く・戻る・履歴 | 08-navigation.html |

`00-card-name.html` の名前整形はボックスでも使います。フィルター・一覧の共通状態とイベントは core/05-navigation-and-filters.html、20-core-initialize.html に残します。図鑑ルートは01-detail-routing.html、カタログ接続は13-catalog-adapter.htmlです。

スキル表示は ../detail/05-skill*.html と ../skills/ を共通のまま使います。画像は ../images/、マスターは master/、ボックス一覧は ../core/06-lists.html に残します。共有のCSSは styles/ の既存ファイルを使います。

通常種や姿の追加はマスターを編集します。今回の分離では保存形式、計算、DOM、見た目を変更していません。

検証: python3 PSG_build_master.py → .github/workflows/build-review.yml の必須チェック。比較基準がある場合は node tests/check_fragment_assembly.cjs <基準フォルダー> でJavaScript完全一致を確認できます。
