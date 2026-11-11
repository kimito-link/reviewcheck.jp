# 原価の守りと黒字の式（reviewcheck.jp）

正本ポリシー: `ai-generic-rules/docs/policies/COST_SAFETY_POLICY.md`（§A 黒字の式・§3 守りの6層）。
このファイルは reviewcheck.jp での当てはめ。**数字はすべて提案値**（価格・無料枠・予算の最終決定は運用者）。

## 1. 有料呼び出しの一覧

| 呼び出し | どこから | 1回の原価（見積り） | 守り |
|---|---|---|---|
| Google Places Text Search＋Place Details（店舗の特定・口コミ） | `/api/diagnose`（匿名） | 9円 | キャッシュ → IP上限 → 日次予算（fail-closed） |
| Google Places Text Search（同業の商圏。表に無い業種だけ Nearby） | `/api/diagnose`（匿名） | 6円 | 同上 |
| Google Places Nearby Search（現在地の候補） | `/api/nearby`（匿名） | 6円 | 同上 |
| Google Places（監視スキャン） | `/api/monitor/run`・`monthly-report`（cron） | 15円/店 | `CRON_SECRET` 必須（未設定なら拒否） |
| Groq（AIからの見え方） | `/api/ai-probe` | 0円（無料枠モデル） | キルスイッチ・24h CDN キャッシュ |

見積りの根拠（`packages/core/src/costguard/index.ts` の `PLACES_COST_YEN`。1ドル=150円・切り上げ・Google の月間無料枠は数えない＝保守的）:
店舗の Text Search Pro $32/1000・Place Details Enterprise+Atmosphere $25/1000。
同業は Text Search Enterprise（`rating` / `userRatingCount` を含む）$35/1000 ≒ 6円。FieldMask は `places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.location`。`location` は rating より下の項目なので、この見積りを上げない。口コミ本文は取らない。表に無い業種だけ Nearby Search Enterprise（同じ6円）。
競合キャッシュキーは `rc:comp:v3`（v2 は半径1.5km・5件。反映後、店ごとに1回だけ取り直す）。
**未確認**: 実際の請求 SKU（Cloud Console の請求レポートで照合すること）。

### 診断1回の呼び出し（キャッシュが無いとき）

| 入力 | Text Search | Place Details | Nearby Search |
|---|---|---|---|
| 店名 | 2（店の特定＋同業） | 1 | 0 |
| マップURLや placeId（店の特定が不要） | 1（同業だけ） | 1 | 0 |
| 上に加え、現在地の候補を開いたとき | 同じ | 同じ | +1 |

同じ店の再診断は24時間キャッシュで 0回。同業の再検索も24時間キャッシュで 0回。

運用中の1日上限（Places API (New)、2026-11-11 時点）: Text Search 200、Place Details 100、Nearby 100。
予算 1,500円/日は新しい店 100件で使い切る。店名診断100件は Text 200 + Details 100 で、いまの上限とちょうど一致する。失敗のやり直し分がない。
提案: Text Search を **300/日**（100件×2に、特定し直し約100回の余裕）。Place Details は予算と同じ **100/日**のままでよい（余裕を見るなら 120）。Nearby は診断では使わなくなり、現在地の候補だけなので **100/日**のままで足りる。

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
| L0 提供元の物理上限 | Google Cloud Console の Places API (New)。2026-11-11 時点は Text Search 200/日・Place Details 100/日・Nearby 100/日。診断の内訳は上の表。提案は Text Search 300/日（店名診断は1件で2回使う）。Details 100 と Nearby 100 は予算と現在地候補に合っている |
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
