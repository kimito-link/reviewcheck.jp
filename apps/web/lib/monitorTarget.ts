/**
 * 監視対象の識別子（reviewcheck では Google placeId）の検証。
 *
 * malwarecheck は normalizeUrl(URL検証＋SSRF対策)だったが、reviewcheck の監視対象は
 * 店舗(Place)なので placeId を使う。MonitorTarget.url 欄にこの placeId を格納する。
 */

// Google Place ID は "ChIJ..." 等の英数字・_・-。緩めに検証して異物を弾く。
const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,256}$/;

/** placeId として妥当なら正規化（trim）した値を、不正なら null を返す。 */
export function normalizePlaceId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!PLACE_ID_RE.test(v)) return null;
  return v;
}
