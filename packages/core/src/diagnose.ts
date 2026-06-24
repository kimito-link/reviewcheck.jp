import { DISCLAIMER } from "./constants";
import { analyzeCompetitors, MAX_COMPETITORS } from "./competitor/index";
import {
  BAND_LABEL,
  computeSelectabilityScore,
  summaryFromBand,
} from "./scoring/index";
import { buildSimulation } from "./simulator/index";
import type {
  CompetitorComparison,
  DiagnosisInput,
  DiagnosisResult,
  ImprovementPoint,
  RatingSimulation,
  ScoreFactor,
  StoreInput,
} from "./types/index";
import { InvalidInputError } from "./types/index";
import { normalizeRating, toCount } from "./utils/number";

export interface DiagnoseOptions {
  /** 取得元プロバイダ名（mockなら空配列） */
  providers?: string[];
}

/**
 * 診断の正本。入力（自店舗＋競合＋目標）から結果一式を組み立てる。
 * Web・拡張・将来モバイルで共有する。純粋関数（副作用なし）。
 */
export function diagnose(
  input: DiagnosisInput,
  options: DiagnoseOptions = {},
): DiagnosisResult {
  const store = sanitizeStore(input.store);
  const competitors = (input.competitors ?? [])
    .slice(0, MAX_COMPETITORS)
    .map((c) => ({
      ...c,
      rating: normalizeRating(c.rating),
      reviewCount: toCount(c.reviewCount),
    }));

  const { score, band, factors } = computeSelectabilityScore(store, competitors);
  const comparison = analyzeCompetitors(store, competitors);
  const simulation = buildSimulation(store, competitors, input.targetRating);
  const improvements = buildImprovements(
    store,
    factors,
    comparison,
    simulation,
  );

  return {
    input: { store, competitors, targetRating: input.targetRating },
    diagnosedAt: new Date().toISOString(),
    score,
    band,
    summary: `${BAND_LABEL[band]}。${summaryFromBand(band)}`,
    factors,
    comparison,
    simulation,
    improvements,
    disclaimer: DISCLAIMER,
    providers: options.providers ?? [],
  };
}

function sanitizeStore(store: StoreInput): StoreInput {
  if (!store || typeof store.rating !== "number") {
    throw new InvalidInputError("店舗の星評価が指定されていません。");
  }
  return {
    ...store,
    rating: normalizeRating(store.rating),
    reviewCount: toCount(store.reviewCount ?? 0),
  };
}

/** 結果画面に出す改善ポイントを優先度つきで生成 */
function buildImprovements(
  store: StoreInput,
  factors: ScoreFactor[],
  comparison: CompetitorComparison | null,
  simulation: RatingSimulation,
): ImprovementPoint[] {
  const points: ImprovementPoint[] = [];

  // 競合より口コミ数が少ない
  if (comparison && comparison.reviewCountDiff < 0) {
    const five = simulation.scenarios.find((s) => s.id === "five-only");
    const need =
      five && five.reviewsNeeded != null && five.reviewsNeeded > 0
        ? `あと約${five.reviewsNeeded}件の高評価口コミが目安です。`
        : "正当な口コミ獲得導線の設計をおすすめします。";
    points.push({
      id: "review-count-gap",
      priority: "high",
      title: "競合より口コミ数が少なく、比較検討で不利になりやすい",
      detail: `競合平均より口コミが約${Math.abs(comparison.reviewCountDiff)}件少ない状態です。件数が少ないと信頼感で差が出やすいため、${need}`,
    });
  }

  // 星評価が低め
  if (store.rating < 4.0) {
    points.push({
      id: "low-rating",
      priority: "high",
      title: "星評価の底上げが必要",
      detail:
        "星評価が4.0未満です。低評価への誠実な返信・改善と、満足度の高いお客様からの口コミ獲得で、平均評価の底上げを狙います。",
    });
  } else if (comparison && comparison.ratingDiff < -0.1) {
    points.push({
      id: "rating-gap",
      priority: "medium",
      title: "星評価が競合平均をやや下回る",
      detail: `競合平均より星評価が${Math.abs(comparison.ratingDiff)}ポイント低い状態です。高評価の口コミを増やすことで差を縮められます。`,
    });
  }

  // オーナー返信
  if (store.hasOwnerReplies === false) {
    points.push({
      id: "owner-reply",
      priority: "high",
      title: "口コミへの返信ができていない",
      detail:
        "返信は信頼を高め、低評価の印象も和らげます。高評価にも低評価にも、方針を決めて返信する運用づくりをおすすめします。",
    });
  } else if (store.hasOwnerReplies === undefined) {
    points.push({
      id: "owner-reply-check",
      priority: "low",
      title: "口コミ返信の状況を確認しましょう",
      detail:
        "返信状況が未確認です。未返信の口コミ（特に低評価）が残っていないか確認し、返信方針を整えることをおすすめします。",
    });
  }

  // 低評価比率
  if (typeof store.lowRatingRatio === "number" && store.lowRatingRatio > 0.2) {
    points.push({
      id: "bad-review",
      priority: "high",
      title: "低評価口コミへの対応が必要",
      detail:
        "低評価の比率が高めです。規約違反の口コミは正当な手続きで削除申請を検討しつつ、誠実な返信と再発防止で信頼回復を図ります。",
    });
  }

  // プロフィール充実度
  const profile = factors.find((f) => f.id === "profileCompleteness");
  if (profile && !profile.estimated && profile.points < profile.max * 0.75) {
    points.push({
      id: "profile",
      priority: "medium",
      title: "Googleビジネスプロフィールの充実",
      detail:
        "電話・Webサイト・営業時間・写真などを充実させると、Googleマップ上で選ばれやすくなります（MEO対策）。",
    });
  }

  // 鮮度
  if (
    typeof store.daysSinceLastReview === "number" &&
    store.daysSinceLastReview > 60
  ) {
    points.push({
      id: "freshness",
      priority: "medium",
      title: "新しい口コミが少なく勢いが弱い",
      detail:
        "最近の口コミが少ないと活気が伝わりにくくなります。来店時の声かけやサンクス導線で、継続的に口コミが集まる仕組みづくりをおすすめします。",
    });
  }

  // 何も無ければポジティブな次の一手
  if (points.length === 0) {
    points.push({
      id: "keep",
      priority: "low",
      title: "良い状態を維持・さらに伸ばす",
      detail:
        "現状は良好です。継続的な口コミ獲得と返信運用で勢いを止めないこと、競合の動向をモニタリングして優位を保つことをおすすめします。",
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return points.sort((a, b) => order[a.priority] - order[b.priority]);
}
