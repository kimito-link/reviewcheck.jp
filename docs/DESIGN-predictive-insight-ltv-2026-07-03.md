# 設計書: 予防型インサイト — 監視サブスクの「何も起きない月」を価値に変える月次差分

*2026-07-03 ／ FABLE-3STEP 手順2（設計のみ・実装は別チャット）。素材=`docs/MATERIAL-ltv-maximization-2026-07-03.md`（司令塔裏取り済み・幻覚除去済み）、流儀=`docs/HANDOFF-diagnosis-implementation-2026-07-03.md` §1（触らないもの）と共通不変条件を全継承。矛盾したら MATERIAL の裏取り・HANDOFF の不変条件が正。*

> 会議の最重要結論（批判役2体が独立に同着）: 監視サブスクの構造的欠陥は「何も起きない月＝価値ゼロに見える」こと。これを「予防型インサイト」で毎月「リスクを回避できた証拠」に変換する。
> 実コード裏取り済み: `packages/config/src/plans.ts`（価格の唯一の正）・`packages/monitor/src/`全ファイル・`apps/web/lib/monitorScanner.ts`・`apps/web/app/api/monitor/run/route.ts`・`packages/core/src/types/index.ts`（`StoreInput.category` 実在）ほか。§8 に裏取り一覧。
> 幻覚除去済み: 架空の精度・改善率・開封率などの数値、外部トレンドAPI連携、業種選択の既存フロー必須化はすべて MATERIAL で却下済み。本書には一切載せない。

---

## 0. 設計原則（一句）と狙い

### 設計原則（一句）

**何も起きない月を、いちばん価値の見える月にする。**

監視は「事件が起きたら知らせる」商品なので、無事な月ほど顧客には何も届かず、解約の理屈（「何もしてくれていない」）が毎月積み上がる。予防型インサイトは、この無事な月にこそ (a)「重大な変化が検出されなかった」という監視の実測事実と、(b)「あなたの業種で今月注意したい潜在リスクと次の一手」という固定辞書由来の示唆を届け、「何もない＝見張れているから」の認知に置き換える。

補助原則3つ:
1. **辞書は純粋データ、選択は決定的**。インサイトの本文はすべて事前に人間がレビューした固定辞書から出す。LLMに文章を生成させない・外部APIを呼ばない・「業界平均」を計算しない（幻覚・景表法・再現性の三重防御）。
2. **監視エンジンは1文字も変えない**。`packages/monitor` はドメイン非依存（コード内コメントで宣言済み）。インサイトは reviewcheck ドメインの知識なので `packages/core` 側に置き、両者をつなぐ橋は `apps/web` のアダプタ層（既存の Scanner 注入と同じ構図）だけに閉じる。
3. **断定しない・保証しない・比較しない**。使える語尾は「〜の傾向があります」「〜の可能性があります」「〜が検出されませんでした」まで。効果保証・「おすすめ」・優位性・星評価の広告的表示は全禁止（景表法・医療広告GL）。禁句は辞書と同じファイル群に純粋データとして持ち、CI/probe で機械検査する。

### 狙い（LTVのどの項を上げるか）

LTV = 客単価 × 継続月数 × (1+紹介) のうち、**主戦場は継続月数（チャーン低減）**。MATERIAL 採用打ち手①そのもの。

- 継続月数: 「無事な月＝価値ゼロ」の認知を毎月潰す。解約検討のたびに「来月のインサイトも見たい」を対抗馬にする。
- 客単価（従）: インサイトの「次の一手」に、上位プランの**対応範囲の事実記述**（§5）を添える。売り込みではなく「この一手は Standard に含まれる代行の範囲です」という情報として。打ち手③への接続点。
- 紹介（従）: 月次インサイトは LINE で届く「毎月のスクショ可能な現物」なので、打ち手④（紹介パッケージ）の素材になる。本書では接続点の明示のみで、報酬計算式には一切触れない。

---

## 1. 現状の実コード（裏取り済みの土台）

設計の前提となる実在物。**すべて Read で開いて確認済み**。

### 1-1. 監視エンジン `packages/monitor/src/`（ドメイン非依存・不変で使う）

| ファイル | 実在する主な型・関数 | 本設計との関係 |
|---|---|---|
| `types.ts` | `MonitorTarget`（id/url/label/notifyTo/enabled/createdAt/stripeSubscriptionId?/stripeCustomerId?）・`MonitorSnapshot`（verdictLevel/score/problemIds/unreachable 等）・`MonitorEventType`（10種の union）・`MonitorEvent`（type/severe/message/details?）・`MonitorRunResult<TScan>`（scan に生の診断結果を運ぶ） | イベント追記の器。`MonitorEvent.message` は自由文で、通知本文にそのまま並ぶ |
| `run.ts` | `Scanner<TScan>`・`RunOptions`（**`notifyOnNoChange?: boolean` が既にある**。コメント「週次サマリ等で全件通知したい場合に true」）・`runMonitorCheck`・`runAllMonitors` | 月次配信はこの既存フックに乗る。run.ts 本体は不変 |
| `diff.ts` | `diffSnapshots`。変化なし時は `{ type: "no-change", message: "前回から重要な変化は見つかりませんでした。" }` を返す | 不変。「無事の可視化」はこのイベントを検知して**追記**する（書き換えない） |
| `notify.ts` | `Notifier` インターフェース（`notify(result: MonitorRunResult)`）・`buildNotification`（events を列挙して本文化）・`ConsoleNotifier`/`NoopNotifier`/`WebhookNotifier`/`LineNotifier`（`LINE_TEXT_MAX = 4900`）/`MultiNotifier` | 不変。インサイトは **Notifier のデコレータ**（新規・apps/web側）で events に追記してから既存 Notifier へ委譲する |
| `store.ts` / `kvStore.ts` | `MonitorStore`（listTargets/getLatestSnapshot/saveSnapshot 等）・`InMemoryMonitorStore`/`FileMonitorStore`/`KvMonitorStore`（Redisキー `mc:target:<id>` 等） | 不変。スナップショット履歴は「直近1件のみ」保存という制約（§4・§6で効く） |
| `snapshot.ts` | `stableTargetId(url)` | 不変。決定的ローテーション（§3-4）のシード素材に流用 |
| `index.ts` | 上記の re-export | P0で1行だけ差分（§2-2） |

