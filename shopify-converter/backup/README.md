# Shopify 商品説明のバックアップ

- `2026-10-17-description-before.json`：過去に登録した547商品の説明文を、今の書式（見出し20px太字・画像下の説明16px・空行の詰め）にそろえる前の元の状態（id・handle・descriptionHtml）。
- 元に戻すときは、このファイルの `descriptionHtml` を `productUpdate` で書き戻す。
