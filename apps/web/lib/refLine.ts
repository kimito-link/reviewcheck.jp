import { withLineExternalParam } from "@reviewcheck/core";

/** 共有する人の公式LINE。この端末の localStorage にだけ残す。 */
export const SHARER_LINE_STORAGE_KEY = "reviewcheck.sharerLineUrl.v1";

const MAX_LENGTH = 500;

/**
 * https://lin.ee/ と https://line.me/ 以外は捨てる。
 * 自サイトのリダイレクトにはせず、リンク先そのものを許可リストで限定する。
 */
export function sanitizeRefLine(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;
  if (/[\u0000-\u0020\\]/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("https://lin.ee/") && !lower.startsWith("https://line.me/")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.username || url.password || url.port) return null;
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "lin.ee" && host !== "line.me") return null;
  if (url.origin !== "https://lin.ee" && url.origin !== "https://line.me") return null;
  if (!url.pathname || url.pathname === "/") return null;
  const canonical = url.href;
  if (
    !canonical.startsWith("https://lin.ee/") &&
    !canonical.startsWith("https://line.me/")
  ) {
    return null;
  }
  return canonical;
}

/**
 * 共有URLへ公式LINEを載せる。無効な値は載せない。
 * TODO: エックスサーバーの取次店コード（紹介コード）は、返事が来てから別パラメータで足す。この関数では扱わない。
 */
export function withRefLine(pageUrl: string, lineUrl: string | null | undefined): string {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return pageUrl;
  }
  const safe = sanitizeRefLine(lineUrl);
  if (!safe) {
    if (!url.searchParams.has("ref_line")) return pageUrl;
    url.searchParams.delete("ref_line");
    return url.toString();
  }
  url.searchParams.set("ref_line", safe);
  return url.toString();
}

/** 受け取った人のリンク。LINEアプリ内ブラウザのときだけ openExternalBrowser=1 を足す。 */
export function lineConsultHref(
  value: string | null | undefined,
  userAgent: string,
): string | null {
  const safe = sanitizeRefLine(value);
  if (!safe) return null;
  return withLineExternalParam(safe, userAgent);
}
