import { COHORT_HIST_SIZE, COHORT_MIN_COUNT } from "./constants";
import { parseCohortRegion } from "./region";

export { COHORT_MIN_COUNT } from "./constants";

/**
 * 画面とAPIが返す比較。しきい値未満は show:false だけ。
 * 平均・順位・件数は、出してよいとき以外はキーごと持たない。
 */
export type CohortPublic =
  | { show: false }
  | {
      show: true;
      topPercent: number;
      averageScore: number;
      averageRating: number;
      averageReviewCount: number;
      /** 返信の有無が分かった件数がしきい値未満なら null（割合を作らない）。 */
      replyShare: number | null;
      regionLabel: string;
      categoryLabel: string;
      sampleCount: number;
    };

/** 保存する集計。店名・URL・place id・本文は持たない。 */
export interface CohortTotals {
  n: number;
  scoreSum: number;
  ratingTenthsSum: number;
  reviewCountSum: number;
  replyYes: number;
  replyKnown: number;
  /** index = 0〜100点の件数 */
  hist: number[];
}

export interface CohortDelta {
  score: number;
  ratingTenths: number;
  reviewCount: number;
  replyYes: 0 | 1;
  replyKnown: 0 | 1;
}

export interface CohortObservation {
  category?: string | null;
  address?: string | null;
  score: number;
  rating: number;
  reviewCount: number;
  hasOwnerReplies?: boolean;
  ruleVersion: string;
}

export interface PreparedCohortWrite {
  key: string;
  categoryLabel: string;
  regionLabel: string;
  delta: CohortDelta;
}

const TOTAL_KEYS = [
  "n",
  "scoreSum",
  "ratingTenthsSum",
  "reviewCountSum",
  "replyYes",
  "replyKnown",
  "hist",
] as const;

export function cohortTotalKeys(): readonly string[] {
  return TOTAL_KEYS;
}

export function emptyTotals(): CohortTotals {
  return {
    n: 0,
    scoreSum: 0,
    ratingTenthsSum: 0,
    reviewCountSum: 0,
    replyYes: 0,
    replyKnown: 0,
    hist: Array.from({ length: COHORT_HIST_SIZE }, () => 0),
  };
}

export function normalizeCategory(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (s.length < 1 || s.length > 32) return null;
  if (/https?:|www\.|maps\.|goo\.gl|ChIJ|@|〒|丁目|番地/.test(s)) return null;
  if (/\d/.test(s)) return null;
  if (/[都道府県]/.test(s) && /[市区町村]/.test(s)) return null;
  return s;
}

function normalizeRuleVersion(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.normalize("NFKC").trim();
  if (!/^\d+\.\d+$/.test(s)) return null;
  return s;
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function metricsToDelta(input: CohortObservation): CohortDelta | null {
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
    return null;
  }
  if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5) {
    return null;
  }
  if (
    !Number.isFinite(input.reviewCount) ||
    input.reviewCount < 0 ||
    input.reviewCount > 100_000
  ) {
    return null;
  }
  const replyKnown = typeof input.hasOwnerReplies === "boolean";
  return {
    score: clampScore(input.score),
    ratingTenths: Math.max(0, Math.min(50, Math.round(input.rating * 10))),
    reviewCount: Math.round(input.reviewCount),
    replyYes: input.hasOwnerReplies === true ? 1 : 0,
    replyKnown: replyKnown ? 1 : 0,
  };
}

/**
 * 集計キーと加算分を作る。
 * 引数に店名・URL・place id・本文が混ざっていても、戻り値には入れない。
 */
export function prepareCohortWrite(
  input: CohortObservation,
): PreparedCohortWrite | null {
  const categoryLabel = normalizeCategory(input.category);
  const region = parseCohortRegion(input.address);
  const ruleVersion = normalizeRuleVersion(input.ruleVersion);
  const delta = metricsToDelta(input);
  if (!categoryLabel || !region || !ruleVersion || !delta) return null;
  const key = [
    "rc:cohort:v1",
    encodeURIComponent(ruleVersion),
    encodeURIComponent(categoryLabel),
    encodeURIComponent(region.label),
  ].join(":");
  return { key, categoryLabel, regionLabel: region.label, delta };
}

