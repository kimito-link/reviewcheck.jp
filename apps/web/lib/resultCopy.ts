import type {
  CompetitorComparison,
  DiagnosisResult,
  ScoreFactor,
  StoreInput,
} from "@reviewcheck/core";
import { selectReviewFindings } from "@reviewcheck/core";

/** 点数のそばに出す1文。存在する項目だけを「／」でつなぐ。 */
export function buildCountSummary(
  store: Pick<StoreInput, "rating" | "reviewCount">,
  comparison: Pick<CompetitorComparison, "total" | "reviewCountRank"> | null,
): string {
  const parts = [`星${store.rating.toFixed(1)}`, `口コミ${store.reviewCount}件`];
  if (comparison && comparison.total > 0) {
    parts.push(
      `周辺${comparison.total}店中 口コミ数 第${comparison.reviewCountRank}位`,
    );
  }
  return parts.join("／");
}

/** 取得時刻を日本時間の YYYY-MM-DD HH:mm にする。 */
export function formatDiagnosedAtJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "記録なし";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}

/** シェア文。点数を先頭にする。「無料」は入れない。 */
export function buildShareText(opts: {
  score?: number;
  storeName?: string;
  ruleVersion: string;
}): string {
  const scorePart =
    typeof opts.score === "number" && Number.isFinite(opts.score)
      ? `選ばれやすさ ${Math.round(opts.score)}点（目安）`
      : "選ばれやすさ（目安）";
  const name = opts.storeName?.trim();
  const namePart = name ? `｜「${name}」` : "";
  return `${scorePart}${namePart}｜口コミチェック.jp（採点ルール v${opts.ruleVersion}）`;
}

/**
 * 「このままにした場合」。金額は出さない。
 * 来店数や円の損失は作らない。
 */
export function leftAloneParagraphs(input: {
  reviewCountDiff: number | null;
  ratingDiff: number | null;
}): string[] {
  const lines: string[] = [];
  if (input.reviewCountDiff != null && input.reviewCountDiff < 0) {
    lines.push(
      `口コミの件数は、周辺の平均より約${Math.abs(input.reviewCountDiff)}件少ない状態です。新しい口コミの増え方が今のままだと、この差は残ります。来店前に地図で見比べる人には、件数の多い店の方が材料が多く見えます。`,
    );
  }
  if (input.ratingDiff != null && input.ratingDiff < -0.05) {
    lines.push(
      `星評価は周辺の平均を${Math.abs(input.ratingDiff).toFixed(1)}下回っています。低評価への返信が無い状態が続くと、その星の並びが地図上に残ります。`,
    );
  }
  if (lines.length === 0) {
    lines.push(
      "いまの点数は、周辺の口コミが増えると相対的に動きます。測る間隔が空くと、変化に気づくのが遅れます。",
    );
  }
  lines.push(
    "ここにあるのは公開情報からの目安です。来店数や金額を示すものではありません。",
  );
  return lines;
}

/** 実測できた採点項目。推定・未確認は結果の内訳に混ぜない。 */
export function isConfirmedFactor(
  factor: Pick<ScoreFactor, "estimated" | "status">,
): boolean {
  return factor.estimated !== true && factor.status !== "info";
}

/**
 * 測れなかった旨。
 * 「見当たらない」のような、見て分かった事実は含めない。
 */
export function isUnconfirmedNotice(text: string): boolean {
  return /確認できず|確認できていない|未確認/.test(text);
}

/** 直すと得られることに出す改善。未確認の案内は末尾へ回す。 */
export function isActionableImprovement(item: {
  title: string;
  detail: string;
}): boolean {
  return !isUnconfirmedNotice(`${item.title}\n${item.detail}`);
}

/** 結果の末尾に短く出す、今回測れなかった項目。重複は除く。 */
export function collectUnconfirmedLines(result: DiagnosisResult): string[] {
  const lines: string[] = [];
  const selection = selectReviewFindings(result);
  if (selection?.primary.unconfirmedNotes) {
    lines.push(...selection.primary.unconfirmedNotes);
  }
  if (selection) {
    for (const chip of selection.secondary) {
      if (isUnconfirmedNotice(chip)) lines.push(chip);
    }
  }
  for (const factor of result.factors) {
    if (!isConfirmedFactor(factor)) {
      lines.push(`${factor.title}：${factor.message}`);
    }
  }
  if (
    !result.comparison &&
    !lines.some((line) => line.includes("周辺のお店との比較"))
  ) {
    lines.push("周辺のお店との比較は、今回の入力には含まれていません。");
  }
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function visibleSecondaryChips(chips: string[]): string[] {
  return chips.filter((chip) => !isUnconfirmedNotice(chip));
}
