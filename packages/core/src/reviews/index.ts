/**
 * Googleマップ口コミの簡易分析。
 *
 * 方針（誇張・断定を避ける）:
 *   - Places API が返す代表的な口コミ（最大5件程度）だけを対象にする。
 *   - 形態素解析は使わず、観点（アスペクト）辞書＋感情キュー語で「目安」を出す。
 *   - 件数が少ないため、結果は必ず「サンプルn件をもとにした目安」と明示する。
 */

import { detectNegativeKeyword } from "../suggest/index";

/** Places から取得した1件の口コミ（正規化後） */
export interface ReviewItem {
  /** 星評価（1〜5） */
  rating?: number;
  /** 本文 */
  text?: string;
  /** 投稿者名 */
  authorName?: string;
  /** 「3か月前」などの相対表記 */
  relativeTime?: string;
}

/** 観点（アスペクト）ごとの言及集計 */
export interface AspectInsight {
  aspect: string;
  positive: number;
  negative: number;
  sentiment: "positive" | "negative" | "mixed";
}

/** 口コミ分析の結果（結果画面で表示） */
export interface ReviewAnalysis {
  /** 分析対象にできた口コミ件数（=サンプル数） */
  count: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  /** サンプルの平均星評価（口コミ本文がない場合 null） */
  avgSampledRating: number | null;
  /** 言及の多い観点（多い順） */
  aspects: AspectInsight[];
  /** 好評だった観点名 */
  positiveAspects: string[];
  /** 改善余地のある観点名 */
  concernAspects: string[];
  /** 強いネガティブ語を含む口コミがあったか（あればキーワード） */
  flaggedKeywords: string[];
  /** 代表的な高評価コメント（抜粋） */
  sampleHighlight?: string;
  /** 代表的な低評価コメント（抜粋） */
  sampleConcern?: string;
  /** 利用者向けの要約（必ず「目安」と明示） */
  note: string;
}

interface AspectDef {
  aspect: string;
  words: string[];
}

const ASPECTS: AspectDef[] = [
  {
    aspect: "接客・スタッフ",
    words: ["接客", "スタッフ", "店員", "従業員", "先生", "施術", "担当", "対応", "笑顔", "態度"],
  },
  {
    aspect: "料金・価格",
    words: ["料金", "価格", "値段", "コスパ", "費用", "予算", "高い", "安い", "リーズナブル"],
  },
  {
    aspect: "待ち時間・予約",
    words: ["待ち", "待た", "予約", "混雑", "行列", "スムーズ", "時間通り", "案内"],
  },
  {
    aspect: "清潔感・雰囲気",
    words: ["清潔", "きれい", "綺麗", "汚", "内装", "店内", "雰囲気", "おしゃれ", "落ち着"],
  },
  {
    aspect: "技術・品質",
    words: ["技術", "上手", "丁寧", "効果", "品質", "仕上が", "味", "美味", "おいし", "まず", "腕"],
  },
  {
    aspect: "説明・わかりやすさ",
    words: ["説明", "わかりやす", "分かりやす", "相談", "提案", "親身"],
  },
  {
    aspect: "アクセス・立地",
    words: ["駐車", "アクセス", "立地", "駅", "近い", "通いやす", "場所"],
  },
];

const POSITIVE_CUES = [
  "良い", "良かった", "よい", "いい", "最高", "丁寧", "親切", "おすすめ", "満足",
  "きれい", "綺麗", "おいし", "美味", "上手", "安心", "素晴らし", "快適", "清潔",
  "好印象", "また来", "また行", "リピート", "助かり", "感謝", "嬉しい", "笑顔",
  "わかりやす", "分かりやす", "スムーズ", "リーズナブル", "安い", "好き",
];

const NEGATIVE_CUES = [
  "悪い", "ひどい", "酷い", "最悪", "不満", "残念", "雑", "遅い", "汚", "まず",
  "不快", "がっかり", "二度と", "失礼", "態度が", "待たされ", "対応が悪", "高い",
  "微妙", "いまいち", "イマイチ", "がっかり", "不親切", "冷たい", "雑な",
];

