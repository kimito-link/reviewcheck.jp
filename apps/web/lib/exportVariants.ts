import { OSINT_DISCLAIMER } from "@reviewcheck/core";

/**
 * 確認記録の出力区分（2026-08-17 新設）。
 *
 * ★何を解くか: 外部へ送るレポートに、内部向けの文章
 *   （「相手へ返す文章（そのまま送付可）」「紹介先へ転送できる短文」等）が
 *   混ざったまま送付される事故が起きた。
 *   従来のエクスポートは**1種類しか無く**、外部送付用と手元用の区別が
 *   構造的に存在しなかったため、手元で足した文がそのまま外へ出た。
 *
 * ★対策: 出力を4区分に分け、**既定を必ず外部送付用にする**。
 *   外部送付用には内部向け語彙を1語も入れない。混入は機械的に検査する
 *   （buildExternalReport の出力に INTERNAL_ONLY_MARKERS が含まれないこと）。
 *
 * ★「内部用の文を消す」ではなく「外部用を独立に組み立てる」方式にした。
 *   引き算（後から消す）は消し忘れが必ず起きる。足し算（必要なものだけ入れる）なら
 *   入れ忘れは目に見えるが、混入は起きない。
 */

/** 出力の種類。UI の初期選択は必ず "external"。 */
export type ExportVariant = "external" | "internal" | "message" | "referral";

/**
 * ★外部送付用に**絶対に**現れてはいけない語。
 * 事故の実物（AIが対話中に付けた見出し）と、社内用語をここに集約する。
 * テストがこの配列を使って buildExternalReport の出力を機械照合する。
 */
export const INTERNAL_ONLY_MARKERS = [
  "そのまま送付可",
  "相手へ返す文章",
  "紹介先へ転送",
  "CLIENT-READY",
  "CLIENT READY",
  "商品設計",
  "将来サービス化",
  "収益設計",
  "報酬率",
  "紹介コード",
  "内部メモ",
  "営業担当",
  "料金仮説",
] as const;

export interface ExportFact {
  observation: string;
  sourceName: string;
  retrievedAt: string;
}

export interface ExportFailure {
  source: string;
  attemptedAt: string;
}

export interface ExportInput {
  targetName: string;
  facts: ExportFact[];
  failures: ExportFailure[];
  /** 基準日（YYYY-MM-DD）。呼び出し側が渡す（テストで固定するため）。 */
  baseDate?: string | null;
}

const factLines = (i: ExportInput): string[] => [
  ...i.facts.map((f) => `・${f.observation}（出典：${f.sourceName}／取得：${f.retrievedAt}）`),
  ...i.failures.map((r) => `・${r.source}：取得されませんでした（${r.attemptedAt}）`),
];

/**
 * ① 外部送付用レポート（既定）。
 *
 * ★内部向けの語彙を1語も入れない。紹介コード・報酬・営業向けの説明は載せない。
 * ★見出しは社内語（CLIENT-READY DRAFT 等）ではなく、受け取った人が読んで
 *   意味の通る日本語にする。
 */
export function buildExternalReport(input: ExportInput): string {
  const lines: string[] = [
    `公開情報・風評リスク診断レポート（取扱注意）`,
    `対象：${input.targetName}`,
  ];
  if (input.baseDate) lines.push(`基準日：${input.baseDate}`);
  lines.push("");

  lines.push("■ 調査結果と根拠（公開情報による一次診断）");
  const facts = factLines(input);
  lines.push(...(facts.length ? facts : ["・表示できる公開情報はありませんでした。"]));
  lines.push("");

  if (input.failures.length) {
    lines.push("■ 追加確認事項");
    lines.push(
      "・上記のうち「取得されませんでした」と記載した情報源は、この記録では確認できていません。",
    );
    lines.push("・重要な判断に用いる場合は、当該情報源を直接ご確認ください。");
    lines.push("");
  }

  lines.push("■ 本記録の位置づけ");
  lines.push(
    "・本記録は、外部から観測できる公開情報を収集・整理したものです。対象の可否を判定するものではありません。",
  );
  lines.push(
    "・公開情報の範囲で否定的な情報が見つからないことは、安全性を保証するものではありません。",
  );
  lines.push("");

  lines.push("■ 免責事項");
  lines.push(OSINT_DISCLAIMER);
  lines.push("");

  lines.push("■ 診断後のご案内");
  lines.push(
    "簡易診断後、結果画面のLINEから、風評リスク診断またはITセキュリティチェックの具体的な内容をご相談いただけます。",
  );

  return lines.join("\n");
}

/**
 * ② 社内確認用レポート。外部送付用に手元のメモを足したもの。
 * ★これを外へ送らないための区分。UI で明示的に選ばない限り出さない。
 */
export function buildInternalReport(input: ExportInput): string {
  return [
    "【社内確認用】この文章は外部送付用ではありません。",
    "",
    buildExternalReport(input),
    "",
    "■ 社内メモ欄",
    "・（有人確認の要否・追加で当たる情報源・気になった点をここに記入）",
  ].join("\n");
}

/** ③ 送付メッセージ（メール等の添え文）。レポート本体とは別物。 */
export function buildSendMessage(input: ExportInput): string {
  return [
    `${input.targetName} の公開情報の確認記録をお送りします。`,
    "",
    "公開情報を収集・整理したもので、対象の可否を判定するものではありません。",
    "記載のない情報源については未確認です。詳細はレポート本文をご確認ください。",
    "",
    "ご不明な点がありましたらお知らせください。",
  ].join("\n");
}

/**
 * ④ 紹介用短文。
 * ★紹介コードは**この区分にだけ**載せてよい（外部送付用には絶対に載せない）。
 */
export function buildReferralNote(input: ExportInput, refCode?: string | null): string {
  const lines = [
    "公開情報から風評リスクとWebの安全性を確認できる無料診断です。",
    "約1分で結果が出ます。",
    "",
  ];
  const ref = typeof refCode === "string" ? refCode.trim() : "";
  const valid = /^[A-Za-z0-9_-]{1,32}$/.test(ref) && ref.toUpperCase() !== "WEBHC";
  lines.push(
    valid
      ? `https://app.web-health-check.link/?ref=${ref}`
      : "https://app.web-health-check.link/",
  );
  return lines.join("\n");
}

export function buildExport(
  variant: ExportVariant,
  input: ExportInput,
  refCode?: string | null,
): string {
  switch (variant) {
    case "internal":
      return buildInternalReport(input);
    case "message":
      return buildSendMessage(input);
    case "referral":
      return buildReferralNote(input, refCode);
    case "external":
    default:
      // ★未知の値は外部送付用に倒す（内部文が漏れる側に倒さない・fail-safe）。
      return buildExternalReport(input);
  }
}
