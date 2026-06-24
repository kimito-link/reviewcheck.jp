# SEOページ設計

口コミ・MEO・店舗集客の検索意図に沿ったページ群。各ページは末尾スラッシュ統一・canonical・OGP・構造化データ（ProfessionalService / FAQPage / BreadcrumbList）付き。

## 狙うキーワード（主要）

Google口コミ / Google口コミ 増やす / Google口コミ 改善 / Google口コミ 対策 / Googleレビュー / Googleマップ 口コミ / Googleビジネスプロフィール 口コミ / MEO対策 / MEO 口コミ / 店舗 口コミ 改善 / 口コミ 集客 / 悪い口コミ 対策 / 低評価口コミ 対策 / 口コミ返信 / Google口コミ 返信 / Google口コミ 削除 / Google口コミ 星評価 / Google口コミ 競合比較 / Google口コミ 診断 / Googleマップ 集客 / 選ばれるお店

## ページ一覧

| URL | タイトル | 主な狙い |
|---|---|---|
| `/` | 口コミチェック.jp｜あなたの店舗は選ばれるお店ですか？ | 指名・全般・診断入口 |
| `/check/` | 無料で口コミ診断 | 「Google口コミ 診断」 |
| `/google-review-check/` | Google口コミ診断｜星評価・口コミ数・競合との差を無料チェック | 「Google口コミ」「Googleレビュー」 |
| `/review-improvement/` | Google口コミ改善｜星評価・口コミ数を増やして選ばれる店舗へ | 「Google口コミ 増やす/改善」 |
| `/meo/` | MEO対策｜Googleマップで選ばれる店舗づくりをサポート | 「MEO対策」「Googleマップ 集客」 |
| `/review-reply/` | Google口コミ返信サポート｜低評価・悪評レビューへの返信方針 | 「口コミ返信」「Google口コミ 返信」 |
| `/bad-review-measures/` | 悪い口コミ対策｜低評価レビューへの正しい対応と改善導線 | 「悪い口コミ 対策」「低評価口コミ 対策」「Google口コミ 削除」 |
| `/competitor-review-comparison/` | Google口コミの競合比較｜あと何件で競合に追いつけるか診断 | 「Google口コミ 競合比較」 |
| `/report/[id]/` | Google口コミ診断結果｜選ばれやすさ・競合比較レポート | 共有・再診断（noindex検討可） |

## 構造（各サービスページ共通）

ヒーロー（H1・リード・CTA）→ お悩み → できること → 進め方 → 料金 → FAQ → 関連メニュー＋免責 → 最終CTA。
データは `apps/web/lib/seoPages.ts` の `SEO_PAGES` に集約。新規ページはここに1エントリ追加し、`app/<slug>/page.tsx` を作るだけ。

## 内部リンク

`packages/config/src/navigation.ts` の `MAIN_NAV` / `INTERNAL_LINKS` / `FOOTER_LINKS` を単一情報源とし、ヘッダー・フッター・トップから相互リンク。

## 今後

- 業種別ページ（飲食店 / クリニック / 美容院 / 整体院 / 士業）を追加すると裾野が広がる。
- 地域 × 業種（例: 渋谷 美容院 口コミ）は需要を見て検討。