export function applyDelta(totals: CohortTotals, delta: CohortDelta): CohortTotals {
  const hist = totals.hist.slice(0, COHORT_HIST_SIZE);
  while (hist.length < COHORT_HIST_SIZE) hist.push(0);
  const score = clampScore(delta.score);
  hist[score] = (hist[score] ?? 0) + 1;
  return {
    n: totals.n + 1,
    scoreSum: totals.scoreSum + score,
    ratingTenthsSum: totals.ratingTenthsSum + delta.ratingTenths,
    reviewCountSum: totals.reviewCountSum + delta.reviewCount,
    replyYes: totals.replyYes + delta.replyYes,
    replyKnown: totals.replyKnown + delta.replyKnown,
    hist,
  };
}

/** この点数以上が集計の何%か。1〜100の整数。分布が空なら出さない側で使う。 */
export function cohortTopPercent(
  hist: readonly number[],
  score: number,
  n: number,
): number {
  if (n <= 0) return 100;
  const s = clampScore(score);
  let atOrAbove = 0;
  for (let i = s; i <= 100; i++) atOrAbove += hist[i] ?? 0;
  const pct = Math.ceil((atOrAbove / n) * 100);
  if (pct <= 0) return 1;
  if (pct > 100) return 100;
  return pct;
}

export function toPublicSummary(
  totals: CohortTotals | null,
  score: number,
  labels: { categoryLabel: string; regionLabel: string },
): CohortPublic {
  if (!totals || totals.n < COHORT_MIN_COUNT) return { show: false };
  const replyShare =
    totals.replyKnown >= COHORT_MIN_COUNT
      ? totals.replyYes / totals.replyKnown
      : null;
  return {
    show: true,
    topPercent: cohortTopPercent(totals.hist, score, totals.n),
    averageScore: Math.round(totals.scoreSum / totals.n),
    averageRating: Math.round(totals.ratingTenthsSum / totals.n) / 10,
    averageReviewCount: Math.round(totals.reviewCountSum / totals.n),
    replyShare,
    regionLabel: labels.regionLabel,
    categoryLabel: labels.categoryLabel,
    sampleCount: totals.n,
  };
}

function asInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function asLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.normalize("NFKC").trim();
  if (s.length < 1 || s.length > 32) return null;
  if (/https?:|www\.|maps\.|goo\.gl|ChIJ|@|〒|\d/.test(s)) return null;
  return s;
}

/** APIの cohort を、表示してよい形だけに絞る。しきい値未満の数字は捨てる。 */
export function parseCohortPublic(value: unknown): CohortPublic | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.show !== true) return { show: false };
  const sampleCount = asInt(v.sampleCount, COHORT_MIN_COUNT, 1_000_000_000);
  const topPercent = asInt(v.topPercent, 1, 100);
  const averageScore = asInt(v.averageScore, 0, 100);
  const averageReviewCount = asInt(v.averageReviewCount, 0, 100_000);
  const regionLabel = asLabel(v.regionLabel);
  const categoryLabel = asLabel(v.categoryLabel);
  if (
    sampleCount == null ||
    topPercent == null ||
    averageScore == null ||
    averageReviewCount == null ||
    !regionLabel ||
    !categoryLabel ||
    typeof v.averageRating !== "number" ||
    !Number.isFinite(v.averageRating) ||
    v.averageRating < 0 ||
    v.averageRating > 5
  ) {
    return { show: false };
  }
  let replyShare: number | null = null;
  if (v.replyShare != null) {
    if (
      typeof v.replyShare !== "number" ||
      !Number.isFinite(v.replyShare) ||
      v.replyShare < 0 ||
      v.replyShare > 1
    ) {
      return { show: false };
    }
    replyShare = v.replyShare;
  }
  return {
    show: true,
    topPercent,
    averageScore,
    averageRating: Math.round(v.averageRating * 10) / 10,
    averageReviewCount,
    replyShare,
    regionLabel,
    categoryLabel,
    sampleCount,
  };
}
