import type { DiagnosisResult } from "@reviewcheck/core";
import { selectReviewFindings } from "@reviewcheck/core";
import { selectResultCta } from "@reviewcheck/config";
import type { CohortPublic } from "@/lib/cohort/public";
import { parseCohortRegion } from "@/lib/cohort/region";
import {
  buildCountSummary,
  collectUnconfirmedLines,
  formatDiagnosedAtJst,
  isActionableImprovement,
  isConfirmedFactor,
  isUnconfirmedNotice,
  leftAloneParagraphs,
} from "@/lib/resultCopy";
import {
  planScoreHistory,
  SCORE_HISTORY_FIRST,
  SCORE_HISTORY_MISMATCH,
  type StoredScore,
} from "@/lib/scoreHistory";

export const REPORT_LEAD = "これは診断時点の推定で、断定ではありません。";

export const REPORT_FIX_BOUNDARY =
  "直し方は、実際の来店にもとづく口コミと、返信やプロフィールの整備です。口コミの購入、高評価の指定、競合への低評価は対象外です。";

export interface ReportBlock {
  heading: string;
  paragraphs: string[];
}

export interface DiagnosisReportDocument {
  lead: string;
  blocks: ReportBlock[];
}

function sourceLabel(source: DiagnosisResult["input"]["store"]["source"]): string {
  if (source === "places") return "Googleマップの公開情報";
  if (source === "manual") return "手入力";
  if (source === "mock") return "サンプル（架空の数値）";
  return "取得元の記録なし";
}

/**
 * 同じ採点ルールのときだけ、前回との差の文を返す。
 * 版が違うとき、初回のときは null（差の数字を作らない）。
 */
export function previousCompareLine(
  prev: StoredScore | null,
  current: Pick<StoredScore, "score" | "date" | "ruleVersion">,
): string | null {
  if (!prev) return null;
  const plan = planScoreHistory(prev, {
    score: current.score,
    date: current.date,
    ruleVersion: current.ruleVersion,
  });
  if (
    plan.message === SCORE_HISTORY_FIRST ||
    plan.message === SCORE_HISTORY_MISMATCH
  ) {
    return null;
  }
  return plan.message;
}

function cohortParagraphs(cohort: CohortPublic | null): string[] {
  if (!cohort?.show) return [];
  const lines = [
    `近所の同じ業種（${cohort.categoryLabel}・${cohort.regionLabel}）の中で上位${cohort.topPercent}%`,
    `同業種の平均${cohort.averageScore}点`,
    `星の平均 ${cohort.averageRating.toFixed(1)}／口コミ件数の平均 ${cohort.averageReviewCount}件`,
  ];
  if (typeof cohort.replyShare === "number") {
    lines.push(`返信ありの割合 ${Math.round(cohort.replyShare * 100)}%`);
  }
  lines.push(
    `同じ業種・地域の診断${cohort.sampleCount}件を集計した推定です。断定ではありません。`,
  );
  return lines;
}

/** Google の結果を端末に残すとき。点数・順位・推定の販売文は入れない。 */
function buildPlacesFactsDocument(
  store: DiagnosisResult["input"]["store"],
  diagnosedAt: string,
): DiagnosisReportDocument {
  const when = formatDiagnosedAtJst(diagnosedAt);
  const missed = [
    typeof store.hasPhotos === "boolean" ? "" : "写真：今回は取得していません。",
    typeof store.hasOwnerReplies === "boolean" ? "" : "返信：今回は取得していません。",
    typeof store.daysSinceLastReview === "number" ? "" : "最新口コミの日付：今回は取得していません。",
  ].filter(Boolean);
  return {
    lead: "取得できた公開情報です。点数と順位は入れていません。未確認の項目は、足りないものとしては書いていません。このファイルはこの端末の中に残ります。",
    blocks: [
      {
        heading: "取得できた公開情報",
        paragraphs: [
          `星 ${store.rating.toFixed(1)}`,
          `口コミ ${store.reviewCount}件`,
          `電話 ${store.phone?.trim() || "公開情報に無し"}`,
          `ウェブサイト ${store.website?.trim() || "公開情報に無し"}`,
          `営業時間 ${store.hasOpeningHours ? "公開情報にあり" : "公開情報に無し"}`,
          "写真、返信、最新口コミの日付は今回取得していません。不足としては書いていません。",
        ],
      },
      ...(store.name?.trim()
        ? [{ heading: "店名", paragraphs: [store.name.trim()] }]
        : []),
      {
        heading: "任意の相談",
        paragraphs: [
          "相談は任意です。15分のご相談に費用はかかりません。月次の自動巡回は、新規では受けていません。",
        ],
      },
      ...(missed.length > 0
        ? [{ heading: "確認できなかった項目", paragraphs: missed }]
        : []),
      {
        heading: "記録",
        paragraphs: [
          `診断日時：${when}（日本時間）`,
          "データの取得元：Googleマップの公開情報",
          "このレポートに点数と順位は入れていません。",
        ],
      },
    ],
  };
}

