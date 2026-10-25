/** 採点の版。規則（項目・減点・並び）を変えたら上げる。 */
export const SITE_CHECK_RUBRIC_VERSION = "site-check v1.0";

export const SITE_CHECK_ACTION_POINTS = 9;
export const SITE_CHECK_CAUTION_POINTS = 4;
export const SITE_CHECK_AGGREGATE_MIN = 30;

export const SITE_CHECK_HONEST_NOTE =
  "見つからない＝安全ではない。外から見えない設定や、ログインの内側は見ていません。";

/**
 * 結果JSONの1件。他の診断（WEB健康診断、reviewcheck.jp、AIの健康診断、リバースハック）へ
 * この形のまま渡す。本文・利用者名・秘密の値は入れない。
 */
export const SITE_CHECK_FINDING_KEYS = [
  "id",
  "status",
  "severity",
  "why",
  "fix",
  "evidence",
] as const;

/** 要対応 / 注意 / 問題なし / 確認できず / 対象外。 */
export type SiteCheckStatus = "action" | "caution" | "ok" | "unknown" | "na";

/** 色ではなく重さ。action=high、caution=medium、ok と対象外=none、確認できず=unknown。 */
export type SiteCheckSeverity = "high" | "medium" | "none" | "unknown";

export interface SiteCheckFix {
  label: string;
  code: string;
}

export interface SiteCheckEvidence {
  /** 何を見たか。ファイルの中身と利用者名は書かない。 */
  summary: string;
  facts: Record<string, string | number | boolean | null>;
}

export interface SiteCheckFinding {
  id: string;
  title: string;
  status: SiteCheckStatus;
  severity: SiteCheckSeverity;
  why: string;
  /** このままにしたとき。 */
  ifLeft: string;
  fix: SiteCheckFix[];
  evidence: SiteCheckEvidence;
}

export interface SiteCheckCounts {
  action: number;
  caution: number;
  ok: number;
  unknown: number;
  na: number;
}

export interface SiteCheckJson {
  rubric: string;
  /** 0〜100。高いほど、この版の項目で不足が少ない。 */
  score: number;
  counts: SiteCheckCounts;
  note: string;
  /** 調べた入口。パスとクエリは付けない。 */
  target: string;
  items: SiteCheckFinding[];
}

export type SiteSignalStatus = "pass" | "warn" | "fail" | "info";

/** 採点関数へ渡す、すでに得ている観測。このパッケージはアプリの型を知らない。 */
export interface SiteSignal {
  id: string;
  status: SiteSignalStatus;
  message: string;
  unconfirmed?: boolean;
}

export interface GradeSiteCheckInput {
  signals: readonly SiteSignal[];
  isWordPress: boolean;
  unreachable: boolean;
  httpsFinal: boolean;
  headers: Record<string, string>;
  discoveryRan: boolean;
  /** 結果の target。空なら空文字。 */
  target?: string;
}