### 1-2. reviewcheck 側のアダプタ層 `apps/web/`（差分の置き場所）

| ファイル | 実在する内容 | 本設計との関係 |
|---|---|---|
| `apps/web/lib/monitorScanner.ts` | `createReviewcheckScanner()`。target.url に **placeId** を格納する運用。`diagnosisToSnapshot` が problemIds を `improve:<id>` / `factor:<id>` 形式で生成 | 不変。`MonitorRunResult.scan` に `DiagnosisResult | null` が既に運ばれてくる＝**業種カテゴリはここから取れる**（下記） |
| `apps/web/lib/monitorNotifier.ts` | `getMonitorNotifier()`（MONITOR_WEBHOOK_URL / LINE_IT_CHANNEL_ACCESS_TOKEN / MONITOR_LINE_TO から MultiNotifier を構成） | 不変。デコレータはこの**戻り値を包む**だけ |
| `apps/web/app/api/monitor/run/route.ts` | Vercel Cron 想定の実行エンドポイント。CRON_SECRET の Bearer 認可。`runAllMonitors({ store, scanner, notifier })` | 不変。月次は**別ルートを新設**（同じ認可パターンを踏襲） |
| `apps/web/app/api/monitor/targets/route.ts` | 監視対象の登録/一覧/解除（ADMIN_SECRET）。`RegisterBody { placeId, label, notifyTo }` | P1で任意フィールドを追記（§2-3） |
| `apps/web/app/api/stripe/monitor-webhook/route.ts` | checkout.session.completed → 監視対象自動有効化（metadata.kind === "monitoring"）。**プラン情報は metadata に存在しない** | 不変。プラン連動の制約の根拠（§5-1） |
| `apps/web/lib/monitorStripe.ts` | 監視サブスクの Payment Link 生成。金額は `MONITOR_PLAN_AMOUNT_JPY`（既定 5500） | 不変。**監視サブスクの決済は plans.ts の checkout(33000/66000) とは別線**という事実の根拠（§5-1） |
| `apps/web/vercel.json` | redirects のみ。**`crons` キーは存在しない** | 月次 cron の追記先（additive）。既存 /api/monitor/run の起動方法はリポジトリ外＝実装前に要確認（§6-7） |

### 1-3. 業種カテゴリの実在ソース `packages/core/`

- `packages/core/src/types/index.ts` の `StoreInput` に **`category?: string`（コメント「カテゴリ（業種）」）が実在**。
- `packages/core/src/providers/googlePlaces.ts` が Places の `primaryTypeDisplayName?.text`（日本語の業種表示名）を `category` に格納している（L201・L352 で確認）。
- `DiagnosisResult.input.store` として診断結果に同梱され、`monitorScanner.ts` 経由で `MonitorRunResult.scan` に既に載って流れてくる。
- **つまり「業種タグ」は新たなデータ取得を一切せず、既に手元まで来ている `category` 文字列の正規化だけで作れる。** MATERIAL の制約「業種タグは任意・後付け。既存診断フローは変えない」を、入力フォーム変更ゼロで満たせる。
- 文言の安全設計の先例として `packages/core/src/aicheck/filter.ts`（`NEGATIVE_ASSERTION_PATTERNS`・`isSafeForPublic` 等の純粋関数）が実在。禁句検査（§3-5）は同じ流儀（正規表現リスト＋純粋関数）で作る。

---

## 2. 既存コードのどこに、どう薄く乗せるか

### 2-0. 全体像

```
[月次 cron（vercel.json crons に additive 追記・新規）]
        ▼
[新規] /api/monitor/monthly-report … 既存 run/route.ts と同じ認可・同じ部品構成
        │  runAllMonitors({
        │    store:   getMonitorStore(),            // 既存・不変
        │    scanner: createReviewcheckScanner(),   // 既存・不変
        │    notifier: withInsight(getMonitorNotifier()),  // ★新規デコレータで包むだけ
        │    notifyOnNoChange: true,                // ★既存フック（run.ts に実在）を初めて使う
        │  })
        ▼
[新規] apps/web/lib/insightNotifier.ts … withInsight(notifier): Notifier
        │  1. result.scan（DiagnosisResult|null）から store.category を読む
        │  2. buildMonthlyInsight()（core/insight・純粋関数）で追記イベントを得る
        │  3. { ...result, events: [...result.events, ...insightEvents] } を作り（mutateしない）
        │  4. 既存 notifier.notify() へ委譲 → 既存 buildNotification が本文化 → LINE/Webhook
        ▼
[新規] packages/core/src/insight/ … 業種タグ×リスクシナリオ辞書（純粋データ）＋決定的選択（純粋関数）
```