/** 1件の口コミの総合極性を判定（星評価優先、無ければ本文のキュー語で判定） */
function reviewPolarity(r: ReviewItem): "positive" | "negative" | "neutral" {
  if (typeof r.rating === "number") {
    if (r.rating >= 4) return "positive";
    if (r.rating <= 2) return "negative";
    // 星3はキュー語で補正
  }
  const text = r.text ?? "";
  const pos = POSITIVE_CUES.some((w) => text.includes(w));
  const neg = NEGATIVE_CUES.some((w) => text.includes(w));
  if (neg && !pos) return "negative";
  if (pos && !neg) return "positive";
  return "neutral";
}

function clip(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * 口コミ配列を分析する。空配列なら null。
 */
export function analyzeReviews(reviews: ReviewItem[]): ReviewAnalysis | null {
  const items = (reviews ?? []).filter(
    (r) => typeof r.rating === "number" || (r.text && r.text.trim() !== ""),
  );
  if (items.length === 0) return null;

  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let ratingSum = 0;
  let ratingN = 0;

  const aspectMap = new Map<string, { positive: number; negative: number }>();
  const flagged = new Set<string>();
  let sampleHighlight: string | undefined;
  let sampleConcern: string | undefined;

  for (const r of items) {
    if (typeof r.rating === "number") {
      ratingSum += r.rating;
      ratingN += 1;
    }
    const polarity = reviewPolarity(r);
    if (polarity === "positive") positiveCount += 1;
    else if (polarity === "negative") negativeCount += 1;
    else neutralCount += 1;

    const text = r.text ?? "";
    if (text) {
      // 観点ごとに、レビュー総合極性で加点（簡易）
      for (const def of ASPECTS) {
        if (def.words.some((w) => text.includes(w))) {
          const cur = aspectMap.get(def.aspect) ?? { positive: 0, negative: 0 };
          if (polarity === "negative") cur.negative += 1;
          else if (polarity === "positive") cur.positive += 1;
          aspectMap.set(def.aspect, cur);
        }
      }
      // 強いネガティブ語の検出（既存辞書を再利用）
      const ng = detectNegativeKeyword(text);
      if (ng.keyword && (ng.level === "high" || ng.level === "medium")) {
        flagged.add(ng.keyword);
      }
      // 代表コメント抜粋
      if (polarity === "positive" && !sampleHighlight) sampleHighlight = clip(text);
      if (polarity === "negative" && !sampleConcern) sampleConcern = clip(text);
    }
  }

  const aspects: AspectInsight[] = [...aspectMap.entries()]
    .map(([aspect, v]) => ({
      aspect,
      positive: v.positive,
      negative: v.negative,
      sentiment:
        v.positive > v.negative
          ? ("positive" as const)
          : v.negative > v.positive
            ? ("negative" as const)
            : ("mixed" as const),
    }))
    .sort((a, b) => b.positive + b.negative - (a.positive + a.negative));

  const positiveAspects = aspects
    .filter((a) => a.sentiment === "positive")
    .map((a) => a.aspect);
  const concernAspects = aspects
    .filter((a) => a.sentiment === "negative")
    .map((a) => a.aspect);

  const avgSampledRating =
    ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null;

  const parts: string[] = [];
  parts.push(`取得できた口コミ${items.length}件のうち、高評価${positiveCount}件・低評価${negativeCount}件`);
  if (positiveAspects.length > 0) {
    parts.push(`「${positiveAspects.slice(0, 2).join("・")}」が評価されています`);
  }
  if (concernAspects.length > 0) {
    parts.push(`「${concernAspects.slice(0, 2).join("・")}」に改善の余地がありそうです`);
  }
  const note = `${parts.join("。")}。※Googleが返す代表的な口コミ（最大5件程度）をもとにした簡易分析です。実際の全口コミとは異なる場合があります。`;

  return {
    count: items.length,
    positiveCount,
    neutralCount,
    negativeCount,
    avgSampledRating,
    aspects,
    positiveAspects,
    concernAspects,
    flaggedKeywords: [...flagged],
    sampleHighlight,
    sampleConcern,
    note,
  };
}
