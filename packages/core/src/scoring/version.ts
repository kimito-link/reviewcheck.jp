/**
 * 選ばれやすさスコアの採点ルール版。
 * 共有URLに含め、古いURLを開いたときは「いまのルールで計算し直した」と分かるようにする。
 * 採点そのものはこの版の決定的な式だけを使う（AIでは計算しない）。
 */
export const SCORE_RULE_VERSION = "1.0";

/**
 * 共有URLに記録された版が、いま計算に使っている版と違うときの注記。
 * 同じ版なら null。記録が無いURL（このフィールド導入前）も注記する。
 */
export function staleRuleVersionNote(loaded: string | undefined): string | null {
  if (loaded === SCORE_RULE_VERSION) return null;
  if (!loaded) {
    return `この共有URLは、採点ルールの版を記録する前のものです。表示している点数は、いまの採点ルール v${SCORE_RULE_VERSION} で計算し直しています。`;
  }
  return `この共有URLは採点ルール v${loaded} のものです。表示している点数は、いまの採点ルール v${SCORE_RULE_VERSION} で計算し直しています。`;
}
