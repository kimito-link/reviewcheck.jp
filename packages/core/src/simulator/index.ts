import type {
  Competitor,
  RatingSimulation,
  SimulationScenario,
  StoreInput,
} from "../types/index";
import { clamp, normalizeRating, round1 } from "../utils/number";
import { DEFAULT_TARGET_RATING } from "../scoring/weights";

/**
 * 目標評価に到達するために必要な「想定星 newStar の口コミ」の最小件数を返す。
 *
 * 条件: (rating*count + newStar*n) / (count + n) >= target
 *  => n*(newStar - target) >= count*(target - rating)
 *
 * - すでに target に達していれば 0
 * - newStar <= target かつ未達なら到達不能（null）
 */
export function reviewsNeeded(
  currentRating: number,
  currentCount: number,
  targetRating: number,
  newStar: number,
): number | null {
  if (currentRating >= targetRating) return 0;
  if (newStar <= targetRating) return null; // それ以下の星では平均を target まで上げられない
  const numerator = currentCount * (targetRating - currentRating);
  const denominator = newStar - targetRating;
  const n = numerator / denominator;
  // 浮動小数点の微小誤差で件数が1件多く出る（例: 40→41）のを防ぐ。
  return Math.max(0, Math.ceil(n - 1e-9));
}

/** n 件の newStar 口コミを足したあとの平均評価 */
export function resultingRating(
  currentRating: number,
  currentCount: number,
  newStar: number,
  n: number,
): number {
  const total = currentRating * currentCount + newStar * n;
  const count = currentCount + n;
  if (count <= 0) return 0;
  return normalizeRating(total / count);
}

/** 目標評価を決める（任意指定 > 競合平均 > 既定値）。競合平均が現状以下なら少し上を狙う。 */
export function resolveTargetRating(
  store: StoreInput,
  competitors: Competitor[],
  custom?: number,
): { target: number; basis: RatingSimulation["targetBasis"] } {
  if (typeof custom === "number" && custom > 0) {
    return { target: normalizeRating(custom), basis: "custom" };
  }
  if (competitors.length > 0) {
    const avg = competitors.reduce((a, c) => a + c.rating, 0) / competitors.length;
    // 競合平均が自店舗より高ければそれを目標に。低ければ「競合平均 or 既定値の高い方」。
    const target = Math.max(avg, Math.min(store.rating + 0.3, DEFAULT_TARGET_RATING));
    return { target: normalizeRating(clamp(target, 0, 5)), basis: "competitor" };
  }
  return { target: DEFAULT_TARGET_RATING, basis: "preset" };
}

/** 「あと何件で追いつけるか」シミュレーション一式を作る */
export function buildSimulation(
  store: StoreInput,
  competitors: Competitor[],
  customTarget?: number,
): RatingSimulation {
  const { target, basis } = resolveTargetRating(store, competitors, customTarget);
  const rating = store.rating;
  const count = store.reviewCount;

  const scenarios: SimulationScenario[] = [];

  // 星5のみ
  {
    const n = reviewsNeeded(rating, count, target, 5);
    scenarios.push({
      id: "five-only",
      label: "星5の口コミだけで改善する場合",
      newReviewStar: 5,
      reviewsNeeded: n,
      resultingRating: n != null ? resultingRating(rating, count, 5, n) : null,
      note:
        n == null
          ? "すでに目標評価に到達しています。"
          : n === 0
            ? "すでに目標評価に到達しています。"
            : `あと約 ${n} 件の星5口コミで、平均 約${target} に近づく可能性があります。`,
    });
  }

  // 星4.6相当の混在（星4と星5が半々のイメージ）
  {
    const mixStar = 4.6;
    const n = reviewsNeeded(rating, count, target, mixStar);
    scenarios.push({
      id: "mix",
      label: "星4と星5が混ざる場合（平均4.6想定）",
      newReviewStar: mixStar,
      reviewsNeeded: n,
      resultingRating: n != null ? resultingRating(rating, count, mixStar, n) : null,
      note:
        n == null
          ? "星4が多いと平均評価は上がりにくく、目標到達にはより多くの口コミが必要です。"
          : `星4が混ざると平均が上がりにくいため、星5のみの場合より多めに必要です（約 ${n} 件）。`,
    });
  }

  // 星4のみ（目標が4.0未満のときだけ意味を持つ）
  {
    const n = reviewsNeeded(rating, count, target, 4);
    scenarios.push({
      id: "four-only",
      label: "星4中心で集まる場合",
      newReviewStar: 4,
      reviewsNeeded: n,
      resultingRating: n != null ? resultingRating(rating, count, 4, n) : null,
      note:
        n == null
          ? `目標 ${target} は星4の口コミだけでは到達できません。星5を中心に獲得する設計が必要です。`
          : `星4中心でも目標に近づけますが、件数は多めに必要です（約 ${n} 件）。`,
    });
  }

  return {
    currentRating: round1(rating),
    currentReviewCount: count,
    targetRating: target,
    targetBasis: basis,
    scenarios,
  };
}
