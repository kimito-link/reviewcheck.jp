# 原価の守りと黒字の式（reviewcheck.jp）

正本ポリシー: `ai-generic-rules/docs/policies/COST_SAFETY_POLICY.md`（§A 黒字の式・§3 守りの6層）。
このファイルは reviewcheck.jp での当てはめ。**数字はすべて提案値**（価格・無料枠・予算の最終決定は運用者）。

## 1. 有料呼び出しの一覧

| 呼び出し | どこから | 1回の原価（見積り） | 守り |
|---|---|---|---|
| Google Places Text Search＋Place Details（店舗の特定・口コミ） | `/api/diagnose`（匿名） | 9円 | キャッシュ → IP上限 → 日次予算（fail-closed） |
| Google Places Nearby Search（周辺競合） | `/api/diagnose`（匿名） | 6円 | 同上 |
| Google Places Nearby Search（現在地の候補） | `/api/nearby`（匿名） | 6円 | 同上 |
| Google Places（監視スキャン） | `/api/monitor/run`・`monthly-report`（cron） | 15円/店 | `CRON_SECRET` 必須（未設定なら拒否） |
| Groq（AIからの見え方） | `/api/ai-probe` | 0円（無料枠モデル） | キルスイッチ・24h CDN キャッシュ |

見積りの根拠（`packages/core/src/costguard/index.ts` の `PLACES_COST_YEN`。1ドル=150円・切り上げ・Google の月間無料枠は数えない＝保守的）:
Text Search Pro $32/1000・Place Details Enterprise+Atmosphere $25/1000・Nearby Search Enterprise $35/1000。
**未確認**: 実際の請求 SKU（Cloud Console の請求レポートで照合すること）。

## 2. 黒字の式（§A-4 の表・提案値）

| 項目 | 内容 |
|---|---|
| 原価 c | 新しい店の診断 1件 = **15円**（店舗 9円＋競合 6円）。同じ店の再診断は 24時間キャッシュで **0円**。現在地候補 6円 |
| 無料枠 F | 匿名は人を数えられないので「人ごと」ではなく**全体で1日の予算**（下の行）。IP ごとに新しい店の診断 約15件/日（上限 30 回＝店舗と競合で1回ずつ）、現在地候補 10回/日 |
| 有料 P/N | 継続監視 5,500円/月（`MONITOR_PLAN_AMOUNT_JPY`、1店につき月1回以上のスキャン＝15円〜）。改善プラン Light 33,000円/月・Standard 66,000円/月（原価はほぼ人件費。Places の原価はわずか） |
| 粗利（監視 1件・月） | 5,500 − 決済手数料 約200 − スキャン原価（月4回なら 60円）≒ **約5,240円** |
| 損益分岐の課金率 r* | 匿名の予算を毎日使い切った最悪の月（45,000円）を、監視契約だけで回収するには **約9件/月**。診断1件あたりで見ると r* = 15 ÷ 5,240 ≒ **0.3%**（新しい店の診断 350件に1件が監視契約で黒字） |
| 匿名の全体予算 | **1,500円/日**（`PLACES_ANON_DAILY_BUDGET_YEN`。新しい店の診断 100件/日。キャッシュに当たる診断は数えない） |
| 最悪の日の損 | 匿名 1,500円＋監視スキャン（契約店舗数 × 15円 × 実行回数）。月 45,000円＋契約数に比例する分（契約収入で賄える） |

★無料の診断が増えてもキャッシュに当たる分は原価 0、当たらない分も 1,500円/日で頭打ち。
契約（監視・改善プラン）は原価の数百倍の価格なので、**利用者が増えるほど利益が増える**形になっている。

## 3. 守りの6層（実装の場所）

| 層 | 実装 |
|---|---|
| L0 提供元の物理上限 | **未設定（運用者の作業）**。Google Cloud Console → Places API (New) → 割り当て で「1日あたりのリクエスト数」を下げる。提案: Text Search 300/日・Place Details 300/日・Nearby Search 600/日（上の予算の約3倍。監視スキャン分を含む余裕）。予算アラートは止めないので割り当てで止める |
| L1 キルスイッチ | `PAID_CALLS_DISABLED=1`（Places・Groq とも停止。手入力の診断は動く） |
| L2 日次予算の予約 | `reserveDailyBudget`（INCRBY で先に積む・超えたら戻して拒否・KV 未接続／env 不正なら拒否） |
| L3 キャッシュ | KV に正規化キーで保存。店舗 24h・見つからなかった店 6h・競合 24h・現在地候補（座標を約100mに丸めて）24h |
| L4 1人あたりの上限 | `hitDailyLimit`（IP ごと・1日・KV エラー時は通さない）。費用が出る呼び出し（キャッシュに無いとき）だけ数える |
| L5 原価の設計 | 匿名の診断は Places 2〜3回の定数。重い処理なし |
| L6 止まったときの見せ方 | 「本日の自動取得の無料枠が終了しました」＋手入力で診断できる案内。競合を取らなかったときは「未取得」と明示（「競合なし」「良好」と言わない）。現在地候補も「候補なし」と言わない |

テスト: `packages/core/src/costguard/costguard.test.ts`（上限を小さくすると拒否される・KV が落ちたら拒否・secret 未設定の cron は拒否）。
機械検査: `github/` 直下で `node ai-hub/bin/cost-scan.mjs --repo reviewcheck.jp`（`.cost-guard.json` で守りの場所を宣言）。

## 4. 本番に入れる前に必要なこと（★この変更は fail-closed）

1. **Vercel の本番に KV（Upstash）が接続されていること**（`KV_REST_API_URL`/`KV_REST_API_TOKEN` または `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`）。
   未接続だと Places は呼ばれず、すべての診断が「手入力してください」になる。
2. **`CRON_SECRET` が設定されていること**。未設定だと月次レポートの cron も拒否される
   （Vercel Cron は `CRON_SECRET` があれば自動で `Authorization: Bearer` を付ける）。管理用の `/api/monitor/targets` は `ADMIN_SECRET`（無ければ `CRON_SECRET`）。
3. 他の自社製品のブラウザから `/api/diagnose` を呼んでいる場合は `CORS_ALLOWED_ORIGINS` に足す
   （既定は `https://reviewcheck.jp`・`https://www.reviewcheck.jp` だけ。Chrome 拡張は host_permissions で呼ぶので不要）。
4. L0 の割り当て上限を Cloud Console で設定する。
