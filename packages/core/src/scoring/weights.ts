/**
 * 選ばれやすさスコアの各要素の満点（合計100点）。
 * 透明性のため、各要素ごとに「測れた点 / 満点」を結果に出す。
 * 競合データが無い場合は competitorPosition を除いて再正規化する。
 */
export const SCORE_MAX = {
  /** 星評価の高さ */
  ratingQuality: 30,
  /** 口コミ数（信頼の母数） */
  reviewVolume: 25,
  /** 競合平均との相対ポジション（競合がある場合のみ加算） */
  competitorPosition: 20,
  /** オーナー返信の有無 */
  ownerReplies: 8,
  /** 最新口コミの鮮度 */
  freshness: 7,
  /** Googleビジネスプロフィールの充実度（電話/サイト/営業時間/写真） */
  profileCompleteness: 10,
} as const;

/** 星評価スコアの基準（この値で満点 / この値以下で0点） */
export const RATING_FLOOR = 3.2;
export const RATING_CEIL = 4.6;

/** 口コミ数で満点になる件数（対数スケール） */
export const REVIEW_VOLUME_FULL = 200;

/** 鮮度: この日数以内なら満点 / この日数以上なら0点 */
export const FRESHNESS_FULL_DAYS = 30;
export const FRESHNESS_ZERO_DAYS = 120;

/** 既定の目標評価（競合が無いとき / 競合平均が低すぎるとき） */
export const DEFAULT_TARGET_RATING = 4.5;

/** スコア帯のしきい値 */
export const BAND_THRESHOLDS = {
  good: 80, // 80〜100
  fair: 60, // 60〜79
  weak: 40, // 40〜59
  // 0〜39 は poor
} as const;
