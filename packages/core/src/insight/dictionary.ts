/**
 * 予防型インサイトの純粋データ辞書。関数・I/O は一切持たない。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md §3
 *
 * 文言はすべて「傾向・可能性・一般論・実測事実」のみで構成し、
 * 効果保証・「おすすめ」・優位性・比較・数値実績を含まない（景表法・医療広告GL）。
 * 追加時は必ず assertInsightTextSafe を通し、tsx probe で全件検査する。
 */

import type { IndustryTag, RiskScenario } from "./types";

/**
 * Places の primaryTypeDisplayName.text（日本語表示名）に含まれる語 → 業種タグ。
 * 上から先勝ち（医療系を先頭に置き、誤って beauty 等へ落ちないようにする）。
 *
 * 注意（設計書§6-6）: Places が格納するのは英語 type 値ではなく日本語表示名テキスト。
 * 実装後に実表示名を probe で観測し、取りこぼす語があればここに追記する。
 * マッチしない場合は必ず "general" に落ちる（フェイルソフト・配信は止まらない）。
 */
export const CATEGORY_KEYWORD_TO_TAG: ReadonlyArray<
  readonly [string, IndustryTag]
> = [
  // medical（最優先・禁句最厳）
  ["歯科", "medical"],
  ["クリニック", "medical"],
  ["医院", "medical"],
  ["診療", "medical"],
  ["病院", "medical"],
  ["整骨", "medical"],
  ["接骨", "medical"],
  ["整形", "medical"],
  ["薬局", "medical"],
  ["鍼灸", "medical"],
  // beauty
  ["美容", "beauty"],
  ["ネイル", "beauty"],
  ["エステ", "beauty"],
  ["理容", "beauty"],
  ["まつげ", "beauty"],
  ["脱毛", "beauty"],
  ["サロン", "beauty"],
  // restaurant
  ["レストラン", "restaurant"],
  ["カフェ", "restaurant"],
  ["喫茶", "restaurant"],
  ["居酒屋", "restaurant"],
  ["食堂", "restaurant"],
  ["料理", "restaurant"],
  ["飲食", "restaurant"],
  ["ラーメン", "restaurant"],
  ["寿司", "restaurant"],
  ["焼肉", "restaurant"],
  ["バー", "restaurant"],
  ["ベーカリー", "restaurant"],
  ["パン", "restaurant"],
  // education
  ["教室", "education"],
  ["スクール", "education"],
  ["塾", "education"],
  ["学習", "education"],
  ["予備校", "education"],
  ["レッスン", "education"],
  // professional（士業・相談業）
  ["弁護士", "professional"],
  ["税理士", "professional"],
  ["司法書士", "professional"],
  ["行政書士", "professional"],
  ["社会保険労務", "professional"],
  ["会計", "professional"],
  ["法律事務所", "professional"],
  ["コンサル", "professional"],
  // service（生活サービス）
  ["不動産", "service"],
  ["修理", "service"],
  ["清掃", "service"],
  ["クリーニング", "service"],
  ["リフォーム", "service"],
  ["工務店", "service"],
  ["整備", "service"],
  ["ジム", "service"],
  ["フィットネス", "service"],
  // retail（小売・物販）
  ["店", "retail"], // 汎用の「◯◯店」。後方に置き、上記の具体語を先に拾わせる
  ["ショップ", "retail"],
  ["販売", "retail"],
  ["用品", "retail"],
];

/**
 * リスクシナリオ辞書（設計書§3-3 の見本を正とする）。
 * すべて景表法セーフ。title+insight+nextStep+planNote 合計 240 文字以内（§3-4 の規約）。
 */
