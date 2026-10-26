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
  | "suggest"
  | "check"
  | "suggest-check"
  | "ai-check"
  | "kanban-check"
  | "fact-check";

/** network は他サイトとストア。reviewcheck はこのサイトの診断ページ。 */
export type DiagnosisAppGroup = "network" | "reviewcheck";

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
  group: DiagnosisAppGroup;
  /** 出願中である旨。付ける診断だけ。 */
  patentNote?: string;
}

export const DIAGNOSIS_APPS: readonly DiagnosisApp[] = [
  {
    id: "ai-health",
    name: "AIの健康診断",
    value: "AIが公開情報から読む印象を、そのまま見られます。",
    webUrl: "https://app.ai-health-check.link/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "network",
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
    group: "network",
    patentNote: "特許出願中（特願2026-223098・特願2026-227149）",
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
    group: "network",
    patentNote: "特許出願中（特願2026-223098）",
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
    group: "network",
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
    group: "network",
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
    group: "network",
  },
  {
    id: "check",
    name: "口コミ診断",
    value: "店名から、Googleの口コミと星の並びを見られます。",
    webUrl: "https://reviewcheck.jp/check/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "reviewcheck",
  },
  {
    id: "suggest-check",
    name: "サジェスト診断",
    value: "店名と一緒に出る検索候補を、見られます。",
    webUrl: "https://reviewcheck.jp/suggest-check/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "reviewcheck",
  },
  {
    id: "ai-check",
    name: "AIチェック",
    value: "店名から、AIにどう説明されるかを見られます。",
    webUrl: "https://reviewcheck.jp/ai-check/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "reviewcheck",
  },
  {
    id: "kanban-check",
    name: "AI第一印象診断",
    value: "院名・屋号・芸名が、AIからどう読まれるかを見られます。",
    webUrl: "https://reviewcheck.jp/kanban-check/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "reviewcheck",
  },
  {
    id: "fact-check",
    name: "公開情報ビュー",
    value: "公開情報の所在を、判定せずに見られます。",
    webUrl: "https://reviewcheck.jp/fact-check/",
    stores: [],
    verifiedAt: DIAGNOSIS_APPS_VERIFIED_AT,
    group: "reviewcheck",
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
  return `${safeTotal}のうち${n}つを確かめました`;
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
 * 今開いているページと、同じページを指す診断は含めない。
 * 同じパスが残るときは、このサイトの診断ページを1件だけ残す。
 */
export function rankNextDiagnoses(ctx: DiagnosisRankContext): DiagnosisApp[] {
  const excluded = excludedIds(ctx);
  const ranked = DIAGNOSIS_APPS.filter((app) => !excluded.has(app.id))
    .map((app, index) => ({ app, index, score: relevanceScore(app.id, ctx) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.app);
  return preferSitePage(ranked);
}

function excludedIds(ctx: DiagnosisRankContext): Set<DiagnosisAppId> {
  if (ctx.surface === "review") return new Set(["review", "check"]);
  return new Set(["review", "suggest", "suggest-check"]);
}

/** 同じ画面へのリンクは、サイト内の診断名を先に出た位置へ置く。 */
function preferSitePage(ranked: readonly DiagnosisApp[]): DiagnosisApp[] {
  const winnerByPath = new Map<string, DiagnosisApp>();
  for (const app of ranked) {
    const key = toSitePath(app.webUrl);
    const prev = winnerByPath.get(key);
    if (!prev || (app.group === "reviewcheck" && prev.group === "network")) {
      winnerByPath.set(key, app);
    }
  }
  const seen = new Set<string>();
  const out: DiagnosisApp[] = [];
  for (const app of ranked) {
    const key = toSitePath(app.webUrl);
    if (seen.has(key)) continue;
    seen.add(key);
    const winner = winnerByPath.get(key);
    if (winner) out.push(winner);
  }
  return out;
}

function relevanceScore(id: DiagnosisAppId, ctx: DiagnosisRankContext): number {
  if (ctx.surface === "review") {
    const early = ctx.score < 60;
    const steady = ctx.score >= 80;
    const site = ctx.hasWebsite;
    const behind = ctx.behindPeers;
    switch (id) {
      case "suggest":
      case "suggest-check":
        return 100 + (early ? 30 : 0) + (behind ? 15 : 0) - (steady ? 40 : 0);
      case "web-health":
        return 70 + (site ? 25 : 0) + (steady ? 20 : 0);
      case "malware":
        return 55 + (site ? 20 : 0) + (steady ? 10 : 0);
      case "reverse-web":
        return 45 + (site ? 10 : 0);
      case "ai-check":
        return 38 + (steady ? 8 : 0);
      case "ai-health":
        return 35 + (steady ? 5 : 0);
      case "kanban-check":
        return 28;
      case "fact-check":
        return 22;
      case "review":
      case "check":
        return 0;
      default: {
        const neverId: never = id;
        return neverId;
      }
    }
  }
  const risky = ctx.risk === "high" || ctx.risk === "medium";
  const calm = ctx.risk === "safe";
  switch (id) {
    case "check":
      return 100 + (risky ? 20 : 0);
    case "web-health":
      return 60 + (calm ? 25 : 0);
    case "malware":
      return 50 + (risky ? 20 : 0);
    case "reverse-web":
      return 40;
    case "ai-check":
      return 32 + (calm ? 4 : 0);
    case "ai-health":
      return 30 + (calm ? 5 : 0);
    case "kanban-check":
      return 24;
    case "fact-check":
      return 18;
    case "review":
    case "suggest":
    case "suggest-check":
      return 0;
    default: {
      const neverId: never = id;
      return neverId;
    }
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
