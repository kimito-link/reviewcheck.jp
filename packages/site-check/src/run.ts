import { gradeSiteCheck } from "./grade";
import { detectJsLibs } from "./rubric";
import type { SiteCheckJson, SiteSignal } from "./types";

/** 対象サイトへの GET の上限。DNS の問い合わせは数えない。 */
export const SITE_CHECK_MAX_TARGET_REQUESTS = 14;

const SECOND_LEVEL = new Set([
  "co.jp", "or.jp", "ne.jp", "ac.jp", "ad.jp", "ed.jp", "go.jp", "gr.jp", "lg.jp",
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au", "co.nz", "com.tw", "com.hk", "co.kr", "com.sg", "com.br",
]);

const HTML_BYTES = 48_000;
const SNIFF_BYTES = 180;

export interface SiteCheckRunOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  userAgent?: string;
  gapMs?: number;
  now?: Date;
  /** 呼び出し側が証明書の期限を読めたとき。ISO 日時。ブラウザの fetch では取れない。 */
  certNotAfter?: string | null;
  /** TXT を返す。失敗は null。省略すると DNS-over-HTTPS を1件ずつ使う。 */
  lookupTxt?: (name: string) => Promise<string[] | null>;
  maxTargetRequests?: number;
}

interface Got {
  status: number;
  location: string | null;
  url: string;
  headers: Record<string, string>;
  text: string;
}

function registrableDomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.+$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return null;
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const last2 = parts.slice(-2).join(".");
  if (SECOND_LEVEL.has(last2)) return parts.length >= 3 ? parts.slice(-3).join(".") : null;
  return last2;
}

export function isBlockedSiteHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "::1" || host === "0.0.0.0" || host === "169.254.169.254") return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 169 && b === 254)) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function assertPublic(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("http と https 以外は調べません");
  }
  if (parsed.username || parsed.password) throw new Error("資格情報付きの宛先は調べません");
  if (isBlockedSiteHost(parsed.hostname)) throw new Error("内部の宛先は調べません");
  return parsed;
}

function lowerHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  const decoder = new TextDecoder();
  let text = "";
  while (total < maxBytes) {
    const step = await reader.read();
    if (step.done) break;
    const piece = step.value;
    const room = maxBytes - total;
    const slice = piece.byteLength > room ? piece.slice(0, room) : piece;
    chunks.push(slice);
    total += slice.byteLength;
    text += decoder.decode(slice, { stream: true });
    if (piece.byteLength > room) break;
  }
  text += decoder.decode();
  try {
    await reader.cancel();
  } catch {
    /* 残りは受け取らない */
  }
  return text;
}

async function get(
  fetchImpl: typeof fetch,
  url: string,
  opts: { timeoutMs: number; signal?: AbortSignal; userAgent: string; redirect: "manual" | "follow"; maxBytes: number },
): Promise<Got | null> {
  assertPublic(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: opts.redirect,
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "user-agent": opts.userAgent },
    });
    const headers = lowerHeaders(res.headers);
    const text = await readCapped(res, opts.maxBytes);
    return { status: res.status, location: res.headers.get("location"), url: res.url || url, headers, text };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

