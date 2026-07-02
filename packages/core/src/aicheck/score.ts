/**
 * 「お店のAI第一印象診断」のスコア合成（決定的採点・純粋関数）。
 * 設計: reviewcheck.jp/docs/DESIGN-ai-first-impression-diagnosis-2026-07-02.md §2-2。
 *
 * 5項目を100点満点で合成する。すべて「公開データ＋構造的チェックリスト」由来の
 * 決定的ロジックで採点し、LLM は採点者にしない（回答サンプルの実測のみ・呼び出し側で判定）。
 *
 * 景表法の守り: スコアは「見え方の現状測定」であり、売上・集客の未来予測を含まない。
 * 傾向表現のみ（「〜の傾向があります」）。断定・未来予測はしない。
 *
 * 按分ルール: サイトが無い店や外部API取得不可の項目は「対象外(null)」とし、
 * 取得できた項目の配点合計で正規化して100点満点に按分する（0点で殴らない＝ブランド毀損防止）。
 */

/** 診断項目のキー */
export type AiCheckFactorKey =
  | "aiVisibility" // AIからの見え方（LLM実測）
  | "reviews" // 口コミ評価（既存 diagnose）
  | "search" // 検索の見え方（サジェスト・公式サイト特定）
  | "siteHealth" // サイトの健康（web-health API）
  | "impersonation"; // 情報のばらつき・なりすまし兆候

/** 各項目の満点（設計 §2-2 の配点） */
export const AI_CHECK_MAX: Record<AiCheckFactorKey, number> = {
  aiVisibility: 25,
  reviews: 25,
  search: 20,
  siteHealth: 20,
  impersonation: 10,
};

/** 項目1件分の採点入力。score は 0..max、対象外は null（按分から除外）。 */
export interface AiCheckFactorInput {
  key: AiCheckFactorKey;
  /** 0〜その項目の満点。対象外（サイト無し・取得不可）は null。 */
  score: number | null;
  /** 表示用の一行傾向コメント（傾向表現のみ）。 */
  note?: string;
}

/** 合成後の項目（表示用） */
export interface AiCheckFactorResult {
  key: AiCheckFactorKey;
  /** この項目の得点（対象外は null） */
  score: number | null;
  /** この項目の満点 */
  max: number;
  /** 対象外（按分から除外された）か */
  excluded: boolean;
  note?: string;
}

/** スコア帯（侮蔑ゼロの語彙・設計 §2-3） */
export type AiCheckBand = "excellent" | "almost" | "growth";

export interface AiCheckScore {
  /** 総合スコア 0〜100（按分後・四捨五入） */
  total: number;
  band: AiCheckBand;
  factors: AiCheckFactorResult[];
}

/** clamp して安全な数値にする（NaN/範囲外を弾く） */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * スコア帯を返す。侮蔑語ゼロ（設計 地雷#6）。
 * 80以上=AI優等生 / 55以上=あと一歩 / それ未満=伸びしろ大。
 */
export function bandForTotal(total: number): AiCheckBand {
  if (total >= 80) return "excellent";
  if (total >= 55) return "almost";
  return "growth";
}

/**
 * 5項目を合成して総合スコア（0〜100・按分）と項目別結果を返す。
 * 対象外(null)の項目は満点合計から除外し、取れた項目だけで100点に正規化する。
 * すべて対象外なら total=0・全項目 excluded（呼び出し側で「診断できませんでした」表示）。
 */
export function composeAiCheckScore(inputs: AiCheckFactorInput[]): AiCheckScore {
  // key の重複や欠落に強くするため、定義済みキーの順で組み立てる。
  const byKey = new Map<AiCheckFactorKey, AiCheckFactorInput>();
  for (const f of inputs) byKey.set(f.key, f);

  const factors: AiCheckFactorResult[] = [];
  let earned = 0;
  let availableMax = 0;

  (Object.keys(AI_CHECK_MAX) as AiCheckFactorKey[]).forEach((key) => {
    const max = AI_CHECK_MAX[key];
    const input = byKey.get(key);
    const raw = input?.score;
    const excluded = raw === null || raw === undefined;
    const score = excluded ? null : clamp(raw as number, 0, max);
    if (!excluded) {
      earned += score as number;
      availableMax += max;
    }
    factors.push({ key, score, max, excluded, note: input?.note });
  });

  const total =
    availableMax > 0 ? Math.round((earned / availableMax) * 100) : 0;

  return { total, band: bandForTotal(total), factors };
}
