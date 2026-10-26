/**
 * 診断アプリの横断リンク正本。
 * 店舗の口コミ診断から、同じ運営のほかの診断へ回遊するための静的データ。
 * ストアURLは 2026-10-27 に公開ページが 200 だったものだけ。評価数・利用者数は持たない。
 */

export const DIAGNOSIS_APPS_VERIFIED_AT = "2026-10-27" as const;

export type DiagnosisAppId =
  | "ai-health"
  | "web-health"
  | "reverse-web"
  | "malware"
  | "review"
  | "suggest";

export type DiagnosisStoreKind = "appStore" | "googlePlay" | "chrome";

export interface DiagnosisStoreLink {
  kind: DiagnosisStoreKind;
  /** バッジに出す店の名前。評価や件数は含めない。 */
  label: "App Store" | "Google Play" | "Chrome ウェブストア";
  url: string;
}

export interface DiagnosisApp {
  id: DiagnosisAppId;
  name: string;
  /** 落ち着いた、先に価値が分かる一文。 */
  value: string;
  webUrl: string;
  stores: readonly DiagnosisStoreLink[];
  verifiedAt: typeof DIAGNOSIS_APPS_VERIFIED_AT;
}

export const DIAGNOSIS_APPS: readonly DiagnosisApp[] = [
  {
    id: "ai-health",
    name: "AIの健康診断",
    value: "AIが公開情報から読む印象を、そのまま見られます。",
    webUrl: "https://app.ai-health-check.link/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
  {
    id: "web-health",
    name: "WEBサイト健康診断",
    value: "表示の速さと基本設定を、URLから見られます。",
    webUrl: "https://web-health-check.link/",
    stores: [
      {
        kind: "appStore",
        label: "App Store",
        url: "https://apps.apple.com/jp/app/id6779860644",
      },
      {
        kind: "googlePlay",
        label: "Google Play",
        url: "https://play.google.com/store/apps/details?id=com.kimito.link.webhealthcheck",
      },
      {
        kind: "chrome",
        label: "Chrome ウェブストア",
        url: "https://chromewebstore.google.com/detail/hcebljaachgkdfcokcidanmcglflfjbo",
      },
    ],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
  {
    id: "reverse-web",
    name: "リバースハック WEB健康診断",
    value: "公式サイトの状態を、別の点検で見られます。",
    webUrl: "https://app.reverse-re-birth-hack.com/",
    stores: [
      {
        kind: "appStore",
        label: "App Store",
        url: "https://apps.apple.com/jp/app/id6780161483",
      },
      {
        kind: "googlePlay",
        label: "Google Play",
        url: "https://play.google.com/store/apps/details?id=com.reversehack.webhealth",
      },
    ],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
  {
    id: "malware",
    name: "マルウェアチェック.site",
    value: "公開ページが意図せず変わっていないかを、URLで見られます。",
    webUrl: "https://malwarecheck.site/",
    stores: [
      {
        kind: "googlePlay",
        label: "Google Play",
        url: "https://play.google.com/store/apps/details?id=com.reversehack.malwarecheck",
      },
      {
        kind: "chrome",
        label: "Chrome ウェブストア",
        url: "https://chromewebstore.google.com/detail/fdjkilioidoldjmjcofgbhmloiinfidl",
      },
    ],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
  {
    id: "review",
    name: "口コミチェック.jp",
    value: "Googleの口コミと星の並びを、店名から見られます。",
    webUrl: "https://reviewcheck.jp/",
    stores: [
      {
        kind: "chrome",
        label: "Chrome ウェブストア",
        url: "https://chromewebstore.google.com/detail/nianfdjglnjghfmfkiinedfmgkoojcaa",
      },
    ],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
  {
    id: "suggest",
    name: "サジェスト汚染チェッカー",
    value: "検索窓に名前と一緒に出る候補を、見られます。",
    webUrl: "https://reviewcheck.jp/suggest-check/",
    stores: [
      {
        kind: "chrome",
        label: "Chrome ウェブストア",
        url: "https://chromewebstore.google.com/detail/befoihdhopfaaodibepoblcejekffnhk",
      },
    ],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
  },
] as const;

export const DIAGNOSIS_APP_COUNT = DIAGNOSIS_APPS.length;

/** この端末だけで「いくつ確かめたか」を覚えるキー。店名や結果は入れない。 */
export const DIAGNOSIS_PROGRESS_STORAGE_KEY = "rc:checked-diagnoses";

const APP_IDS = new Set<DiagnosisAppId>(DIAGNOSIS_APPS.map((app) => app.id));

export function isDiagnosisAppId(value: unknown): value is DiagnosisAppId {
  return typeof value === "string" && APP_IDS.has(value as DiagnosisAppId);
}

/** 未知のIDと重複を落とす。並びは最初に出てきた順。 */
export function normalizeCheckedIds(value: unknown): DiagnosisAppId[] {
  if (!Array.isArray(value)) return [];
  const out: DiagnosisAppId[] = [];
  for (const item of value) {
    if (isDiagnosisAppId(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export function progressLabel(
  checkedCount: number,
  total: number = DIAGNOSIS_APP_COUNT,
): string {
  const safeTotal = Math.max(0, Math.floor(total));
  const n = Math.max(0, Math.min(safeTotal, Math.floor(checkedCount)));
  return `${safeTotal}つのうち${n}つを確かめました`;
}

export type SuggestRankRisk = "high" | "medium" | "low" | "safe" | "unknown";

export type DiagnosisRankContext =
  | {
      surface: "review";
      score: number;
      hasWebsite: boolean;
      /** 星か口コミ数が、比べた店より少ない */
      behindPeers: boolean;
    }
  | {
      surface: "suggest";
      risk: SuggestRankRisk;
    };

/**
 * いまの結果から、次に開くと近い診断の順。
 * 今見ている診断自身は含めない。点数が高いほど先。
 */
export function rankNextDiagnoses(ctx: DiagnosisRankContext): DiagnosisApp[] {
  const current: DiagnosisAppId = ctx.surface === "review" ? "review" : "suggest";
  return DIAGNOSIS_APPS.filter((app) => app.id !== current)
    .map((app, index) => ({ app, index, score: relevanceScore(app.id, ctx) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.app);
}

function relevanceScore(id: DiagnosisAppId, ctx: DiagnosisRankContext): number {
  if (ctx.surface === "review") {
    const early = ctx.score < 60;
    const steady = ctx.score >= 80;
    const site = ctx.hasWebsite;
    const behind = ctx.behindPeers;
    switch (id) {
      case "suggest":
        return 100 + (early ? 30 : 0) + (behind ? 15 : 0) - (steady ? 40 : 0);
      case "web-health":
        return 70 + (site ? 25 : 0) + (steady ? 20 : 0);
      case "malware":
        return 55 + (site ? 20 : 0) + (steady ? 10 : 0);
      case "reverse-web":
        return 45 + (site ? 10 : 0);
      case "ai-health":
        return 35 + (steady ? 5 : 0);
      default:
        return 0;
    }
  }
  const risky = ctx.risk === "high" || ctx.risk === "medium";
  const calm = ctx.risk === "safe";
  switch (id) {
    case "review":
      return 100 + (risky ? 20 : 0);
    case "web-health":
      return 60 + (calm ? 25 : 0);
    case "malware":
      return 50 + (risky ? 20 : 0);
    case "reverse-web":
      return 40;
    case "ai-health":
      return 30 + (calm ? 5 : 0);
    default:
      return 0;
  }
}

const LINE_IN_APP_MARK = " Line/";

/** LINEのアプリ内ブラウザ。UA に「 Line/」を含むときだけ。 */
export function isLineInAppBrowser(userAgent: string): boolean {
  return userAgent.includes(LINE_IN_APP_MARK);
}

export function isExternalDiagnosisUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host !== "reviewcheck.jp" && host !== "www.reviewcheck.jp";
  } catch {
    return false;
  }
}

/** 自サイトの絶対URLは、同じサイト内のパスにする。 */
export function toSitePath(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "reviewcheck.jp" || host === "www.reviewcheck.jp") {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }
  } catch {
    /* 相対URLなどはそのまま */
  }
  return url;
}

/**
 * 外部リンクだけ、LINEアプリ内ブラウザのとき末尾に openExternalBrowser=1 を足す。
 * ストアURLに計測用の別パラメータは足さない。
 */
export function withLineExternalParam(url: string, userAgent: string): string {
  if (!isLineInAppBrowser(userAgent) || !isExternalDiagnosisUrl(url)) return url;
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  if (/[?&]openExternalBrowser=/.test(base)) return url;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}openExternalBrowser=1${hash}`;
}

/** 画面に出す href。自サイトはパス、外部は LINE のときだけクエリを足す。 */
export function diagnosisHref(url: string, userAgent: string): string {
  if (!isExternalDiagnosisUrl(url)) return toSitePath(url);
  return withLineExternalParam(url, userAgent);
}
