/** 全文チェックへのリンク。集計APIは呼ばない。 */
export function malwareCheckHref(website: string): string {
  const url = new URL("https://malwarecheck.site/check/");
  url.searchParams.set("url", website);
  return url.toString();
}

/** 診断に載せるウェブサイト。http(s) 以外、利用者情報付き、空は載せない。 */
export function usableWebsite(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > 300) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname || url.hostname.length > 253) return null;
  const host = url.hostname;
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  if (!ip && !host.includes(".")) return null;
  url.hash = "";
  return url.toString();
}
