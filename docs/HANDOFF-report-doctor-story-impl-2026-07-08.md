# 引き継ぎ: 診断結果「医者の物語」レイヤー（所見カード）の実装（次チャット・別モデル）

- **状況更新 2026-07-10: P0＋P1 実装完了**（findings/＝辞書6種＋糸マップ純粋関数・FindingCard・ThreadMap・ReportView 挿入3行・probe）。probe 全件一致（禁句・境界値・色写像）・`pnpm typecheck` フル通過・実機確認済み（描画/mock非表示/閉時478px≤480・糸マップ色=スコア内訳と一致）。「次の一手」と糸マップは `<details>` 折りたたみ（設計§C-3 実装ノート参照）。
- 日付: 2026-07-08
- 3段構え(会議→Fable設計→実装)の段3=実装用の申し送り。段1・段2は完了済み。**設計の正本は別ファイル（必ず先に読む）**: `docs/DESIGN-report-doctor-story-2026-07-08.md`

## この設計の一番おいしいところ
15セクションある結果画面に「16個目」を足すのではなく、**診断書の表紙**を1枚挿す。測定事実の組合せに辞書引きで名前を付け（例:「星の比較差」「返信の空白」・全6種・決定的・LLMなし）、現在形の構造説明（「いま近くでお店を探している人は、この数字で見比べています」）が原因と予後を兼ね、保健指導3行（無料セルフケア/LINE見立て/月次モニタリング）が既存CTAへの物語の橋になる。**ReportView への差分は import 1行＋JSX 1行だけ**。

## 作業環境（最重要）
1. ブランチ **`feat/report-doctor-story` は作成済み**（origin/main=d258aa9 起点・クリーン）。ここで作業する。
2. **他者の未コミット作業15ファイルは `stash@{0}` に退避済み**（メッセージ「他者作業退避(fix/review-insights系…)」）。**stash に触れない・pop しない**。戻すのは他者側の仕事: `git switch fix/review-insights-false-positive && git stash pop`。
3. git add は**個別パス厳守**（-A / . 禁止）。コミット対象は本タスクの新規4ファイル＋既存2ファイル（各1〜2行差分）のみ。
4. 既存コード参照で迷ったら `git show origin/main:<path>` が正。

## いま何をやるか（設計§E）
- **P0-1** `packages/core/src/findings/index.ts` 新設: 所見辞書6種（設計§C-1 の実テキストをそのまま使う）＋`selectReviewFindings(result)`（優先順位 K1→K5・fail-closed・§C-2）＋禁句リスト＋`isFindingBannedFree`（§C-5）＋固定文定数（役割宣言・治療②③文）。`packages/core/src/index.ts` に `export * from "./findings/index";` を1行追加。
- **P0-2** `apps/web/components/FindingCard.tsx` 新設（§C-3 のレイアウト・既存 Tailwind 慣習 `rounded-2xl border border-slate-200 bg-white p-5 sm:p-6`）。`ReportView.tsx` に import 1行＋297行目 `</section>` 直後に `<FindingCard result={result} />` 1行。
- **P0-3** `scripts/probe-findings.ts`（`npx tsx` 実行）: 辞書全文字列の禁句照合（辞書オブジェクトを直接走査）＋境界値網羅（§D-5 と §E-2 の期待表）。
- P1（今回やらない）: ThreadMap.tsx 糸マップ（§C-4）。

## 受入基準（機械的な完了判定・設計§E）
1. `pnpm typecheck` 通過
2. `npx tsx scripts/probe-findings.ts` 全ケース一致（禁句0件・境界値・複合 K3+K4→primary=K3・全欠損→null・mock→null）
3. `git diff origin/main -- apps/web/components/ReportView.tsx` が2行のみ
4. finding=null 時に DOM が現行と完全一致
5. 375px 幅でカード高さ 480px 以下
6. 完了判定は **reality-checker に委任**。文言の景表法レビューは **store-guard**

## 絶対に踏むな（設計§D・§G の要約）
1. **reviewAnalysis（5件サンプル分析）を所見条件に使わない**。口コミ本文・flaggedKeywords を所見文に出さない（誤検知前歴 8b97a33＋名誉毀損の再配信防止）。
2. **undefined/null は常に不成立**（hasOwnerReplies===undefined を「返信なし」と誤認しない）。名付けられない中間状態は K0=非表示（fail-closed）。
3. **既存セクション・CTA・monitoringHref・buildLineConsultMessage・スコア帯出し分けに1文字も触れない**。既存セクションへの id 追加も禁止。
4. **辞書の外に表示文字列を書かない**（FindingCard に文字列リテラル直書き禁止）。未来断定・確率%・「危険/手遅れ/倒産」・幻の統計は禁句CIで機械排除。時制は現在形のみ。
5. **isMock・reviewCount===0 は全レイヤー非表示**。

## このタスクの外（人間論点）
- 所見名6種の語感の最終確認（ロミ判断。特に「星の比較差」「返信の空白」）
- P1 糸マップの着手判断（P0 の転換率を見てから）
- 本ブランチのコミット/PR 作成はユーザー指示があってから
