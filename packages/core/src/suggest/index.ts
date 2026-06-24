/**
 * Googleサジェスト（オートコンプリート）取得とネガティブ判定。
 * 取得は無料の complete エンドポイントを使用（Places APIのクォータとは別系統）。
 *
 * 方針（誇張・誤表示を避ける）:
 *   - 表示・判定は「実際に取得できた候補」のみを対象にする。
 *   - 中立文脈（例: 「迷惑メール対策」）は誤検知として除外する。
 */

export type SuggestRiskLevel = "high" | "medium" | "low" | "safe";

export interface AnalyzedSuggest {
  text: string;
  level: "high" | "medium" | "low" | null;
  keyword: string | null;
}

export interface SuggestAnalysis {
  query: string;
  suggestions: AnalyzedSuggest[];
  negatives: AnalyzedSuggest[];
  risk: SuggestRiskLevel;
  source: "google";
}

const NEGATIVE_KEYWORDS: Record<"high" | "medium" | "low", string[]> = {
  high: [
    "詐欺", "騙された", "被害", "悪質", "危険", "違法", "訴訟", "裁判", "逮捕",
    "告訴", "悪徳", "ブラック", "最悪", "やばい", "ヤバい", "ヤバイ", "炎上",
    "パワハラ", "セクハラ", "モラハラ", "マタハラ", "未払い", "給料未払い",
    "倒産", "破産", "反社", "暴力団", "詐欺師", "犯罪", "横領", "不正", "汚職",
    "賄賂", "摘発", "告発", "有罪", "脱税", "裏金", "悪徳商法", "ネズミ講",
    "ねずみ講", "マルチ商法", "ポンジスキーム", "高額請求", "架空請求", "洗脳",
    "強引な勧誘", "盗撮", "盗聴", "窃盗", "フィッシング", "不当解雇", "ヤクザ",
    "やくざ", "虚偽", "無免許", "迷惑電話", "迷惑行為", "迷惑客", "営業電話",
    "勧誘電話", "しつこい電話", "無言電話",
  ],
  medium: [
    "評判悪い", "悪評", "最低", "ひどい", "酷い", "クソ", "くそ", "うざい",
    "ウザい", "しつこい", "怪しい", "苦情", "クレーム", "不信", "嘘", "ウソ",
    "うそつき", "デマ", "無能", "対応悪い", "態度悪い", "ぼったくり", "粗悪",
    "不良品", "欠陥", "不祥事", "隠蔽", "ごまかし", "逃げた", "閉店", "廃業",
    "夜逃げ", "音信不通", "稼げない", "ステマ", "スパム", "解雇", "リストラ",
  ],
  low: ["おすすめしない", "やめとけ", "後悔", "失敗", "気をつけろ", "注意"],
};

const NEUTRAL_CONTEXT_PATTERNS: { neutral: string; ng: string[] }[] = [
  { neutral: "迷惑メール対策", ng: ["迷惑"] },
  { neutral: "迷惑電話拒否", ng: ["迷惑"] },
  { neutral: "電話番号", ng: ["電話"] },
  { neutral: "電話受付", ng: ["電話"] },
  { neutral: "お電話", ng: ["電話"] },
  { neutral: "不安解消", ng: ["不安"] },
  { neutral: "失敗しない", ng: ["失敗"] },
  { neutral: "裏メニュー", ng: ["裏"] },
  { neutral: "裏技", ng: ["裏"] },
  { neutral: "クレーム対応", ng: ["クレーム"] },
  { neutral: "クレーム処理", ng: ["クレーム"] },
  { neutral: "苦情対応", ng: ["苦情"] },
  { neutral: "事故防止", ng: ["事故"] },
  { neutral: "危険物", ng: ["危険"] },
];

const STRONG_NG = ["詐欺", "騙された", "違法", "逮捕", "横領", "パワハラ", "セクハラ"];

function isInNeutralContext(lowerText: string, matched: string): boolean {
  for (const rule of NEUTRAL_CONTEXT_PATTERNS) {
    if (
      lowerText.includes(rule.neutral.toLowerCase()) &&
      rule.ng.includes(matched)
    ) {
      const outside = lowerText.split(rule.neutral.toLowerCase()).join(" ");
      if (STRONG_NG.some((s) => outside.includes(s))) return false;
      return true;
    }
  }
  return false;
}

/** テキストからネガティブ語を検出（high→medium→low の順） */
export function detectNegativeKeyword(text: string): {
  level: "high" | "medium" | "low" | null;
  keyword: string | null;
} {
  if (!text) return { level: null, keyword: null };
  const lower = text.toLowerCase();
  for (const level of ["high", "medium", "low"] as const) {
    for (const kw of NEGATIVE_KEYWORDS[level]) {
      if (lower.includes(kw.toLowerCase())) {
        if (isInNeutralContext(lower, kw)) continue;
        return { level, keyword: kw };
      }
    }
  }
  return { level: null, keyword: null };
}

function overallRisk(items: AnalyzedSuggest[]): SuggestRiskLevel {
  if (items.some((s) => s.level === "high")) return "high";
  if (items.some((s) => s.level === "medium")) return "medium";
  if (items.some((s) => s.level === "low")) return "low";
  return "safe";
}

/** Google complete から候補語を取得（実際に表示される候補のみ） */
export async function fetchGoogleSuggest(
  query: string,
  lang = "ja",
  timeoutMs = 5000,
): Promise<string[]> {
  const q = query.trim();
  if (!q || q.length > 200) return [];
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
    q,
  )}&hl=${encodeURIComponent(lang)}`;
  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": lang },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as [string, string[]];
    return Array.isArray(body?.[1]) ? body[1] : [];
  } catch {
    return [];
  }
}

/**
 * 店舗名のサジェストを取得・分析する。
 * 「店名」と「店名 (＋空白)」の2クエリで Google が自発的に出す候補のみを集計（捏造しない）。
 */
export async function analyzeStoreSuggest(
  storeName: string,
  lang = "ja",
): Promise<SuggestAnalysis | null> {
  const name = (storeName ?? "").trim();
  if (!name) return null;

  const [a, b] = await Promise.all([
    fetchGoogleSuggest(name, lang),
    fetchGoogleSuggest(`${name} `, lang),
  ]);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const s of [...a, ...b]) {
    const t = s.trim();
    if (!t || t.toLowerCase() === name.toLowerCase() || seen.has(t)) continue;
    seen.add(t);
    merged.push(t);
  }

  const suggestions: AnalyzedSuggest[] = merged.map((text) => {
    const { level, keyword } = detectNegativeKeyword(text);
    return { text, level, keyword };
  });
  const negatives = suggestions.filter((s) => s.level !== null);

  return {
    query: name,
    suggestions,
    negatives,
    risk: overallRisk(suggestions),
    source: "google",
  };
}