既存の通知経路（LineNotifier / WebhookNotifier / buildNotification）・差分検知（diff.ts）・保存（store）・スキャン（monitorScanner）は**1文字も変えない**。インサイトは「events 配列に非 severe のイベントが数件増える」というデータの追加だけで既存本文フォーマットに乗る（`buildNotification` は events を列挙して `・<message>` ＋ `- <details>` を出力する実装＝確認済み）。

### 2-1. 新規作成ファイル（全部新規・既存への上書きなし）

| パス | 種別 | 内容 |
|---|---|---|
| `packages/core/src/insight/types.ts` | **新規** | `IndustryTag`・`RiskScenario`・`InsightItem`・`MonthlyInsightInput` の型定義（§3） |
| `packages/core/src/insight/dictionary.ts` | **新規** | 業種タグ表・カテゴリ→タグ正規化表・リスクシナリオ辞書・無事文言・禁句リスト。**純粋データのみ**（関数・I/Oなし） |
| `packages/core/src/insight/build.ts` | **新規** | `normalizeIndustryTag`・`selectScenarios`・`buildMonthlyInsight`・`assertInsightTextSafe`。**純粋関数のみ**（fetch/日時取得なし。月・IDは引数で受ける） |
| `packages/core/src/insight/index.ts` | **新規** | 上記の re-export |
| `apps/web/lib/insightNotifier.ts` | **新規** | `withInsight(notifier: Notifier): Notifier` デコレータ。monitor と core をここで初めて出会わせる（アダプタ層） |
| `apps/web/app/api/monitor/monthly-report/route.ts` | **新規** | 月次実行エンドポイント。認可・部品構成は既存 `run/route.ts` の完全コピー＋notifier/notifyOnNoChange の2差分 |

### 2-2. 既存ファイルへの差分（最小・全て追記のみ）

| パス | 差分 | 理由 |
|---|---|---|
| `packages/monitor/src/types.ts` | `MonitorEventType` union に `\| "insight"` を**1行追記** | 追記イベントの型。既存 union（"first-scan"〜"no-change"）に対する網羅 switch は monitor/apps/web に存在しないことを確認済み（diff.ts は生成側・notify.ts は type を素通しするだけ）なので、追加してもコンパイル・挙動とも既存に影響なし。WebhookNotifier の構造化ペイロード `event.events[].type` に "insight" が現れるのは意図した拡張 |
| `packages/core/src/index.ts` | `export * from "./insight/index";` を**1行追記** | 既存の export 群（`export * from "./aicheck/index";` 等）と同形式 |
| `apps/web/vercel.json` | `"crons"` キーを **additive に追加**（例: `{ "path": "/api/monitor/monthly-report", "schedule": "0 0 1 * *" }`） | 既存 redirects には触れない。スケジュール確定は §7 の人間論点 |

**代替案（monitor への差分を完全ゼロにしたい場合）**: `"insight"` を足さず既存の `"no-change"` type を流用して message だけ差し替える方法もあるが、Webhook 受信側が type で自動処理する将来を汚す（意味の違うイベントが同じ type になる）ため不採用。1行の additive union 追加のほうが誠実。

### 2-3. P1 の追記差分（P0 では作らない・設計だけ置く）

| パス | 差分（すべて optional 追記） | 用途 |
|---|---|---|
| `packages/monitor/src/types.ts` | `MonitorTarget` に `industryTag?: string` を追記 | Places の category が取れない/誤判定の店舗への**手動上書き**。`MonitorTarget` のコメント「課金プラン・通知先などは将来の拡張余地として持つ」（実在）に沿う拡張。未設定なら scan 由来の自動判定（P0の挙動）にフォールバック |
| `packages/monitor/src/types.ts` | `MonitorTarget` に `planKey?: string` を追記 | §5-2 のプラン別出し分け。値の正をどこに置くかは §7 の人間論点が先 |
| `apps/web/app/api/monitor/targets/route.ts` | `RegisterBody` に `industryTag?` / `planKey?` を受ける追記 | 管理APIからの上書き手段。既存フィールドの検証ロジックは不変 |

いずれも optional なので、既存の保存済み `MonitorTarget`（KVの `mc:target:<id>`）はマイグレーション不要でそのまま読める。

---

## 3. 純粋データ辞書の構造

### 3-1. 業種タグの粒度 — 粗く8個で始める

Places の `primaryTypeDisplayName`（自由文字列・日本語表示名）を、**粗い8タグ**に正規化する。細かくするほど辞書の空欄（シナリオが無いタグ）が増えて配信が痩せるので、P0 は粗く:

```ts
// packages/core/src/insight/types.ts（新規）
export type IndustryTag =
  | "restaurant"    // 飲食（レストラン・カフェ・居酒屋…）
  | "beauty"        // 美容（美容室・ネイル・エステ…）
  | "medical"       // 医療（クリニック・歯科・整骨院…）※禁句が最も厳しい
  | "retail"        // 小売・物販
  | "service"       // 生活サービス（修理・清掃・不動産…）
  | "education"     // 教室・スクール
  | "professional"  // 士業・相談業
  | "general";      // 上記に正規化できない全て（フォールバック）
```

正規化は部分一致テーブル（純粋データ）＋純粋関数:

```ts
// dictionary.ts（新規）: 「表示名に含まれる語 → タグ」。上から先勝ち。
export const CATEGORY_KEYWORD_TO_TAG: ReadonlyArray<readonly [string, IndustryTag]> = [
  ["歯科", "medical"], ["クリニック", "medical"], ["医院", "medical"], ["整骨", "medical"],
  ["美容", "beauty"], ["ネイル", "beauty"], ["エステ", "beauty"], ["理容", "beauty"],
  ["レストラン", "restaurant"], ["カフェ", "restaurant"], ["居酒屋", "restaurant"], ["料理", "restaurant"],
  // …実装時に Places の実表示名を probe で数十件観測してから埋める（§6-6）
];

// build.ts（新規）
export function normalizeIndustryTag(category: string | null | undefined): IndustryTag;
// マッチしなければ "general"。判定に LLM を使わない（決定的）。
```

