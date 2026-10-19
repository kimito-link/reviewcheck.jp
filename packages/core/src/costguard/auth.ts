/**
 * cron・管理系エンドポイントの Bearer 認可（★fail-closed）。
 *
 * 以前は「secret が未設定なら通す」だったため、env を入れ忘れた本番では
 * 誰でも監視スキャン（＝店舗ごとに Google Places を呼ぶ）を起動できた。
 * secret が無い・空なら**常に拒否**する。
 */
export function isBearerAuthorized(
  authorization: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || secret.trim() === "") return false;
  if (!authorization) return false;
  const expected = `Bearer ${secret}`;
  if (authorization.length !== expected.length) return false;
  // 長さをそろえたうえで1文字ずつ比べる（早期 return で一致位置を漏らさない）。
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= authorization.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
