/**
 * AI第一印象診断の各項目の決定的採点（純粋関数・P1-5 本実装分）。
 * 設計 §2-2。すべて公開データ由来の値を配点に変換する。データ取得不可は呼び出し側で null（按分）。
 */

/**
 * 口コミ評価スコア(0..25)。既存 diagnose の総合スコア(0..100想定)を正規化。
 * score が数値でなければ null（対象外・按分）。
 */
export function scoreReviews(diagnoseScore: number | null | undefined): number | null {
  if (typeof diagnoseScore !== "number" || !Number.isFinite(diagnoseScore)) return null;
  const norm = Math.max(0, Math.min(100, diagnoseScore));
  return Math.round((norm / 100) * 25);
}

/**
 * 検索の見え方スコア(0..20)。suggest の negatives 件数と公式サイト特定有無から。
 * ネガ候補が多いほど減点。公式サイトが特定できれば加点。取得不可は null（按分）。
 * @param negativeCount ネガ系サジェスト件数
 * @param hasOfficialSite 公式サイトが特定できたか（不明なら undefined）
 * @param available suggest 取得自体ができたか（false なら null）
 */
export function scoreSearch(
  negativeCount: number | null | undefined,
  hasOfficialSite: boolean | undefined,
  available: boolean,
): number | null {
  if (!available || negativeCount == null || !Number.isFinite(negativeCount)) return null;
  const base = 20;
  const penalty = Math.min(14, Math.max(0, negativeCount) * 4); // 1件-4点・上限14
  const officialBonus = hasOfficialSite ? 0 : -2; // 公式サイト不明はわずかに減点
  return Math.max(0, Math.min(20, base - penalty + officialBonus));
}

/**
 * なりすまし兆候スコア(0..10)。兆候の件数で減点（兆候ゼロ＝満点）。
 * 取得不可（判定材料なし）は null（按分）。
 * @param signalCount なりすまし/表記ゆれ兆候の件数
 * @param available 判定できたか
 */
export function scoreImpersonation(
  signalCount: number | null | undefined,
  available: boolean,
): number | null {
  if (!available || signalCount == null || !Number.isFinite(signalCount)) return null;
  return Math.max(0, Math.min(10, 10 - Math.max(0, signalCount) * 5));
}