**general タグにも必ずシナリオを用意する**（業種不明でも配信が空にならない）。これが「業種タグは任意・後付け」（MATERIAL 制約）の実装形。

### 3-2. リスクシナリオの型

```ts
// types.ts（新規）
export interface RiskScenario {
  /** 安定ID（辞書内一意。例 "restaurant-yearend-rush"） */
  id: string;
  /** 適用業種。"all" は全業種共通 */
  industries: IndustryTag[] | "all";
  /** 季節性（1〜12月）。未指定なら通年（ローテーション候補） */
  months?: number[];
  /**
   * 監視データ条件（任意）。snapshot.problemIds の前方一致。
   * 実在するIDのみ指定可: monitorScanner.ts の diagnosisToSnapshot が
   * `factor:<id>`（scoring/index.ts: ratingQuality/reviewVolume/competitorPosition/
   *   ownerReplies/freshness/profileCompleteness/lowRatingRatio — 全て実在確認済み）
   * `improve:<id>`（diagnose.ts: review-count-gap/low-rating/rating-gap/owner-reply/
   *   owner-reply-check/bad-review/profile/freshness/keep — 全て実在確認済み）
   * を生成する。辞書に書ける trigger はこの実在IDに限る（CIで照合）。
   */
  trigger?: { problemIdPrefix: string };
  /** 見出し。「〜の傾向」「〜しやすい時期」の形のみ */
  title: string;
  /** 本文。断定禁止（§3-5 の禁句検査を通ること） */
  insight: string;
  /** セルフでできる次の一手（Light でも実行可能な内容。事実記述） */
  nextStep: string;
  /**
   * 上位プランの対応範囲の事実記述（任意・§5-2）。
   * 「おすすめ」「〜すべき」禁止。「Standard に含まれる◯◯の対応範囲です」の形のみ。
   * ◯◯は plans.ts の features に実在する文言に限る（価格は書かない）。
   */
  planNote?: { standard?: string; pro?: string };
}
```

### 3-3. 景表法セーフな文言テンプレの例（辞書の実データ見本）

実装時はこのトーンを正とする。**すべて「傾向・可能性・一般論・実測事実」のみで構成し、効果・保証・比較・数値実績を含まない**:

```ts
// dictionary.ts（新規）RISK_SCENARIOS の見本4件
{
  id: "restaurant-yearend-rush",
  industries: ["restaurant"],
  months: [12],
  title: "宴会シーズンは口コミが増えやすい時期です",
  insight: "忘年会シーズンは来店が集中するぶん、口コミの投稿も増えやすい傾向があります。低評価が入った際に返信が遅れると、未対応のまま多くの人の目に触れ続ける可能性があります。",
  nextStep: "低評価への返信文のひな形を今のうちに用意しておくと、投稿から時間を置かずに落ち着いて対応できます。",
  planNote: { standard: "返信を含む日々の対応は、Standard に含まれる「LINEマーケ導線の運用代行」「AI 口コミ対策サポート（申請はご自身で）」の対応範囲です。" },
},
{
  id: "beauty-spring-newcomers",
  industries: ["beauty"],
  months: [2, 3, 4],
  title: "春は新規のお客様が検索から来やすい時期です",
  insight: "新生活の時期は、初めてのお店を検索で探す動きが増える傾向があります。プロフィールの写真や営業時間が古いままだと、来店前の確認段階で候補から外れてしまう可能性があります。",
  nextStep: "Google ビジネスプロフィールの写真・営業時間・メニューが現状と合っているか、一度見直してみてください。",
},
{
  id: "all-unanswered-reviews",
  industries: "all",
  trigger: { problemIdPrefix: "factor:ownerReplies" },
  title: "未返信の口コミが残っている状態が続いています",
  insight: "今月の監視データでは、オーナー返信のない口コミが確認されています。返信のない口コミは、閲覧した人に「対応されていない」という印象を与える可能性があります。",
  nextStep: "まずは直近の口コミ1件への返信から始めるのが負担の少ない一手です。",
  planNote: { standard: "どの口コミから対応すべきかの整理は、Standard に含まれる「AI 口コミ対策サポート（申請はご自身で）」の対応範囲です。" },
},
{
  id: "general-stale-info",
  industries: ["general"],
  trigger: { problemIdPrefix: "factor:freshness" },
  title: "最新の口コミから時間が空いています",
  insight: "新しい口コミが途絶えると、検索した人に「今も営業しているのか」という迷いを生む可能性があります。",
  nextStep: "満足いただけたお客様に、店頭で一声かけて投稿をお願いする導線を見直してみてください（投稿の依頼は自由・謝礼なしの範囲で）。",
},
```

**書いてはいけない見本（禁句検査で落ちるべき文）**: 「返信すれば評価が改善します」（効果保証）／「対応が早い店ほど選ばれます」（優位性の断定）／「Standard がおすすめです」（推奨表現・医療広告GL接触）／「開封率70%」（裏付けなき数値・MATERIAL で却下済みの幻覚と同型）。

### 3-4. シナリオ選択は決定的（乱数・LLM・現在時刻の直読みを使わない）