export function buildDiagnosisReport(input: {
  result: Pick<DiagnosisResult, "input" | "diagnosedAt"> & Partial<DiagnosisResult>;
  previous?: StoredScore | null;
  cohort: CohortPublic | null;
}): DiagnosisReportDocument {
  const store = input.result.input.store;
  if (store.source === "places" || store.source === "mock") {
    return buildPlacesFactsDocument(store, input.result.diagnosedAt);
  }
  const result = input.result as DiagnosisResult;
  const previous = input.previous ?? null;
  const cohort = input.cohort;
  const selection = selectReviewFindings(result);
  const when = formatDiagnosedAtJst(result.diagnosedAt);
  const region = parseCohortRegion(store.address);

  const findings: string[] = [];
  if (result.summary.trim()) findings.push(result.summary.trim());
  if (selection) {
    const finding = selection.primary.finding
      .replace(/詳しくは下の「[^」]+」に並べてあります。/g, "")
      .trim();
    findings.push(`${selection.primary.name}：${finding}`);
    for (const chip of selection.secondary) {
      if (!isUnconfirmedNotice(chip)) findings.push(chip);
    }
  }
  if (findings.length === 0) {
    findings.push("主な指摘として名前を付けられる組み合わせはありませんでした。");
  }

  const reasons: string[] = [];
  if (selection?.primary.structure) reasons.push(selection.primary.structure);
  for (const factor of result.factors) {
    if (!isConfirmedFactor(factor)) continue;
    reasons.push(`${factor.title}：${factor.message}`);
  }

  const fixes = result.improvements
    .filter((item) => isActionableImprovement(item))
    .map((item) => `${item.title}：${item.detail}`);
  if (selection?.primary.selfCare) fixes.push(selection.primary.selfCare);
  fixes.push(REPORT_FIX_BOUNDARY);

  const cta = selectResultCta(result.score);
  const blocks: ReportBlock[] = [];

  const scoreLines = [`選ばれやすさ ${Math.round(result.score)}点（目安）`];
  if (store.name?.trim()) scoreLines.push(`店名：${store.name.trim()}`);
  if (region) scoreLines.push(`地域：${region.label}`);
  blocks.push({ heading: "点数", paragraphs: scoreLines });

  const compare = previousCompareLine(previous, {
    score: result.score,
    date: result.diagnosedAt,
    ruleVersion: result.ruleVersion,
  });
  if (compare) blocks.push({ heading: "前回との差", paragraphs: [compare] });

  blocks.push({
    heading: "件数のまとめ",
    paragraphs: [buildCountSummary(store, result.comparison)],
  });
  blocks.push({ heading: "主な指摘", paragraphs: findings });
  if (reasons.length > 0) blocks.push({ heading: "理由", paragraphs: reasons });
  blocks.push({ heading: "直し方", paragraphs: fixes });
  blocks.push({
    heading: "このままだと失うこと",
    paragraphs: leftAloneParagraphs({
      reviewCountDiff: result.comparison ? result.comparison.reviewCountDiff : null,
      ratingDiff: result.comparison ? result.comparison.ratingDiff : null,
    }),
  });
  blocks.push({
    heading: "次の一歩",
    paragraphs: [cta.headline, cta.body, cta.label],
  });

  const cohortLines = cohortParagraphs(cohort);
  if (cohortLines.length > 0) {
    blocks.push({ heading: "同じ業種・地域との比較", paragraphs: cohortLines });
  }

  const missed = collectUnconfirmedLines(result);
  if (missed.length > 0) {
    blocks.push({ heading: "確認できなかった項目", paragraphs: missed });
  }

  blocks.push({
    heading: "記録",
    paragraphs: [
      `採点基準の版 SCORE_RULE_VERSION：${result.ruleVersion}`,
      `診断日時：${when}（日本時間）`,
      `データの取得元：${sourceLabel(store.source)}`,
      `取得時刻：${when}（日本時間）`,
    ],
  });

  return { lead: REPORT_LEAD, blocks };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 端末内で保存するHTML。外部へは送らない。 */
export function reportToHtml(doc: DiagnosisReportDocument): string {
  const body = doc.blocks
    .map((block) => {
      const paras = block.paragraphs
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return `<section><h2>${escapeHtml(block.heading)}</h2>${paras}</section>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>口コミ診断レポート</title>
<style>
  body { margin: 24px auto; max-width: 40rem; padding: 0 16px; background: #ffffff; color: #0f172a; font-size: 16px; line-height: 1.7; font-family: "Noto Sans JP", sans-serif; }
  h1 { font-size: 24px; line-height: 1.4; margin: 0 0 8px; }
  h2 { font-size: 18px; line-height: 1.4; margin: 24px 0 8px; }
  p { margin: 0 0 8px; font-size: 16px; }
  .lead { font-weight: 700; }
</style>
</head>
<body>
<h1>口コミ診断レポート</h1>
<p class="lead">${escapeHtml(doc.lead)}</p>
${body}
</body>
</html>
`;
}
