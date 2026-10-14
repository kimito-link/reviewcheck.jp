# Codex 実装指示書: 料金ページ「カードで申し込む」の控えめ表示（相談を主役に）

- 日付: 2026-07-10 ／ 発注: 司令塔セッション（この1枚だけで着手できること）
- リポ: `reviewcheck.jp`（pnpm monorepo・Next.js App Router・テストランナー無し）
- 起点: **必ず `git fetch && git switch -c feat/plan-checkout-tone origin/main` から**（origin/main = aa7bbb4 以降）

## 背景（なぜやるか）

外部アドバイザー（石川さん）から「料金ページの『カードで申し込む』ボタンは、いったん外した方がよいのでは」という指摘があった。
ただしこのボタンは カード決済 → 監視サブスク自動スタート まで繋がる自販機の入口なので**外さない**。
折衷案として「**ボタンは残したまま、視覚的な主役を『相談』に譲る**」を実装する。
（意図: いきなり決済を迫る圧を消しつつ、決済したい人の導線は1タップのまま残す）

## 変更対象（この1ファイルだけ）

`apps/web/components/PlanCheckoutButton.tsx`

現状の purchasable プランの表示:
1. 主ボタン（featured なら amber の塗り・それ以外は青枠）=「カードで申し込む」→ Stripe Checkout
2. その下に小さいテキストリンク「まず相談したい方はこちら」→ `/contact/?topic=...`

## 実装内容（視覚ヒエラルキーの入れ替え）

purchasable プランの表示を次に入れ替える:

1. **主ボタン（現在の `cls` のスタイルをそのまま流用・featured 分岐も維持）**:
   ラベル「**まず相談する（無料）**」・リンク先 `contactHref`（既存の `/contact/?topic=...`）。
   `<a>` タグでよい（決済処理は付けない）。
2. **副ボタン（控えめ・その下）**: ラベル「**カードでそのまま申し込む**」。
   既存の `startCheckout()` を**そのまま**呼ぶ `<button>`。スタイル例:
   `mt-2 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:opacity-60`
   （既存画面の Tailwind 語彙に合わせること。amber の塗り・青の太枠は使わない＝「控えめ」の実体）
3. loading 中ラベル「決済ページへ移動中…」と `error` 表示の仕組みは副ボタン側に**そのまま維持**。
4. `!purchasable` 分岐（「見積り・相談する」）は**一切変更しない**。

## 絶対に変えないもの（地雷）

1. **決済ロジック全部**: `startCheckout()` の中身・`resolveRefCode()`・`/api/checkout` への POST・`needsConfig` フォールバック・エラーハンドリング。1文字も変えない。
2. **`apps/web/components/PlanCards.tsx` に触らない**（別作業者が並行作業中。props の変更も不可＝PlanCheckoutButton の props シグネチャ `{planKey, topic, purchasable, featured}` を維持）。
3. 他ファイルへの変更ゼロ。`git diff --stat` が PlanCheckoutButton.tsx 1ファイルであること。
4. git add は**個別パス厳守**（`-A` / `.` 禁止）。ローカルに他者の未コミットファイルがあっても触れない・巻き込まない。
5. 文言に「必ず」「絶対」「今すぐ」等の断定・煽り語を足さない（景表法配慮の社内規約）。

## 受入基準（機械的な完了判定）

1. `pnpm typecheck` 通過。
2. `git diff origin/main --stat` の変更が `apps/web/components/PlanCheckoutButton.tsx` のみ。
3. dev サーバー（`pnpm dev`）で `/plans/` を開き:
   - featured プラン: 主ボタン=amber塗り「まず相談する（無料）」／副=控えめ枠「カードでそのまま申し込む」
   - 非 featured プラン: 主ボタン=青枠「まず相談する（無料）」／副=控えめ枠
   - 副ボタン押下で `/api/checkout` への POST が発火する（DevTools Network で確認。鍵未設定環境なら `/contact/` へフォールバックすることの確認でも可）
   - 非 purchasable プラン（Pro 等）の表示が現行と完全一致
4. PR は main 向け・タイトル例 `feat(plans): 申込ボタンを控えめ表示にして相談を主役化（石川さん指摘①の折衷）`。PR 本文に before/after のスクショを貼る。

## 参考

- 石川さんへの確認メモ（原文・stash 内 `_docs/ishikawa-round2-questions.md`）: 「ボタンは残したまま見え方だけ控えめにする、という手もあります」→ 本タスクはこの折衷案の実装。
- 石川さんの意図が「自動申し込み導線自体まだ早い」だった場合は撤去に切り替える可能性があるため、**実装は表示の入れ替えに留め、ロジックの削除・簡略化はしない**（可逆性の確保）。