```ts
// build.ts（新規）
export interface MonthlyInsightInput {
  industryTag: IndustryTag;
  month: number;             // 1..12。呼び出し側（route）が渡す
  targetId: string;          // ローテーションのシード（stableTargetId 由来の既存ID）
  problemIds: string[];      // snapshot.problemIds をそのまま
  hadSevereEvent: boolean;   // result.events.some(e => e.severe)
  unreachable: boolean;      // snapshot.unreachable
}
export interface InsightItem { message: string; details?: string[] }
export function buildMonthlyInsight(input: MonthlyInsightInput): InsightItem[];
```

選択規則（全部決定的・テスト可能）:
1. **trigger 一致を最優先で最大1件**（problemIds 前方一致。複数一致なら辞書順先勝ち）。監視の実データに根差した一言が最も刺さる。
2. **季節/通年シナリオを最大1件**。候補 = 自業種＋"all" のうち months が当月に合うもの（無ければ通年）。`index = (month + targetIdの先頭4桁を16進数値化) % 候補数` で店ごと・月ごとに回す（同じ店に同じ話を続けて出さない・全店同文にもしない・再現可能）。
3. 合計**最大2件＋無事の一文（§4）**。LINE 本文上限（notify.ts の `LINE_TEXT_MAX = 4900`・実在）に対し、辞書1件あたり title+insight+nextStep+planNote 合計 240 文字以内を辞書の規約とし、`assertInsightTextSafe` で機械検査する。
4. `unreachable === true` の月はインサイトを出さない（データ取得不可の月に「傾向」を語るのは幻の示唆になる。既存の went-unreachable イベントに任せる）。

### 3-5. 禁句リスト（辞書と同居する純粋データ）と機械検査

`aicheck/filter.ts` の `NEGATIVE_ASSERTION_PATTERNS`（実在）と同じ流儀で:

```ts
// dictionary.ts（新規）
export const INSIGHT_FORBIDDEN_PATTERNS: RegExp[] = [
  /必ず|確実に|保証/, /No\.?1|ナンバーワン|日本一|地域一/,
  /おすすめ|オススメ|推奨し/, /他社|他店より/,
  /改善率|成功率|開封率|精度\d|%向上|\d+%/,   // 裏付けなき数値の混入をブロック
  /売上が上が|集客が増え|順位が上が/,          // 未来効果の断定
];
// medical タグ限定の追加禁句（医療広告GL）
export const MEDICAL_EXTRA_FORBIDDEN: RegExp[] = [
  /治る|治療効果|効果があ/, /体験談/, /最新の治療|最先端/, /日本有数|有名/,
];

// build.ts（新規）
export function assertInsightTextSafe(scenario: RiskScenario): { ok: boolean; violations: string[] };
```

実装時は全辞書エントリに対する `assertInsightTextSafe` の一括 probe（tsx スクリプト）を**辞書を書くより先に**用意する（reviewcheck はテストランナー無し＝HANDOFF 記載の流儀どおり tsx probe で検証）。trigger の problemIdPrefix が §3-2 の実在ID一覧に含まれることも同じ probe で照合する。

---

## 4. 「何も起きない月」対策の具体

### 4-1. 発火条件

`withInsight` デコレータ内で判定する。**新しい状態管理は作らない**（monitor の store はスナップショット直近1件のみ保持＝store.ts で確認済み。月内イベント履歴は存在しないので、「今月◯回チェックして無事」のような集計は P0 では書かない。書けるのは今回スキャンの実測事実だけ）:

- `result.events` が全件 `severe === false` かつ `unreachable === false` のとき、**無事の可視化イベントを必ず先頭に追記**する。

### 4-2. 可視化する一文（実例・このまま辞書に入れる）

```
今月の監視では、重大な変化は検出されませんでした。
低評価の急増・評判の急変・掲載情報の食い違いといったリスクが、
表に出る前の「何も起きていない状態」を今月も確認できています。
この状態が続いていること自体が、日々の口コミ対応と情報整備が
機能している可能性を示すサインです。
```

文言の設計意図:
- 1文目は**監視の実測事実**（検出されなかった、は事実）。効果の主張ではない。
- 2文目で「無事」を「リスクが表に出ていない状態の確認」と再定義する（＝MATERIAL の核心「予防できていた状態の可視化」）。
- 3文目は「可能性を示す」で止める。「当サービスのおかげで防げました」とは**書かない**（因果の断定＝景表法リスク。§7 で弁護士確認する論点の中心）。
- `verdictLevel` が `clean` でない月（vulnerable 等のまま変化なし）は1文目を「重大な**変化**は検出されませんでした」のまま使える（変化検出の事実だから）が、2〜3文目は出さず、代わりに trigger シナリオ（§3-4 規則1）に席を譲る。無事文はあくまで「良い状態が維持されている月」の文言。

### 4-3. 通知への乗り方（既存フォーマット確認済み）

追記イベントは `{ type: "insight", severe: false, message: <上記文言>, details: [<シナリオtitle: insight要約>...] }` の形で events 末尾（無事文のみ先頭）に足す。既存 `buildNotification`（notify.ts）は `・<message>` と `    - <detail>` で列挙するので、**本文テンプレートの変更なし**でこう届く:

```
◯◯（店名） の監視レポート
監視対象: <placeId>
診断日時: 2026-…
総合判定: clean / 安全スコア: 78

― 検出した変化 ―
・前回から重要な変化は見つかりませんでした。
・今月の監視では、重大な変化は検出されませんでした。（…無事の可視化文…）
・【今月の注目ポイント】宴会シーズンは口コミが増えやすい時期です
    - （insight本文）
    - 次の一手: （nextStep本文）
```

件名（`監視レポート` / `【要確認】…`）は buildNotification の既存分岐のまま。severe が無い月は穏当な件名になる＝月次インサイトの空気に合う。

