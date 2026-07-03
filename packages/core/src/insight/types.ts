/**
 * 予防型インサイト — 監視サブスクの「何も起きない月」を価値に変える月次差分。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md
 *
 * このモジュールは純粋データ辞書＋純粋関数のみ。fetch・現在時刻の直読み・LLM は使わない。
 * monitor パッケージには依存しない（ドメイン非依存の境界を保つ）。橋は apps/web のアダプタ層。
 */

/** 業種タグ（粗く8個）。Places の primaryTypeDisplayName を正規化した結果。 */
export type IndustryTag =
  | "restaurant" // 飲食（レストラン・カフェ・居酒屋…）
  | "beauty" // 美容（美容室・ネイル・エステ…）
  | "medical" // 医療（クリニック・歯科・整骨院…）※禁句が最も厳しい
  | "retail" // 小売・物販
  | "service" // 生活サービス（修理・清掃・不動産…）
  | "education" // 教室・スクール
  | "professional" // 士業・相談業
  | "general"; // 上記に正規化できない全て（フォールバック）

/**
 * リスクシナリオ1件（純粋データ）。辞書 RISK_SCENARIOS の要素。
 * 本文はすべて事前に人間レビュー済みの固定文で、断定・保証・比較・数値実績を含まない。
 */
export interface RiskScenario {
  /** 安定ID（辞書内一意。例 "restaurant-yearend-rush"） */
  id: string;
  /** 適用業種。"all" は全業種共通 */
  industries: IndustryTag[] | "all";
  /** 季節性（1〜12月）。未指定なら通年（ローテーション候補） */
  months?: number[];
  /**
   * 監視データ条件（任意）。snapshot.problemIds の前方一致で発火。
   * 実在するIDのみ指定可（build の trigger 照合・probe で検査）:
   *   `factor:<id>` … scoring/index.ts の7ID
   *   `improve:<id>` … diagnose.ts の9ID
   */
  trigger?: { problemIdPrefix: string };
  /** 見出し。「〜の傾向」「〜しやすい時期」の形のみ */
  title: string;
  /** 本文。断定禁止（禁句検査を通ること） */
  insight: string;
  /** セルフでできる次の一手（事実記述・セルフ実行可能な内容） */
  nextStep: string;
  /**
   * 上位プランの対応範囲の事実記述（任意）。P0 では組み立てるが本文に出さない。
   * 「おすすめ」「〜すべき」禁止。「Standard に含まれる◯◯の対応範囲です」の形のみ。
   * ◯◯は plans.ts の features に実在する文言に限る（価格は書かない）。
   */
  planNote?: { standard?: string; pro?: string };
}

/** buildMonthlyInsight の入力（すべて呼び出し側=アダプタが用意する）。 */
export interface MonthlyInsightInput {
  industryTag: IndustryTag;
  /** 1..12。呼び出し側（route）が渡す（現在時刻を build 内で読まない） */
  month: number;
  /** ローテーションのシード（stableTargetId 由来の既存ID） */
  targetId: string;
  /** snapshot.problemIds をそのまま */
  problemIds: string[];
  /** result.events.some(e => e.severe) */
  hadSevereEvent: boolean;
  /** snapshot.unreachable */
  unreachable: boolean;
  /** 監視の総合判定。"clean" のときだけ「無事の可視化」の2〜3文目を出す */
  verdictLevel: "clean" | "vulnerable" | "suspected" | "infected";
}

/**
 * インサイト1件の出力（monitor の型を参照しない素の形）。
 * アダプタ側で MonitorEvent へ詰め替える。
 */
export interface InsightItem {
  message: string;
  details?: string[];
}
