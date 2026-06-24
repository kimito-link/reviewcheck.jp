import type {
  Competitor,
  ScoreFactor,
  SelectabilityBand,
  StoreInput,
} from "../types/index";
import { clamp } from "../utils/number";
import {
  BAND_THRESHOLDS,
  FRESHNESS_FULL_DAYS,
  FRESHNESS_ZERO_DAYS,
  RATING_CEIL,
  RATING_FLOOR,
  REVIEW_VOLUME_FULL,
  SCORE_MAX,
} from "./weights";

export * from "./weights";

export interface ScoreResult {
  score: number;
  band: SelectabilityBand;
  factors: ScoreFactor[];
}

/**
 * 選ばれやすさスコア（0〜100）を、透明な要素別配点で算出する。
 * 競合が無い要素・未入力の任意項目は「測れた要素」だけで再正規化する。
 */
export function computeSelectabilityScore(
  store: StoreInput,
  competitors: Competitor[] = [],
): ScoreResult {
  const factors: ScoreFactor[] = [];

  // 1. 星評価の高さ
  {
    const max = SCORE_MAX.ratingQuality;
    const ratio = clamp(
      (store.rating - RATING_FLOOR) / (RATING_CEIL - RATING_FLOOR),
      0,
      1,
    );
    const points = round2(ratio * max);
    factors.push({
      id: "ratingQuality",
      title: "星評価の高さ",
      status: store.rating >= 4.3 ? "good" : store.rating >= 3.8 ? "warn" : "bad",
      message:
        store.rating >= 4.3
          ? `星評価 ${store.rating} は良好です。`
          : store.rating >= 3.8
            ? `星評価 ${store.rating} はあと一歩。返信や改善で印象を底上げできます。`
            : `星評価 ${store.rating} は競合に対して不利になりやすい水準です。`,
      points,
      max,
      estimated: false,
    });
  }

  // 2. 口コミ数（対数スケール）
  {
    const max = SCORE_MAX.reviewVolume;
    const ratio =
      store.reviewCount <= 0
        ? 0
        : clamp(
            Math.log10(store.reviewCount + 1) /
              Math.log10(REVIEW_VOLUME_FULL + 1),
            0,
            1,
          );
    const points = round2(ratio * max);
    factors.push({
      id: "reviewVolume",
      title: "口コミ数（信頼の母数）",
      status:
        store.reviewCount >= 100 ? "good" : store.reviewCount >= 30 ? "warn" : "bad",
      message:
        store.reviewCount >= 100
          ? `口コミ ${store.reviewCount} 件は信頼の母数として十分です。`
          : store.reviewCount >= 30
            ? `口コミ ${store.reviewCount} 件。競合より少ないと比較検討で不利になりやすいです。`
            : `口コミ ${store.reviewCount} 件は少なめ。件数が少ないと信頼感で差が出やすいです。`,
      points,
      max,
      estimated: false,
    });
  }

  // 3. 競合平均との相対ポジション（競合がある場合のみ）
  if (competitors.length > 0) {
    const max = SCORE_MAX.competitorPosition;
    const avgRating = mean(competitors.map((c) => c.rating));
    const avgCount = mean(competitors.map((c) => c.reviewCount));
    // 星の相対（±0.5で満点/0点に振れる）と件数の相対（比率）を合成
    const ratingRel = clamp(0.5 + (store.rating - avgRating) / 1.0, 0, 1);
    const countRel = clamp(
      avgCount <= 0 ? 1 : store.reviewCount / (avgCount * 2),
      0,
      1,
    );
    const ratio = ratingRel * 0.6 + countRel * 0.4;
    const points = round2(ratio * max);
    const ahead = store.rating >= avgRating && store.reviewCount >= avgCount;
    factors.push({
      id: "competitorPosition",
      title: "競合平均との比較",
      status: ratio >= 0.6 ? "good" : ratio >= 0.4 ? "warn" : "bad",
      message: ahead
        ? "星評価・口コミ数ともに競合平均を上回っています。"
        : `競合平均（星 ${round1(avgRating)}・口コミ ${Math.round(avgCount)} 件）と比べて差があります。`,
      points,
      max,
      estimated: false,
    });
  }

  // 4. オーナー返信の有無
  {
    const max = SCORE_MAX.ownerReplies;
    const known = typeof store.hasOwnerReplies === "boolean";
    const has = store.hasOwnerReplies === true;
    const points = known ? (has ? max : 0) : round2(max * 0.5);
    factors.push({
      id: "ownerReplies",
      title: "オーナーの口コミ返信",
      status: known ? (has ? "good" : "warn") : "info",
      message: known
        ? has
          ? "口コミへの返信が確認できます。誠実な対応は信頼につながります。"
          : "口コミへの返信が見当たりません。返信は信頼を高め、低評価の影響も和らげます。"
        : "返信状況は未確認です（推定値で加点）。実際の返信状況の確認をおすすめします。",
      points,
      max,
      estimated: !known,
    });
  }

  // 5. 最新口コミの鮮度
  {
    const max = SCORE_MAX.freshness;
    const known = typeof store.daysSinceLastReview === "number";
    let points = round2(max * 0.5);
    let status: ScoreFactor["status"] = "info";
    let message =
      "最新口コミの鮮度は未確認です（推定値で加点）。定期的な口コミ獲得が理想です。";
    if (known) {
      const d = store.daysSinceLastReview as number;
      const ratio = clamp(
        (FRESHNESS_ZERO_DAYS - d) / (FRESHNESS_ZERO_DAYS - FRESHNESS_FULL_DAYS),
        0,
        1,
      );
      points = round2(ratio * max);
      status = d <= FRESHNESS_FULL_DAYS ? "good" : d <= 90 ? "warn" : "bad";
      message =
        d <= FRESHNESS_FULL_DAYS
          ? `直近 ${d} 日以内に口コミがあり、活発な印象です。`
          : `最新口コミから ${d} 日。新しい口コミが少ないと勢いが弱く見えます。`;
    }
    factors.push({
      id: "freshness",
      title: "最新口コミの鮮度",
      status,
      message,
      points,
      max,
      estimated: !known,
    });
  }

  // 6. プロフィール充実度（電話/サイト/営業時間/写真）
  {
    const max = SCORE_MAX.profileCompleteness;
    const flags = [
      store.phone ? 1 : 0,
      store.website ? 1 : 0,
      store.hasOpeningHours ? 1 : 0,
      store.hasPhotos ? 1 : 0,
    ];
    const known = flags.some((f) => f === 1) || hasAnyProfileSignal(store);
    const filled = flags.reduce((a, b) => a + b, 0);
    const ratio = filled / 4;
    const points = known ? round2(ratio * max) : round2(max * 0.5);
    factors.push({
      id: "profileCompleteness",
      title: "ビジネスプロフィールの充実度",
      status: filled >= 3 ? "good" : filled >= 1 ? "warn" : known ? "bad" : "info",
      message: known
        ? `電話・サイト・営業時間・写真のうち ${filled} / 4 が登録済みです。充実させるほど選ばれやすくなります。`
        : "プロフィールの登録状況は未確認です（推定値で加点）。情報の充実は選ばれやすさを高めます。",
      points,
      max,
      estimated: !known,
    });
  }

  // 低評価比率が分かっていれば、星評価要素に注記（減点は星評価へ織り込み済みのため情報として）
  if (typeof store.lowRatingRatio === "number" && store.lowRatingRatio > 0.2) {
    factors.push({
      id: "lowRatingRatio",
      title: "低評価口コミの比率",
      status: "warn",
      message: `低評価（★1〜2）の比率が約 ${Math.round(store.lowRatingRatio * 100)}% と高めです。返信・改善での対応をおすすめします。`,
      points: 0,
      max: 0,
      estimated: false,
    });
  }

  const earned = factors.reduce((s, f) => s + f.points, 0);
  const total = factors.reduce((s, f) => s + f.max, 0);
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { score, band: bandFromScore(score), factors };
}