---

## 5. プラン連動（plans.ts の実コード基準）

### 5-1. まず実態の整理（裏取り済みの事実・ここを混同すると設計が壊れる）

1. **`packages/config/src/plans.ts` が総合改善パッケージの唯一の正**:
   - 梅 = **Light**: `price: "3"` + `priceUnit: "万円"`（表示）・`checkout: { amountJpy: 33000, interval: "month" }`・`topic: "plan-light"`。features に **「★評価・口コミ数の月次レポート」が実在**。
   - 竹 = **Standard**: `checkout: { amountJpy: 66000 }`・`featured: true`・`ribbon: "いちばん選ばれています"`・`topic: "plan-standard"`。features: 「Lightの内容すべて」「AI 口コミ対策サポート（申請はご自身で）」「店舗アプリ iOS / Android（契約中 無料提供）」「NFC口コミカード」「LINEマーケ導線の運用代行」「提携弁護士の窓口ご案内」。
   - 松 = **Pro**: `price: "要お見積り"`・**checkout 未設定**（その場決済なし）・`topic: "plan-pro"`。features: 「サジェスト対策」「逆SEO 押し下げパック」「提携弁護士の優先窓口」「専任担当による手厚いサポート」。
2. **監視サブスクの決済は別線**: `apps/web/lib/monitorStripe.ts`（実在）は `MONITOR_PLAN_AMOUNT_JPY`（既定 5500）で Payment Link を都度生成し、`monitor-webhook/route.ts` が監視対象を自動有効化する。**この metadata にプラン情報は無く、`MonitorTarget` にもプラン欄は無い**（両ファイルで確認済み）。
3. よって「監視対象1件が plans.ts のどのプランに属するか」を機械的に知る手段は**現状のコードには存在しない**。ここに架空のDB連携を書かないことが本設計の誠実さの要。

### 5-2. 出し分け設計（P0はプラン非依存 → P1で planNote 解禁）

| 段階 | 誰に何が出るか | 根拠 |
|---|---|---|
| **P0** | 全監視対象に同一仕様: 無事の可視化（§4）＋シナリオ最大2件（`nextStep` はセルフで実行可能な内容のみ）。`planNote` は**組み立てるが本文に出さない**（辞書には持つ・表示はP1） | プラン判定手段が実在しないため。Light の実 feature「★評価・口コミ数の月次レポート」の語義（レポートが届く）を強化する方向であり、どのプラン相当の顧客に届いても過剰約束にならない内容に閉じる |
| **P1** | `MonitorTarget.planKey?`（§2-3・追記のみ）が入った対象に限り、シナリオの `planNote.standard` / `planNote.pro` を1行添える。planKey 未設定は P0 挙動のまま | planKey の正をどこに置くか（Stripe metadata 追加か・管理APIで手動付与か）は §7 の人間論点。**既存 webhook の処理・metadata 仕様は人間判断が出るまで触らない** |

プラン別の役割（MATERIAL 打ち手③の実プラン対応）:
- **梅 Light（33,000円）= 主戦場**。「月次レポート」を「監視結果の報告」から「予防型インサイト付きレポート」へ育てる。plans.ts の feature 文言は変えない（「★評価・口コミ数の月次レポート」のまま。中身が濃くなるだけ）。
- **竹 Standard（66,000円・featured）= 昇格の受け皿**。`planNote.standard` は「この一手は Standard に含まれる◯◯の対応範囲です」という**事実記述**のみ。◯◯には plans.ts の features に実在する文言（上記5-1の列挙）だけを使い、価格・「おすすめ」は書かない。
- **松 Pro（要お見積り）= 言及のみ**。サジェスト・逆SEO 領域のシナリオ（例: 検索候補に関する一般的注意）を将来足す場合、`planNote.pro` で「Pro の対応範囲（サジェスト対策・逆SEO 押し下げパック）です。内容は個別にお見積りします」とだけ書く。Pro には checkout が無い＝インサイトから直接決済に飛ばす導線は作らない（実コードと整合）。

### 5-3. 不変条件（このプラン連動で絶対に触らないもの）

- `plans.ts` への変更は**ゼロ**。`checkout.amountJpy`（33000/66000）・`price`・`priceUnit`・`per`・`topic`・`ribbon`・`featured`・features 配列・`PLANS_NOTE`・`PLAN_TOPIC_LABELS` すべて1文字も変えない。
- 辞書に価格を**複製しない**。プラン名・feature 文言を辞書に書くときも、表示層で `PLANS` から引ける設計を優先し、直書きする場合は CI probe で plans.ts の実文字列と一致照合する（文言ドリフト防止）。
- `monitorStripe.ts` の `MONITOR_PLAN_AMOUNT_JPY` 既定 5500・Payment Link 生成・webhook の metadata 仕様（`kind: "monitoring"` 等）は不変。

---

## 6. 実装者への地雷マップ