export const RISK_SCENARIOS: RiskScenario[] = [
  {
    id: "restaurant-yearend-rush",
    industries: ["restaurant"],
    months: [12],
    title: "宴会シーズンは口コミが増えやすい時期です",
    insight:
      "忘年会シーズンは来店が集中するぶん、口コミの投稿も増えやすい傾向があります。低評価が入った際に返信が遅れると、未対応のまま多くの人の目に触れ続ける可能性があります。",
    nextStep:
      "低評価への返信文のひな形を今のうちに用意しておくと、投稿から時間を置かずに落ち着いて対応できます。",
    planNote: {
      standard:
        "返信を含む日々の対応は、Standard に含まれる「LINEマーケ導線の運用代行」「AI 口コミ対策サポート（申請はご自身で）」の対応範囲です。",
    },
  },
  {
    id: "beauty-spring-newcomers",
    industries: ["beauty"],
    months: [2, 3, 4],
    title: "春は新規のお客様が検索から来やすい時期です",
    insight:
      "新生活の時期は、初めてのお店を検索で探す動きが増える傾向があります。プロフィールの写真や営業時間が古いままだと、来店前の確認段階で候補から外れてしまう可能性があります。",
    nextStep:
      "Google ビジネスプロフィールの写真・営業時間・メニューが現状と合っているか、一度見直してみてください。",
  },
  {
    id: "all-unanswered-reviews",
    industries: "all",
    trigger: { problemIdPrefix: "factor:ownerReplies" },
    title: "未返信の口コミが残っている状態が続いています",
    insight:
      "今月の監視データでは、オーナー返信のない口コミが確認されています。返信のない口コミは、閲覧した人に「対応されていない」という印象を与える可能性があります。",
    nextStep:
      "まずは直近の口コミ1件への返信から始めるのが負担の少ない一手です。",
    planNote: {
      standard:
        "どの口コミから対応すべきかの整理は、Standard に含まれる「AI 口コミ対策サポート（申請はご自身で）」の対応範囲です。",
    },
  },
  {
    id: "general-stale-info",
    industries: ["general"],
    trigger: { problemIdPrefix: "factor:freshness" },
    title: "最新の口コミから時間が空いています",
    insight:
      "新しい口コミが途絶えると、検索した人に「今も営業しているのか」という迷いを生む可能性があります。",
    nextStep:
      "満足いただけたお客様に、店頭で一声かけて投稿をお願いする導線を見直してみてください（投稿の依頼は自由・謝礼なしの範囲で）。",
  },
  {
    id: "medical-profile-accuracy",
    industries: ["medical"],
    trigger: { problemIdPrefix: "factor:profileCompleteness" },
    title: "掲載情報の記載が不足している箇所があります",
    insight:
      "診療時間や連絡先などの掲載情報に不足があると、来院前に確認したい方が正確な情報にたどり着けない可能性があります。",
    nextStep:
      "診療時間・休診日・電話番号・アクセスの記載が現状と合っているか、掲載内容をご確認ください。",
  },
  {
    id: "all-review-volume-gap",
    industries: "all",
    trigger: { problemIdPrefix: "improve:review-count-gap" },
    title: "口コミの件数に伸びしろがある状態です",
    insight:
      "口コミの件数が少ないと、検索した人が判断材料を得にくく、比較の段階で情報が足りないと感じる可能性があります。",
    nextStep:
      "来店時に満足いただけた方へ、投稿のお願いを自然に伝える一言を決めておくと続けやすくなります（依頼は自由・謝礼なしの範囲で）。",
  },
  {
    id: "general-yearstart-search",
    industries: "all",
    months: [1],
    title: "年始は「今年こそ」の検索が動きやすい時期です",
    insight:
      "年始は新しい習慣やお店を探す動きが増える傾向があります。この時期に掲載情報が整っていると、検索から来た方が迷わず判断しやすくなります。",
    nextStep:
      "写真・営業時間・提供内容の記載を、年始のうちに一度そろえて見直しておくと安心です。",
  },
];

/**
 * 禁句パターン（全業種共通）。aicheck/filter.ts の NEGATIVE_ASSERTION_PATTERNS と同流儀。
 * 数値実績・効果保証・優位性・比較・推奨表現をブロックする。
 */
export const INSIGHT_FORBIDDEN_PATTERNS: RegExp[] = [
  /必ず|確実に|保証/,
  /No\.?1|ナンバーワン|日本一|地域一/,
  /おすすめ|オススメ|推奨し/,
  /他社|他店より/,
  /改善率|成功率|開封率|精度\d|%向上|\d+\s*%/, // 裏付けなき数値の混入をブロック
  /売上が上が|集客が増え|順位が上が/, // 未来効果の断定
];

/** medical タグ限定の追加禁句（医療広告GL）。 */
export const MEDICAL_EXTRA_FORBIDDEN: RegExp[] = [
  /治る|治療効果|効果があ/,
  /体験談/,
  /最新の治療|最先端/,
  /日本有数|有名/,
];

/**
 * 「何も起きなかった月」に必ず先頭で出す無事の可視化文（設計書§4-2）。
 * verdictLevel が clean のときのみ2〜3文目まで出す。
 */
export const SAFE_MONTH_INSIGHT = {
  /** 1文目: 監視の実測事実（どの月でも使える）。 */
  fact: "今月の監視では、重大な変化は検出されませんでした。",
  /** 2〜3文目: clean の月のみ。「予防できていた状態の可視化」。因果は断定しない。 */
  reframe:
    "低評価の急増・評判の急変・掲載情報の食い違いといったリスクが、表に出る前の「何も起きていない状態」を今月も確認できています。この状態が続いていること自体が、日々の口コミ対応と情報整備が機能している可能性を示すサインです。",
} as const;
