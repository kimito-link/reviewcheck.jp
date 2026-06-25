/**
 * 口コミ診断の共通型（Web・拡張・将来モバイル共通の正本フォーマット）。
 * 重要: 検索順位・来店数・星評価の改善を保証しない。数値はすべて「目安」。
 */

/** 選ばれやすさの帯（4段階） */
export type SelectabilityBand = "good" | "fair" | "weak" | "poor";

/** 個別評価要素の状態 */
export type FactorStatus = "good" | "warn" | "bad" | "info";

/** 店舗の基本情報＋口コミ指標。Places API・モック・手入力のいずれでも埋まる。 */
export interface StoreInput {
  /** 店舗名 */
  name?: string;
  /** 住所 */
  address?: string;
  /** カテゴリ（業種） */
  category?: string;
  /** 現在の平均星評価（1.0〜5.0） */
  rating: number;
  /** 現在の口コミ数 */
  reviewCount: number;
  /** GoogleマップURL */
  mapsUrl?: string;
  /** Place ID（取得できれば） */
  placeId?: string;
  /** 電話番号 */
  phone?: string;
  /** WebサイトURL */
  website?: string;
  /** 営業時間が登録されているか */
  hasOpeningHours?: boolean;
  /** 写真が登録されているか */
  hasPhotos?: boolean;
  /** オーナーが口コミに返信しているか */
  hasOwnerReplies?: boolean;
  /** 低評価（★1〜2）の比率（0〜1）。取得・推定できれば。 */
  lowRatingRatio?: number;
  /** 最新口コミからの経過日数（鮮度）。 */
  daysSinceLastReview?: number;
  /** データの出所 */
  source?: "places" | "mock" | "manual";
}

/** 競合店舗（手動追加 or 取得）。比較に使う最小指標。 */
export interface Competitor {
  name?: string;
  rating: number;
  reviewCount: number;
  mapsUrl?: string;
  placeId?: string;
}

/** 診断の入力一式（reportId にエンコードされる正本） */
export interface DiagnosisInput {
  store: StoreInput;
  competitors: Competitor[];
  /** 任意の目標評価（未指定なら競合平均、なければ既定値を使う） */
  targetRating?: number;
}

/** 選ばれやすさスコアの個別要素 */
export interface ScoreFactor {
  id: string;
  title: string;
  status: FactorStatus;
  /** 利用者向けメッセージ */
  message: string;
  /** この要素で獲得した点数 */
  points: number;
  /** この要素の満点 */
  max: number;
  /** 入力・推定値を使った（実測でない）場合 true */
  estimated: boolean;
}

/** 競合比較の結果 */
export interface CompetitorComparison {
  /** 競合の平均星評価 */
  avgRating: number;
  /** 競合の平均口コミ数 */
  avgReviewCount: number;
  /** 自店舗 - 競合平均（星） */
  ratingDiff: number;
  /** 自店舗 - 競合平均（口コミ数） */
  reviewCountDiff: number;
  /** 星評価の順位（1が最上位／自店舗含む） */
  ratingRank: number;
  /** 口コミ数の順位（1が最多／自店舗含む） */
  reviewCountRank: number;
  /** 比較対象の総数（自店舗含む） */
  total: number;
}

/** 「あと何件で追いつけるか」の1シナリオ */
export interface SimulationScenario {
  id: string;
  /** シナリオ名（例：星5の口コミだけで改善する場合） */
  label: string;
  /** 今後獲得する口コミの想定星評価 */
  newReviewStar: number;
  /** 目標到達に必要な口コミ件数（到達不能なら null） */
  reviewsNeeded: number | null;
  /** 到達後の想定平均評価 */
  resultingRating: number | null;
  /** 補足メッセージ */
  note: string;
}

/** 星評価シミュレーション全体 */
export interface RatingSimulation {
  currentRating: number;
  currentReviewCount: number;
  targetRating: number;
  /** 目標の根拠（"competitor" = 競合平均 / "preset" = 既定値 / "custom" = 任意指定） */
  targetBasis: "competitor" | "preset" | "custom";
  scenarios: SimulationScenario[];
}

/** 改善ポイント（結果画面で出すアドバイス） */
export interface ImprovementPoint {
  id: string;
  /** 優先度（high が最優先） */
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
}

/** 診断結果（正本） */
export interface DiagnosisResult {
  /** 入力一式（共有・再現用） */
  input: DiagnosisInput;
  /** ISO日時 */
  diagnosedAt: string;
  /** 0〜100。高いほど選ばれやすい。 */
  score: number;
  band: SelectabilityBand;
  /** 帯に応じた総合メッセージ */
  summary: string;
  factors: ScoreFactor[];
  /** 競合がある場合のみ */
  comparison: CompetitorComparison | null;
  simulation: RatingSimulation;
  improvements: ImprovementPoint[];
  /** 必須の免責文 */
  disclaimer: string;
  /** 接続済みデータプロバイダ名（mock時は空） */
  providers: string[];
  /**
   * マップ口コミの簡易分析（代表口コミが取得できた場合のみ）。
   * reportId（input）には含めず、ライブ診断時にAPIが付与する。
   */
  reviewAnalysis?: import("../reviews/index").ReviewAnalysis | null;
}

/** 入力が不正なときに投げる */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}