1. **monitor のドメイン非依存を壊すな（最重要の構造地雷）**。`packages/monitor` は core を import しない・`packages/core` は monitor を import しない（現状の依存方向を確認済み。monitor 側コメントにも「ドメイン非依存に保つ」と明記あり）。insight 辞書を monitor に置きたくなっても置かない。橋は `apps/web/lib/insightNotifier.ts` の1ファイルだけ。core/insight の `buildMonthlyInsight` の戻り値は素の `{ message, details? }[]` にして monitor の型を参照させず、`MonitorEvent` への詰め替えはデコレータ側でやる。
2. **既存 result を mutate しない**。デコレータは `{ ...result, events: [...result.events, ...] }` で複製して委譲する。同じ result が MultiNotifier で複数 Notifier に渡る（notify.ts 確認済み）ため、破壊的変更は他経路の本文を汚す。
3. **月次実行は「スキャン＋基準前進」を伴う**（run.ts: 「通知の有無に関わらず必ず保存」＝確認済み）。`/api/monitor/monthly-report` を回すと snapshot 基準が前進するので、既存 `/api/monitor/run` と同日に走ると片方の差分がもう片方に吸われる。月次は既存 run と**時刻をずらして**スケジュールし、月次自身も差分検知として正しく動く（＝既存 run の代替を1回務める）と理解して設計されている。逆に「スキャンせず通知だけしたい」誘惑に負けて store の snapshot を scanner なしで読む別実装を作らないこと（鮮度のない情報で「今月」を語ることになる）。
4. **既存 `/api/monitor/run` の起動方法は実装前に確認**。`apps/web/vercel.json` に `crons` は存在しない（確認済み）。run がどこから叩かれているか（外部cron・手動・Vercelダッシュボード設定）を運用者に確認してから monthly-report のスケジュールを決める。vercel.json への crons 追記は additive のみ（既存 redirects を保持）。
5. **LINE 本文 4900 文字上限**（notify.ts `LINE_TEXT_MAX` 実在）。インサイト追記後も、既存イベントが多い月（severe 多発月）に収まるか。§3-4 の「1辞書エントリ240文字・月最大2件＋無事文」を辞書の規約にし、`assertInsightTextSafe` で機械検査。長文が切られると免責文（本文末尾の「※この監視は〜保証するものではありません」）が欠ける事故になり得る点に注意（buildNotification は免責を末尾に置く実装＝確認済み。インサイトは events 内なので免責より前に出る＝この順序を崩す変更をしない）。
6. **業種正規化テーブルは観測してから書く**。`CATEGORY_KEYWORD_TO_TAG` のキーワードは、Places の `primaryTypeDisplayName.text` の**実物**（日本語表示名）を tsx probe で数十件観測してから埋める。推測で英語 type 名（"restaurant" 等の内部値）を書かない — 実コードが格納しているのは表示名テキスト（googlePlaces.ts L352 確認済み）。マッチしない場合は必ず "general" に落ちるので、テーブルの穴は配信停止ではなく汎用文言になる（フェイルソフト）。
7. **trigger に書ける problemId は実在IDのみ**。`factor:` 系は `packages/core/src/scoring/index.ts` の7ID、`improve:` 系は `packages/core/src/diagnose.ts` の9ID（§3-2 に列挙・全て実在確認済み）。辞書レビュー時に probe で照合。存在しないIDを書いても落ちずに「一生発火しないシナリオ」になる＝静かな腐敗なので機械検査必須。
8. **幻覚・景表法の三点セット**（MATERIAL 却下済み事項の再発防止）: (a) 数値実績（%・件数・順位）を辞書に書かない — 禁句正規表現でブロック。(b) 外部API（トレンド・SNS言及量）を呼ばない — build.ts に I/O を持たせない構造で封じる。(c) 「業界平均」を語らない — 自店の監視データと一般論だけ。medical タグは追加禁句（効果・体験談・比較優良）。
9. **既存フローの改変禁止**: 診断入力フォームに業種選択を足さない（MATERIAL 却下⑤）。業種は Places category から自動＋P1の手動上書きのみ。`ref=RVCHK`・報酬式・lin.ee・既存 buttonText には本設計は一切触れないが、周辺を触るときの共通不変条件として再掲（HANDOFF §1）。
10. **git add は自分のファイルのみ明示パス**（HANDOFF 記載。他者作業・他セッションの stash が両リポに同居している）。ブランチは最新 origin/main から新規に切る。
11. **検証は tsx probe**（reviewcheck にテストランナーは無い＝HANDOFF 記載）。最低4本: ①辞書全件の禁句検査＋文字数検査 ②trigger ID の実在照合 ③`buildMonthlyInsight` の決定性（同入力→同出力・月/店でのローテーション確認）④デコレータ経由の `buildNotification` 出力の目視スナップショット（無事月・severe月・unreachable月の3ケース）。

---

## 7. 要人間/弁護士確認の論点

| # | 論点 | 誰が | ブロック範囲 |
|---|---|---|---|
| 1 | **「予防型インサイト」「リスクを回避できた」系文言の景表法最終確認**（MATERIAL 次アクション4で指定済み）。特に §4-2 の無事文3文目「機能している可能性を示すサイン」が因果の示唆としてどこまで許されるか。NG なら1〜2文目（純粋な検出事実）だけで出す縮退案を P0 とする | 弁護士 | 文言のみ（構造は不変） |
| 2 | **medical タグへの配信と医療広告GLの適用範囲**。契約者本人だけに届く LINE 私信レポートが「広告」に当たるかの整理。グレーなら P0 は medical タグを "general" 扱いに縮退（辞書から medical 専用シナリオを外すだけ・コード不変） | 弁護士 | medical 辞書のみ |
| 3 | **planKey の正をどこに置くか**（§5-2 P1 の前提）。Stripe checkout metadata への追加（monitorStripe.ts 差分が発生）か、管理API での手動付与か。Stripe 側を触る場合は既存 webhook 不変条件との整合を運営者が判断 | 人間（運営者） | P1 の planNote 表示のみ（P0 非ブロック） |
| 4 | **月次 cron のスケジュール確定**と、既存 `/api/monitor/run` の現行起動方法の確認（§6-3, 6-4）。月初/月末どちらに届くのが顧客体験として正しいかも含む | 人間（運営者） | monthly-report のデプロイ |
| 5 | **運用者宛（MONITOR_LINE_TO）にも月次インサイトを流すか**。全顧客分が毎月運用者に届くとノイズになる。デコレータではなく通知経路の選定（monitorNotifier.ts の構成をmonthly用に変えるか）の運用判断 | 人間（運営者） | 通知経路の構成のみ |
| 6 | **辞書エントリの公開前レビュー体制**。禁句CIは機械検査であり、最終的な文言責任は人間レビュー。辞書追加のたびに誰がレビューするかの運用取り決め | 人間（運営者） | 辞書の追加運用 |
| 7 | 年払い割引・複数拠点オプション（MATERIAL 打ち手③のクロスセル）は Price ID 新設が絡むため**本設計から除外**。着手するなら別設計・別判断 | 人間（運営者） | 本設計外 |

