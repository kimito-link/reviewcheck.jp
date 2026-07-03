/**
 * AI第一印象診断 → 既存導線（LINE・/monitor）への接続ヘルパー（純粋関数）。
 * 設計 §2-4。既存の buildLineConsultMessage / withRefCode（config）と同じ流儀だが、
 * core パッケージ内で完結させ、AI診断ページから使う（config は web 専用のため）。
 */

const MONITOR_BASE = "https://partner.reverse-re-birth-hack.com/monitor";

/**
 * AI診断由来のLINE相談 初回メッセージ定型文（P0-3・LINE設計 P0-3 と同型）。
 * lin.ee にパラメータは載らないので、文脈はユーザーがコピペで持ち込む。
 * @param storeName 店名（表示専用・trim して差し込む）。空なら店名なしにフォールバック。
 * @param score 総合スコア 0..100。有限数でなければスコア無しにする。
 */
export function buildAiCheckLineMessage(
  storeName?: string | null,
  score?: number | null,
): string {
  const name = storeName?.trim();
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const scoreLabel = hasScore ? `／スコア${Math.round(score as number)}点` : "";
  const head = name
    ? `【AI第一印象診断の続き】${name}${scoreLabel}。`
    : "【AI第一印象診断の続き】";
  return `${head}ぼかし部分の見立てをお願いします。`;
}

/** 監視サブスク（/monitor）への直行URLを組む（AI診断由来 from=aidiag）。
 * ref=RVCHK は絶対に落とさない（webhook の契約自動作成条件・LINE設計 地雷#7）。
 * ?ref= 付きアフィリ流入時は refCode を優先（無ければ RVCHK 維持）。
 * store は表示専用として着地の見出しに引き継ぐ（任意）。
 */
export function buildAiCheckMonitorUrl(opts: {
  refCode?: string | null;
  storeName?: string | null;
}): string {
  const code = opts.refCode?.trim();
  const ref =
    code && /^[A-Za-z0-9_-]{1,32}$/.test(code) ? code : "RVCHK";
  const params = new URLSearchParams({
    plan: "reviewcheck",
    tier: "bamboo",
    ref,
    from: "aidiag",
    utm_source: "aidiag",
    utm_medium: "report",
    utm_campaign: "monitoring",
  });
  const store = opts.storeName?.trim();
  if (store) params.set("store", store);
  return `${MONITOR_BASE}?${params.toString()}`;
}

/**
 * 看板名診断由来のLINE相談 初回メッセージ定型文（看板名診断 §2-4）。
 * @param kanbanName 看板名（院名・芸名）。空なら名称なしにフォールバック。
 */
export function buildKanbanLineMessage(
  kanbanName?: string | null,
  score?: number | null,
): string {
  const name = kanbanName?.trim();
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const scoreLabel = hasScore ? `／スコア${Math.round(score as number)}点` : "";
  const head = name
    ? `【看板名AI診断の続き】${name}${scoreLabel}。`
    : "【看板名AI診断の続き】";
  return `${head}ぼかし部分の見立てをお願いします。`;
}

/** 看板名診断由来の /monitor 直行URL（from=kanban）。ref=RVCHK は絶対に落とさない。 */
export function buildKanbanMonitorUrl(opts: {
  refCode?: string | null;
  storeName?: string | null;
}): string {
  const code = opts.refCode?.trim();
  const ref = code && /^[A-Za-z0-9_-]{1,32}$/.test(code) ? code : "RVCHK";
  const params = new URLSearchParams({
    plan: "reviewcheck",
    tier: "bamboo",
    ref,
    from: "kanban",
    utm_source: "kanban",
    utm_medium: "report",
    utm_campaign: "monitoring",
  });
  const store = opts.storeName?.trim();
  if (store) params.set("store", store);
  return `${MONITOR_BASE}?${params.toString()}`;
}

/** OSINT公開情報ビュー由来の /monitor 直行URL（from=osint）。ref=RVCHK は絶対に落とさない。 */
export function buildOsintMonitorUrl(opts: { refCode?: string | null }): string {
  const code = opts.refCode?.trim();
  const ref = code && /^[A-Za-z0-9_-]{1,32}$/.test(code) ? code : "RVCHK";
  const params = new URLSearchParams({
    plan: "reviewcheck",
    tier: "bamboo",
    ref,
    from: "osint",
    utm_source: "osint",
    utm_medium: "report",
    utm_campaign: "monitoring",
  });
  return `${MONITOR_BASE}?${params.toString()}`;
}

/**
 * SNSシェアURLに計測用 ?via= を付ける（P0-4）。
 * @param shareUrl 診断結果の共有URL（絶対URL）。
 * @param via "x" | "line" | "fb" 等の流入元ラベル。
 */
export function withViaParam(shareUrl: string, via: string): string {
  const v = via.trim();
  if (!v || !/^[a-z0-9_-]{1,16}$/i.test(v)) return shareUrl;
  try {
    const url = new URL(shareUrl);
    url.searchParams.set("via", v);
    return url.toString();
  } catch {
    return shareUrl;
  }
}
