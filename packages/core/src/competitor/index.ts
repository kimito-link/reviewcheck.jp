import type {
  Competitor,
  CompetitorComparison,
  StoreInput,
} from "../types/index";
import { round1 } from "../utils/number";

/**
 * 画面に残す周辺店の上限。
 * Nearby Search の maxResultCount は 20。自店がその中に入ると周辺は最大 19。
 * ここはそれより少ない 10 で、結果の先頭が点数と相談のまま読めるようにする。
 */
export const MAX_COMPETITORS = 10;

/**
 * 自店舗と競合（最大5件）を比較し、平均・差・順位を返す。
 * 競合が無ければ null。
 */
export function analyzeCompetitors(
  store: StoreInput,
  competitors: Competitor[],
): CompetitorComparison | null {
  const list = competitors.slice(0, MAX_COMPETITORS);
  if (list.length === 0) return null;

  const avgRating = mean(list.map((c) => c.rating));
  const avgReviewCount = mean(list.map((c) => c.reviewCount));

  const ratings = [store.rating, ...list.map((c) => c.rating)];
  const counts = [store.reviewCount, ...list.map((c) => c.reviewCount)];

  return {
    avgRating: round1(avgRating),
    avgReviewCount: Math.round(avgReviewCount),
    ratingDiff: round1(store.rating - avgRating),
    reviewCountDiff: Math.round(store.reviewCount - avgReviewCount),
    ratingRank: rankOf(store.rating, ratings),
    reviewCountRank: rankOf(store.reviewCount, counts),
    total: list.length + 1,
  };
}

/** value が降順で何位か（同値は同順位、1始まり） */
function rankOf(value: number, all: number[]): number {
  const higher = all.filter((v) => v > value).length;
  return higher + 1;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