---

## 8. 裏取り一覧（本書が実在確認した既存コード）

Read で全文または該当部を開いて確認したファイル:

- `packages/config/src/plans.ts` — PLANS（light/standard/pro）・checkout.amountJpy 33000/66000・Pro checkout 未設定・featured/ribbon/topic/features 文言・PLANS_NOTE
- `packages/monitor/src/types.ts` — MonitorTarget / MonitorSnapshot / MonitorEventType / MonitorEvent / MonitorRunResult
- `packages/monitor/src/run.ts` — Scanner / RunOptions（notifyOnNoChange 実在）/ runMonitorCheck / runAllMonitors・「必ず保存」の仕様
- `packages/monitor/src/diff.ts` — diffSnapshots・no-change イベントの実文言
- `packages/monitor/src/notify.ts` — Notifier / buildNotification（本文フォーマット・免責末尾）/ Console・Noop・Webhook・Line（LINE_TEXT_MAX=4900）・MultiNotifier
- `packages/monitor/src/store.ts` — MonitorStore（直近スナップショット1件のみ保持）・InMemory / File 実装
- `packages/monitor/src/kvStore.ts` — KvMonitorStore・Redis キー設計
- `packages/monitor/src/snapshot.ts` — stableTargetId
- `packages/monitor/src/index.ts` — re-export 構成
- `apps/web/app/api/monitor/run/route.ts` — cron 実行エンドポイント・CRON_SECRET 認可・部品構成
- `apps/web/app/api/monitor/targets/route.ts` — 登録/一覧/解除・RegisterBody
- `apps/web/app/api/stripe/monitor-webhook/route.ts` — 決済完了→自動有効化・解約→無効化・metadata にプラン情報なし
- `apps/web/lib/monitorScanner.ts` — createReviewcheckScanner・diagnosisToSnapshot（problemIds の `factor:`/`improve:` 形式）・target.url=placeId 運用
- `apps/web/lib/monitorNotifier.ts` — getMonitorNotifier・環境変数（MONITOR_WEBHOOK_URL / LINE_IT_CHANNEL_ACCESS_TOKEN / MONITOR_LINE_TO）
- `apps/web/lib/monitorStripe.ts` — MONITOR_PLAN_AMOUNT_JPY（既定5500）・Payment Link 生成・監視サブスクは plans.ts と別決済線
- `apps/web/vercel.json` — redirects のみ・crons 未定義
- `apps/web/app/api/checkout/route.ts`（grep）・`apps/web/components/PlanCards.tsx`（grep） — PLANS/amountJpy の使用箇所
- `packages/core/src/index.ts` — export 構成（insight 追記位置）
- `packages/core/src/types/index.ts` — StoreInput.category（業種）実在・DiagnosisResult 構造
- `packages/core/src/providers/googlePlaces.ts`（grep＋該当行） — primaryTypeDisplayName.text → category 格納
- `packages/core/src/scoring/index.ts`（grep） — factor ID 7種（ratingQuality/reviewVolume/competitorPosition/ownerReplies/freshness/profileCompleteness/lowRatingRatio）
- `packages/core/src/diagnose.ts`（grep） — improvement ID 9種（review-count-gap/low-rating/rating-gap/owner-reply/owner-reply-check/bad-review/profile/freshness/keep）
- `packages/core/src/aicheck/filter.ts` — 禁句正規表現＋純粋関数の先例（NEGATIVE_ASSERTION_PATTERNS / isSafeForPublic）
- `packages/core/src/aicheck/factors.ts` — 決定的採点の先例
- `docs/MATERIAL-ltv-maximization-2026-07-03.md` / `docs/HANDOFF-diagnosis-implementation-2026-07-03.md` / `docs/DESIGN-kanban-name-ai-diagnosis-2026-07-03.md` / `docs/DESIGN-ai-first-impression-diagnosis-2026-07-02.md` — 素材・不変条件・文体の正

**実在せず「新規作成」と明記したもの**（本書§2-1）: `packages/core/src/insight/`（types.ts / dictionary.ts / build.ts / index.ts）・`apps/web/lib/insightNotifier.ts`・`apps/web/app/api/monitor/monthly-report/route.ts`。これ以外に新規ファイルは無い。

---

**本設計の背骨（1行)**: 監視の「何も起きない月」に、(a)検出されなかったという実測事実と (b)業種×季節×監視データで決定的に選んだ固定辞書のインサイトを、既存 Notifier をデコレータで包むだけで月次通知に載せる。新規は純粋データ辞書＋純粋関数＋アダプタ2ファイル、既存への差分は additive 3行（union 1行・export 1行・crons 追記）に閉じ、plans.ts・報酬式・既存監視ロジックには1文字も触れない。