function looksWordPress(html: string): boolean {
  return /wp-content\/|wp-includes\/|<meta[^>]*name=["']generator["'][^>]*wordpress|wordpress[^"']*["'][^>]*generator/i.test(html);
}

function scriptSrcs(html: string, base: string): string[] {
  const out: string[] = [];
  for (const matched of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try {
      out.push(new URL(matched[1] ?? "", base).toString());
    } catch {
      /* 住所が壊れていれば読み飛ばす */
    }
  }
  return out;
}

function exposesVersion(value: string): boolean {
  return /[0-9]+\.[0-9]+/.test(value);
}

function looksSecret(path: string, text: string): boolean {
  if (path.endsWith("/.env") || path.endsWith(".env")) return /(^|\n)[A-Z0-9_]{3,}=/.test(text);
  if (path.endsWith("/HEAD")) return /^ref: refs\/|^[0-9a-f]{40}/.test(text.trim());
  if (path.endsWith(".sql")) return /CREATE TABLE|INSERT INTO|-- MySQL/i.test(text);
  if (path.endsWith(".bak")) return /DB_NAME|DB_PASSWORD|define\(\s*['"]DB_/i.test(text);
  return false;
}

function looksListing(text: string): boolean {
  return /<title>\s*index of\s*\//i.test(text) || /\[parent directory\]/i.test(text) || /directory listing for/i.test(text);
}

async function defaultLookupTxt(name: string, fetchImpl: typeof fetch, signal: AbortSignal | undefined, timeoutMs: number): Promise<string[] | null> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "application/dns-json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { Answer?: { data?: string }[] };
    const rows = (json.Answer ?? []).map((row) => (row.data ?? "").replace(/^"|"$/g, "").replace(/"\s*"/g, ""));
    return rows;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function certSignal(notAfter: string | null | undefined, now: Date): SiteSignal | null {
  if (!notAfter) return null;
  const days = Math.floor((Date.parse(notAfter) - now.getTime()) / 86_400_000);
  if (!Number.isFinite(days)) return null;
  if (days < 0) {
    return { id: "tls-cert-expiry", status: "warn", message: "通信の証明書の期限が過ぎています（重さ：急ぎ）" };
  }
  if (days <= 30) {
    return { id: "tls-cert-expiry", status: "warn", message: `通信の証明書の期限が近づいています（残り ${days} 日）` };
  }
  return { id: "tls-cert-expiry", status: "info", message: `通信の証明書の残り日数は ${days} 日です（重さ：参考）` };
}

/**
 * 宛先を外からだけ見る。GET だけ。ログインも書き込みもしない。
 * ファイルの中身は判定に必要な先頭だけ読み、結果には残さない。
 */
export async function runSiteCheck(target: string, options: SiteCheckRunOptions = {}): Promise<SiteCheckJson> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 4000;
  const gapMs = options.gapMs ?? 150;
  const userAgent = options.userAgent ?? "SiteCheck/1.0";
  const max = options.maxTargetRequests ?? SITE_CHECK_MAX_TARGET_REQUESTS;
  let sent = 0;
  const signals: SiteSignal[] = [];
  const now = options.now ?? new Date();

  let start: URL;
  try {
    start = assertPublic(target.includes("://") ? target : `https://${target}`);
  } catch {
    return gradeSiteCheck({
      signals: [],
      isWordPress: false,
      unreachable: true,
      httpsFinal: false,
      headers: {},
      discoveryRan: false,
      target: "",
    });
  }

  const budget = async (url: string, maxBytes: number, redirect: "manual" | "follow"): Promise<Got | null> => {
    if (options.signal?.aborted || sent >= max) return null;
    if (sent > 0) await sleep(gapMs, options.signal);
    sent += 1;
    return get(fetchImpl, url, { timeoutMs, signal: options.signal, userAgent, redirect, maxBytes });
  };

  let current = start.toString();
  let page: Got | null = null;
  for (let hop = 0; hop < 4; hop++) {
    const got = await budget(current, HTML_BYTES, "manual");
    if (!got) break;
    const redirected = got.status >= 300 && got.status < 400 && Boolean(got.location);
    if (!redirected) {
      page = got;
      break;
    }
    try {
      const next = new URL(got.location!, current);
      assertPublic(next.toString());
      current = next.toString();
    } catch {
      break;
    }
  }

  const unreachable = !page || page.status >= 500 || page.status === 0;
  const finalUrl = page ? current : start.toString();
  let finalHost = start.hostname;
  try {
    finalHost = new URL(finalUrl).hostname;
  } catch {
    /* start のホストを使う */
  }
  const httpsFinal = finalUrl.startsWith("https://");
  const headers = page?.headers ?? {};
  const html = page?.text ?? "";
  const origin = (() => {
    try {
      return new URL(finalUrl).origin;
    } catch {
      return "";
    }
  })();
  const wp = looksWordPress(html);

  if (!unreachable && httpsFinal) signals.push({ id: "https", status: "pass", message: "HTTPSの入口で応答しました。" });
  else if (!unreachable) signals.push({ id: "https", status: "fail", message: "HTTPSの入口ではありません。" });

  const server = headers.server ?? "";
  const powered = headers["x-powered-by"] ?? "";
  if (!unreachable && (exposesVersion(server) || exposesVersion(powered))) {
    signals.push({ id: "server-version", status: "warn", message: "応答に版の番号が見えました。" });
  }

  if (!unreachable) {
    const csp = headers["content-security-policy"] ?? "";
    signals.push({
      id: "header-csp",
      status: csp ? "pass" : "warn",
      message: csp ? "読み込み元の制限があります。" : "読み込み元の制限は見当たりませんでした。",
    });
    if (/unsafe-inline|unsafe-eval/i.test(csp)) {
      signals.push({ id: "xss-csp-weak", status: "warn", message: "読み込み元の制限が広いです。" });
    }
    const hsts = headers["strict-transport-security"] ?? "";
    signals.push({
      id: "header-hsts",
      status: /max-age\s*=\s*[1-9]/.test(hsts) ? "pass" : "info",
      message: hsts ? "常に暗号化通信を使う指示があります。" : "常に暗号化通信を使う指示は見当たりませんでした。",
    });
    signals.push({
      id: "header-xcto",
      status: /nosniff/i.test(headers["x-content-type-options"] ?? "") ? "pass" : "warn",
      message: "ファイルの種類の指示を確認しました。",
    });
    const referrer = headers["referrer-policy"] ?? "";
    signals.push({
      id: "header-referrer",
      status: referrer && !/unsafe-url/i.test(referrer) ? "pass" : "warn",
      message: "アクセス元情報の範囲を確認しました。",
    });
    signals.push({
      id: "header-permissions",
      status: headers["permissions-policy"] ? "pass" : "warn",
      message: "機能の制限を確認しました。",
    });
  }

  if (httpsFinal && /(?:src|href)\s*=\s*["']http:\/\//i.test(html)) {
    signals.push({ id: "mixed-content", status: "warn", message: "暗号化されていない読み込みが残っています。" });
  }

  const libs = detectJsLibs(scriptSrcs(html, finalUrl));
  if (libs.length === 0) {
    signals.push({
      id: "js-lib-outdated",
      status: "info",
      unconfirmed: true,
      message: "公開された読み込み先の住所に、版の番号は見当たりませんでした。",
    });
  } else if (libs.some((hit) => hit.outdated)) {
    signals.push({ id: "js-lib-outdated", status: "warn", message: "基準より古い版の番号が見えました。" });
  } else {
    signals.push({ id: "js-lib-outdated", status: "pass", message: "住所にある版の番号は、この基準の範囲内でした。" });
  }

  const cert = certSignal(options.certNotAfter, now);
  if (cert) signals.push(cert);

  let redirectState: "ok" | "bad" | "unknown" = "unknown";
  let httpCurrent = `http://${finalHost}/`;
  for (let hop = 0; hop < 3; hop++) {
    const got = await budget(httpCurrent, 0, "manual");
    if (!got) break;
    const redirected = got.status >= 300 && got.status < 400 && Boolean(got.location);
    if (!redirected) {
      redirectState = got.status >= 200 && got.status < 500 ? "bad" : "unknown";
      break;
    }
    let next = "";
    try {
      next = new URL(got.location!, httpCurrent).toString();
      assertPublic(next);
    } catch {
      redirectState = "bad";
      break;
    }
    if (new URL(next).hostname.replace(/^www\./, "") !== finalHost.replace(/^www\./, "") && registrableDomain(new URL(next).hostname) !== registrableDomain(finalHost)) {
      redirectState = "bad";
      break;
    }
    if (next.startsWith("https://")) {
      redirectState = "ok";
      break;
    }
    httpCurrent = next;
  }
  signals.push({
    id: "https-redirect",
    status: redirectState === "ok" ? "pass" : redirectState === "bad" ? "warn" : "info",
    unconfirmed: redirectState === "unknown" ? true : undefined,
    message: redirectState === "ok" ? "HTTPの入口はHTTPSへ移ります。" : "HTTPの入口を確認しました。",
  });

  let exposedHit = false;
  let exposedUnknown = false;
  if (origin) {
    for (const path of ["/.env", "/.git/HEAD", "/backup.sql", "/wp-config.php.bak"]) {
      const got = await budget(`${origin}${path}`, SNIFF_BYTES, "manual");
      if (!got) {
        exposedUnknown = true;
        continue;
      }
      if (got.status === 404 || got.status === 401 || got.status === 403 || got.status === 410) continue;
      if (got.status === 200 && looksSecret(path, got.text)) exposedHit = true;
      else exposedUnknown = true;
    }
  }
  if (exposedHit) {
    signals.push({ id: "exposed-secret-file", status: "fail", message: "公開してはいけないファイルが応答しました。" });
  } else if (exposedUnknown) {
    signals.push({ id: "site-check-exposed-unknown", status: "info", unconfirmed: true, message: "公開ファイルの有無を確認できませんでした。" });
  }

  if (wp && origin) {
    const feed = await budget(`${origin}/feed/`, 4096, "manual");
    if (!feed) {
      signals.push({ id: "wp-feed-generator", status: "info", unconfirmed: true, message: "更新情報を確認できませんでした。" });
    } else if (/<generator>[^<]*wordpress\.org\/\?v=\d+\.\d+/i.test(feed.text)) {
      signals.push({ id: "wp-feed-generator", status: "warn", message: "更新情報に版の番号が含まれています。" });
    } else if (feed.status === 404 || feed.status === 403 || (feed.status >= 200 && feed.status < 300)) {
      signals.push({ id: "wp-feed-generator", status: "pass", message: "更新情報に版の番号は見当たりませんでした。" });
    } else {
      signals.push({ id: "wp-feed-generator", status: "info", unconfirmed: true, message: "更新情報を確認できませんでした。" });
    }

    const author = await budget(`${origin}/?author=1`, 2048, "manual");
    if (!author) {
      signals.push({ id: "wp-author-enum", status: "info", unconfirmed: true, message: "著者ページを確認できませんでした。" });
    } else {
      const location = author.location ?? "";
      let path = "";
      try {
        path = new URL(location, origin).pathname;
      } catch {
        path = "";
      }
      const named = /\/author\/[^/]+/i.test(path) || /\/author\/[^/"'?#\s]+/i.test(author.text);
      if (named) signals.push({ id: "wp-author-enum", status: "warn", message: "著者のページへ移る応答がありました。" });
      else if (author.status === 404 || author.status === 403 || author.status === 401 || (author.status >= 200 && author.status < 400)) {
        signals.push({ id: "wp-author-enum", status: "pass", message: "利用者の名前へ移る応答は見当たりませんでした。" });
      } else {
        signals.push({ id: "wp-author-enum", status: "info", unconfirmed: true, message: "著者ページを確認できませんでした。" });
      }
    }

    const uploads = await budget(`${origin}/wp-content/uploads/`, 2048, "manual");
    if (!uploads) {
      signals.push({ id: "dir-listing-uploads", status: "info", unconfirmed: true, message: "アップロード先を確認できませんでした。" });
    } else if (uploads.status === 200 && looksListing(uploads.text)) {
      signals.push({ id: "dir-listing-uploads", status: "warn", message: "アップロード先の一覧が外から見える状態です。" });
    } else if (uploads.status === 404 || uploads.status === 403 || uploads.status === 401 || uploads.status === 200) {
      signals.push({ id: "dir-listing-uploads", status: "pass", message: "アップロード先の一覧は見当たりませんでした。" });
    } else {
      signals.push({ id: "dir-listing-uploads", status: "info", unconfirmed: true, message: "アップロード先を確認できませんでした。" });
    }

    const readme = await budget(`${origin}/readme.html`, 2048, "manual");
    if (readme && readme.status === 200 && /wordpress/i.test(readme.text)) {
      signals.push({ id: "wp-readme-exposed", status: "warn", message: "導入手順のページが開きました。" });
    }

    const users = await budget(`${origin}/wp-json/wp/v2/users`, 2048, "manual");
    if (users && users.status === 200 && /^\s*\[/.test(users.text) && /"slug"/.test(users.text)) {
      signals.push({ id: "wp-json-users", status: "warn", message: "利用者の一覧が外から読めます。" });
    }

    const xmlrpc = await budget(`${origin}/xmlrpc.php`, 512, "manual");
    if (xmlrpc && (xmlrpc.status === 200 || xmlrpc.status === 405) && /xml-rpc|methodResponse/i.test(xmlrpc.text + (xmlrpc.headers.allow ?? ""))) {
      signals.push({ id: "wp-xmlrpc-enabled", status: "warn", message: "外部から手順を受ける入口が応答しました。" });
    }

    if (/<meta[^>]*generator[^>]*wordpress\s*[0-9]/i.test(html)) {
      signals.push({ id: "wp-version", status: "warn", message: "ページに仕組みの版の番号が出ています。" });
    }
  }

  const domain = registrableDomain(finalHost);
  const lookup = options.lookupTxt ?? ((name: string) => defaultLookupTxt(name, fetchImpl, options.signal, timeoutMs));
  if (domain) {
    const spf = await lookup(domain);
    if (spf === null) {
      signals.push({ id: "email-domain-spf", status: "info", unconfirmed: true, message: "送信元の証明を確認できませんでした。" });
    } else if (spf.some((row) => /^v=spf1\b/i.test(row))) {
      signals.push({ id: "email-domain-spf", status: "pass", message: "送信元の証明があります。" });
    } else {
      signals.push({ id: "email-domain-spf", status: "warn", message: "送信元の証明は見当たりませんでした。" });
    }
    const dmarc = await lookup(`_dmarc.${domain}`);
    const record = dmarc?.find((row) => /^v=DMARC1\b/i.test(row)) ?? "";
    if (dmarc === null) {
      signals.push({ id: "email-domain-dmarc", status: "info", unconfirmed: true, message: "なりすましへの対応方針を確認できませんでした。" });
    } else if (/;\s*p=(quarantine|reject)\b/i.test(`; ${record}`)) {
      signals.push({ id: "email-domain-dmarc", status: "pass", message: "なりすましへの対応方針があります。" });
    } else {
      signals.push({ id: "email-domain-dmarc", status: "info", message: "なりすましを拒否する方針は見当たりませんでした。" });
    }
  }

  let targetOrigin = "";
  try {
    targetOrigin = new URL(finalUrl).origin;
  } catch {
    targetOrigin = "";
  }

  return gradeSiteCheck({
    signals,
    isWordPress: wp,
    unreachable,
    httpsFinal,
    headers,
    discoveryRan: Boolean(page),
    target: targetOrigin,
  });
}
