/**
 * 診断結果の「次の一歩」は1つだけ。しきい値と文言の正本。
 *
 * - 60点未満: LINE。最初の返信は AI（キミと分身）が自動で返す想定。人の返信は約束しない。
 * - 60〜79点: 同じ AI が決まった質問をして改善のポイントを返す。
 *   /contact/?topic=consult には繋がない。
 * - 80点以上: 月次モニタリング（既存の ref / utm 付き URL）。
 *
 * 【プレースホルダ】キミと分身の本番接続（kimitotalk.link/bunshin の URL / LIFF / キーワード）は未確定。
 * 既定の遷移先は風評窓口の LINE（https://lin.ee/JelcWtx）。
 * 上書き:
 * - NEXT_PUBLIC_RESULT_AI_HEARING_URL … 診断フォーム上の結果（ブラウザ）でも有効
 * - RESULT_AI_HEARING_URL … サーバから参照できる場合
 * URL 内の `{message}` は、事前入力文を URL エンコードして置換する。
 * `{message}` が無い短縮URL（lin.ee）は本文を受け取れないため、同じ文をクリップボードにコピーして開く。
 * 文面に入れるのは点数・採点ルール・業種・エリアまで。店名は呼び出し側が明示したときだけ。
 * 「無料」は入れない。
 */

export const DEFAULT_RESULT_AI_HEARING_URL = "https://lin.ee/JelcWtx";

export const RESULT_CTA_THRESHOLDS = {
  /** この点数未満は「LINEで自動の次の一手」 */
  autoLineBelow: 60,
  /** この点数未満は「LINEで改善ポイント」。以上はモニタリング */
  monitoringFrom: 80,
} as const;

export type ResultCtaKind = "line-auto" | "line-hearing" | "monitoring";

export interface ResultCtaCopy {
  kind: ResultCtaKind;
  /** ボタン文言。結果内・再掲・追従バーで同じ */
  label: string;
  /** ボタンの上に出す一文 */
  headline: string;
  /** 補足。人の返信は約束しない */
  body: string;
}

/** 点数から、結果画面で使うただ1つの次の一歩を決める。 */
export function selectResultCta(score: number): ResultCtaCopy {
  if (score < RESULT_CTA_THRESHOLDS.autoLineBelow) {
    return {
      kind: "line-auto",
      label: "診断結果をLINEで送る",
      headline: "診断結果をLINEで送ると、自動で次の一手が届きます",
      body: "キミと分身が、決まった質問のあとに次の一手を自動で返します。人が最初に返信することは想定していません。",
    };
  }
  if (score < RESULT_CTA_THRESHOLDS.monitoringFrom) {
    return {
      kind: "line-hearing",
      label: "LINEで質問に答えて、改善のポイントを受け取る",
      headline: "LINEで質問に答えて、改善のポイントを受け取る",
      body: "キミと分身が決まった質問をします。答えると、改善のポイントが自動で届きます。人が最初に返信することは想定していません。",
    };
  }
  return {
    kind: "monitoring",
    label: "月次モニタリングで、この点数を守る",
    headline: "月次モニタリングで、この点数を守る",
    body: "いまの点数は、周辺の口コミが増えると動きます。毎月の変化を見て、この点数を守る入口です。",
  };
}

/** 点数のすぐ横に出す、目安であることの一文。 */
export const RESULT_ESTIMATE_SENTENCE =
  "Googleマップの公開情報（星・口コミ数・返信・新しさ・プロフィール）を、決まった採点ルールで計算した目安です。断定ではありません。";

/** ブラウザでもサーバでも読める環境変数。@types/node に依存しない。 */
declare const process: {
  env: {
    NEXT_PUBLIC_RESULT_AI_HEARING_URL?: string;
    RESULT_AI_HEARING_URL?: string;
  };
};

/** AIヒアリング（キミと分身）の遷移先。未設定なら風評窓口 LINE。 */
export function getResultAiHearingUrl(): string {
  const pub = process.env.NEXT_PUBLIC_RESULT_AI_HEARING_URL?.trim() ?? "";
  const serverOnly = process.env.RESULT_AI_HEARING_URL?.trim() ?? "";
  return pub || serverOnly || DEFAULT_RESULT_AI_HEARING_URL;
}

export interface AiHearingFacts {
  score: number;
  ruleVersion: string;
  /** 利用者が明示したときだけ入れる */
  shopName?: string | null;
  category?: string | null;
  area?: string | null;
}

function clipFact(value: string | null | undefined, max = 40): string {
  if (!value) return "";
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * 住所から都道府県＋市区町村だけを取る。
 * 番地まで含む文字列や、市区町村が取れない文字列は送らない。
 */
export function areaFromAddress(address?: string | null): string | undefined {
  const raw = address?.replace(/[\r\n\t]+/g, " ").trim();
  if (!raw) return undefined;
  const matched = raw.match(/^(.+?[都道府県])(.+?[市区町村])/);
  if (!matched) return undefined;
  const area = `${matched[1] ?? ""}${matched[2] ?? ""}`;
  if (!area || area.length > 24) return undefined;
  return area;
}

/** LINEに渡す最初の一文。店名・番地・電話は、引数で渡されない限り含めない。 */
export function buildAiHearingMessage(facts: AiHearingFacts): string {
  const score = Math.round(facts.score);
  const version = clipFact(facts.ruleVersion, 16) || "1.0";
  const parts = [`選ばれやすさ ${score}点（目安）`, `採点ルール v${version}`];
  const shop = clipFact(facts.shopName, 40);
  if (shop) parts.push(`店名：${shop}`);
  const category = clipFact(facts.category, 24);
  if (category) parts.push(`業種：${category}`);
  const area = clipFact(facts.area, 24);
  if (area) parts.push(`エリア：${area}`);
  return `【口コミ診断】${parts.join("／")}`;
}

/**
 * `{message}` を含むURLなら事前入力文を埋め込む。
 * 無い場合（lin.ee 等）はURLをそのまま返し、呼び出し側が同じ文をコピーして開く。
 */
export function resolveAiHearingHref(
  message: string,
  baseUrl = getResultAiHearingUrl(),
): { href: string; prefilledInUrl: boolean } {
  if (baseUrl.includes("{message}")) {
    return {
      href: baseUrl.replaceAll("{message}", encodeURIComponent(message)),
      prefilledInUrl: true,
    };
  }
  return { href: baseUrl, prefilledInUrl: false };
}
