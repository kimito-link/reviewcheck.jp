/**
 * 予防型インサイトの純粋関数群（fetch・現在時刻の直読み・乱数・LLM を使わない）。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md §3-1, §3-4, §3-5
 *
 * すべて決定的: 同じ入力 → 同じ出力。月・IDは引数で受ける。
 */

import {
  CATEGORY_KEYWORD_TO_TAG,
  INSIGHT_FORBIDDEN_PATTERNS,
  MEDICAL_EXTRA_FORBIDDEN,
  RISK_SCENARIOS,
  SAFE_MONTH_INSIGHT,
} from "./dictionary";
import type {
  IndustryTag,
  InsightItem,
  MonthlyInsightInput,
  RiskScenario,
} from "./types";

/** シナリオ本文の合計文字数の上限（設計書§3-4 の辞書規約）。 */
export const SCENARIO_TEXT_MAX = 240;

/** trigger に書ける実在 problemId 接頭辞（scoring 7 + diagnose 9）。CIで照合。 */
export const VALID_PROBLEM_ID_PREFIXES: readonly string[] = [
  "factor:ratingQuality",
  "factor:reviewVolume",
  "factor:competitorPosition",
  "factor:ownerReplies",
  "factor:freshness",
  "factor:profileCompleteness",
  "factor:lowRatingRatio",
  "improve:review-count-gap",
  "improve:low-rating",
  "improve:rating-gap",
  "improve:owner-reply",
  "improve:owner-reply-check",
  "improve:bad-review",
  "improve:profile",
  "improve:freshness",
  "improve:keep",
];

/**
 * Places の業種表示名（自由文字列）を粗い8タグに正規化する。
 * 決定的（LLM を使わない）。マッチしなければ "general"。
 */
export function normalizeIndustryTag(
  category: string | null | undefined,
): IndustryTag {
  if (!category) return "general";
  for (const [keyword, tag] of CATEGORY_KEYWORD_TO_TAG) {
    if (category.includes(keyword)) return tag;
  }
  return "general";
}

/** targetId の先頭4文字を16進数値化する（ローテーションのシード）。決定的。 */
function targetSeed(targetId: string): number {
  const head = targetId.slice(0, 4);
  let seed = 0;
  for (const ch of head) {
    seed = (seed * 31 + ch.charCodeAt(0)) % 1_000_000;
  }
  return seed;
}

/** シナリオが当該業種に適用可能か。 */
function appliesToIndustry(
  scenario: RiskScenario,
  industryTag: IndustryTag,
): boolean {
  if (scenario.industries === "all") return true;
  return scenario.industries.includes(industryTag);
}

/**
 * シナリオ本文の景表法セーフ検査（設計書§3-5）。
 * medical タグ向けシナリオには追加禁句も適用する。
 */
export function assertInsightTextSafe(scenario: RiskScenario): {
  ok: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const text = `${scenario.title} ${scenario.insight} ${scenario.nextStep} ${
    scenario.planNote?.standard ?? ""
  } ${scenario.planNote?.pro ?? ""}`;

  for (const re of INSIGHT_FORBIDDEN_PATTERNS) {
    if (re.test(text)) violations.push(`forbidden: ${re}`);
  }

  const isMedical =
    scenario.industries !== "all" && scenario.industries.includes("medical");
  if (isMedical) {
    for (const re of MEDICAL_EXTRA_FORBIDDEN) {
      if (re.test(text)) violations.push(`medical-forbidden: ${re}`);
    }
  }

  // 文字数規約（title+insight+nextStep+planNote 合計）。
  const bodyLen =
    scenario.title.length +
    scenario.insight.length +
    scenario.nextStep.length +
    (scenario.planNote?.standard?.length ?? 0) +
    (scenario.planNote?.pro?.length ?? 0);
  if (bodyLen > SCENARIO_TEXT_MAX) {
    violations.push(`too-long: ${bodyLen} > ${SCENARIO_TEXT_MAX}`);
  }

  return { ok: violations.length === 0, violations };
}

/**
 * 月次インサイトを組み立てる（設計書§3-4 の選択規則）。
 * 返り値は monitor 非依存の InsightItem[]（アダプタが MonitorEvent へ詰め替える）。
 *
 * 規則:
 *  0. unreachable の月はインサイトを出さない（幻の示唆を避ける）。
 *  1. trigger 一致を最優先で最大1件（problemIds 前方一致・辞書順先勝ち）。
 *  2. 季節/通年シナリオを最大1件（trigger 選出分は除外・店×月で決定的ローテーション）。
 *  3. 先頭に「無事の可視化」（severe なし かつ clean の月のみ）。
 */
export function buildMonthlyInsight(input: MonthlyInsightInput): InsightItem[] {
  if (input.unreachable) return [];

  const items: InsightItem[] = [];

  // --- 先頭: 無事の可視化（何も起きなかった月） ---
  if (!input.hadSevereEvent) {
    if (input.verdictLevel === "clean") {
      items.push({
        message: SAFE_MONTH_INSIGHT.fact,
        details: [SAFE_MONTH_INSIGHT.reframe],
      });
    } else {
      // clean でない月（変化なしだが状態は良くない）は事実の1文のみ。
      items.push({ message: SAFE_MONTH_INSIGHT.fact });
    }
  }

  const chosen: RiskScenario[] = [];

  // --- 規則1: trigger 一致を最大1件 ---
  const triggerHit = RISK_SCENARIOS.find(
    (s) =>
      s.trigger &&
      appliesToIndustry(s, input.industryTag) &&
      input.problemIds.some((pid) => pid.startsWith(s.trigger!.problemIdPrefix)),
  );
  if (triggerHit) chosen.push(triggerHit);

  // --- 規則2: 季節/通年シナリオを最大1件（trigger 選出分は除外） ---
  const seasonalCandidates = RISK_SCENARIOS.filter(
    (s) =>
      s.id !== triggerHit?.id &&
      !s.trigger && // trigger 付きは規則1でのみ扱う
      appliesToIndustry(s, input.industryTag) &&
      (s.months ? s.months.includes(input.month) : true),
  );
  if (seasonalCandidates.length > 0) {
    const idx = (input.month + targetSeed(input.targetId)) %
      seasonalCandidates.length;
    const picked = seasonalCandidates[idx];
    if (picked) chosen.push(picked);
  }

  // --- シナリオを InsightItem 化（planNote は P0 では出さない） ---
  for (const s of chosen) {
    items.push({
      message: `【今月の注目ポイント】${s.title}`,
      details: [s.insight, `次の一手: ${s.nextStep}`],
    });
  }

  return items;
}