export function bandFromScore(score: number): SelectabilityBand {
  if (score >= BAND_THRESHOLDS.good) return "good";
  if (score >= BAND_THRESHOLDS.fair) return "fair";
  if (score >= BAND_THRESHOLDS.weak) return "weak";
  return "poor";
}

export const BAND_LABEL: Record<SelectabilityBand, string> = {
  good: "選ばれやすい状態です",
  fair: "改善余地があります",
  weak: "競合と比較して不利な可能性があります",
  poor: "口コミ改善・MEO対策をおすすめします",
};

/** 帯ごとの配色トークン（UI用） */
export const BAND_TONE: Record<SelectabilityBand, string> = {
  good: "good",
  fair: "caution",
  weak: "caution",
  poor: "warning",
};

export function summaryFromBand(band: SelectabilityBand): string {
  switch (band) {
    case "good":
      return "現在の星評価・口コミ数は良好で、Googleマップ上で選ばれやすい状態です。さらに伸ばす余地と、勢いを止めないための継続施策をご提案できます。";
    case "fair":
      return "悪くない状態ですが、競合との差や口コミ数・返信などに改善の余地があります。あと少しの口コミ獲得と運用改善で「選ばれる状態」に近づけます。";
    case "weak":
      return "競合と比べて不利になりやすい状態です。口コミ数・星評価・プロフィールの充実など、優先度の高いポイントから改善することをおすすめします。";
    case "poor":
      return "現状では検索・比較検討で選ばれにくい可能性があります。正当な口コミ獲得導線の設計とMEO対策を早めに始めることをおすすめします。";
  }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function hasAnyProfileSignal(store: StoreInput): boolean {
  return (
    typeof store.hasOpeningHours === "boolean" ||
    typeof store.hasPhotos === "boolean" ||
    Boolean(store.phone) ||
    Boolean(store.website)
  );
}
