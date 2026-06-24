# 口コミチェック.jp / Review Check Site

> **あなたの店舗は、選ばれるお店ですか？**
> 店舗名またはGoogleマップURLを入れるだけで、Google口コミ（星評価・口コミ数）の状態・競合との差・「選ばれやすさスコア」・「あと何件で追いつけるか」を無料診断し、口コミ改善・レビュー返信・MEO対策・悪評対策の相談につなげる入口サービス。

運営ブランド: **リバースハック（reverse-Re:birth hack）**。
姉妹サービス「マルウェアチェック.site」と同一思想（診断を入口に、改善・相談へ送客）。

---

## このサービスの考え方（LTFV × 始めの気軽さ）

会議ハーネス（マルチLLM）での検討結果を統合した方針：

1. **始めの気軽さ**: 最初の一歩は「店舗名 or GoogleマップURL」の **1フィールドのみ**。`デモで試す` で即体験。
2. **損失は事実ベースで見える化**: 「あと◯件・◯点」「競合順位」など**計算根拠が透明な数字**でフック。金額（円）の損失額は**捏造しない**（不信・ポリシー違反の回避）。
3. **LTFVの導線**: 無料診断 →（詳細レポート）→ 口コミ改善・MEO相談 → **月額モニタリング**で「放置すると競合に抜かれる」を継続理由に。
4. **正当性の厳守**: 口コミ購入・やらせ・競合への低評価工作は一切しない。全結果に免責とポリシーを明示。

---

## ディレクトリ構成（モノレポ / pnpm workspace）

```
reviewcheck.jp/
├─ apps/
│  ├─ web/                 # Next.js (App Router) 本体：LP・診断ツール・SEO・API・PWA
│  ├─ chrome-extension/    # Chrome拡張 (Manifest V3, 最小権限 activeTab)
│  └─ mobile/              # 将来のiOS/Android化（Capacitor）プレースホルダ
├─ packages/
│  ├─ core/                # 診断ロジック正本（型・スコア・シミュレータ・競合・プロバイダ）
│  ├─ config/              # サイト定数の単一情報源（site/cta/pricing/navigation/faq）
│  └─ ui/                  # 共有UI（ScoreMeter / ScoreBadge / StarRating / StatCompare）
├─ docs/                   # api-design / seo-pages / privacy-policy / terms / chrome-store
├─ scripts/generate-icons.mjs
├─ DESIGN.md               # ブランド/デザインシステムの単一情報源
└─ pnpm-workspace.yaml
```

### 共有ロジックは `packages/core` に集約

- `types/` 診断の共通型（StoreInput / Competitor / DiagnosisResult 等）
- `scoring/` 選ばれやすさスコア（0〜100・透明な要素別配点）
- `simulator/` 「あと何件で追いつけるか」（`(rating*count + 5n)/(count+n) >= target` を解く）
- `competitor/` 競合比較（平均・差・順位、最大5件）
- `providers/` 店舗データ取得（`GooglePlacesProvider` / `MockStoreProvider` / `fetchStore`）
- `diagnose()` これらを束ねる純粋関数。Web・拡張・モバイルで共通利用。

---

## 主な機能

- **店舗検索・入力**: 店舗名 / GoogleマップURL / Place ID対応設計。APIキー未設定時はモックで動作。
- **口コミ診断**: 星評価・口コミ数・選ばれやすさスコア・改善ポイント。
- **競合比較**: 競合を最大5件追加し、星評価・口コミ数の差と順位を表示。
- **シミュレーション**: 目標評価（競合平均/任意）に対し、星5のみ・星4-5混在・星4中心の複数パターンで必要件数を試算。
- **結果ページ**: `/report/[id]/` はDB不要のステートレス共有（idは入力JSONのbase64url）。
- **SEOページ群**: `/google-review-check/` `/review-improvement/` `/meo/` `/review-reply/` `/bad-review-measures/` `/competitor-review-comparison/`。
- **Chrome拡張**: Googleマップ閲覧中にワンクリック診断（`activeTab`のみ・常時収集なし）。
- **PWA**: `manifest` + `sw.js`。将来Capacitorでアプリ化可能。

---

## セットアップ

前提: Node.js 20+ / pnpm 10+

```bash
pnpm install
pnpm icons          # ブランドロゴから各サイズアイコンを生成（sharp）
pnpm dev            # http://localhost:3000
```

その他:

```bash
pnpm typecheck      # 全パッケージ型チェック
pnpm lint           # web のLint
pnpm build          # 本番ビルド
pnpm ext:zip        # Chrome拡張の提出用zip
```

> 注: 本リポジトリはOneDrive配下にあり、`next build` の追加ワーカー（lint/型チェック）がファイルロックでクラッシュすることがあるため、ビルド時のlint/型チェックは無効化し（`next.config.ts`）、`pnpm typecheck` / `pnpm lint` で個別に実施する運用にしています。

### 環境変数（任意・未設定でも動作）

```
GOOGLE_PLACES_API_KEY=...   # 設定すると実データ取得に自動切替。未設定ならモック。
```

詳細は `docs/api-design.md`。

---

## Vercel 公開手順

1. GitHubにpush → Vercelで New Project → このリポジトリを選択。
2. **Root Directory**: `apps/web` を指定（モノレポ）。Framework は Next.js 自動検出。
3. Build Command / Install Command は既定でOK（pnpm 自動検出）。
4. **Environment Variables** に `GOOGLE_PLACES_API_KEY`（使う場合）を設定。
5. **ドメイン**: `reviewcheck.jp` を追加。`www.reviewcheck.jp` は `reviewcheck.jp` へリダイレクト（middlewareでwww無し統一）。`http→https` はVercel側で強制。
6. デプロイ後、`/sitemap.xml` `/robots.txt` `/manifest.webmanifest` を確認。

> サービス名・ドメインは `packages/config/src/site.ts` の `SITE` を変えれば全体に反映されます（後から変更しやすい構成）。

---

## Chrome拡張の公開

`apps/chrome-extension/README.md` と `docs/chrome-store-description.md` を参照。
`pnpm ext:zip` でzipを作成し、Chrome Web Store のデベロッパーダッシュボードから提出。

---

## 重要なポリシー

この診断はGoogleマップ等の公開情報や入力情報をもとにした簡易診断です。検索順位・来店数・口コミ増加・星評価の改善を保証しません。**口コミの購入・偽レビュー・やらせ・競合への低評価工作などの不正行為は一切行いません。** Googleのポリシーに違反しない正当な口コミ改善のみを支援します。

---

## ロードマップ（優先度順）

1. ✅ Web版LPと診断ツール（動く状態）
2. ✅ 星評価シミュレーター・競合比較
3. ✅ 広告用LPの見た目
4. ✅ SEOページ群
5. ✅ Chrome拡張
6. ⏳ Google Places API 本接続（キー設定で有効）
7. ⏳ PWA強化 / iOS・Android（Capacitor）
8. ⏳ 業種別・地域別ページ、月額モニタリングのダッシュボード
