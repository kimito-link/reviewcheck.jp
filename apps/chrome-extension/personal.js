/**
 * ポップアップの表示に使う純粋関数。
 * 前回の点検は chrome.storage.local にだけ残す。
 */

export const CHECKS_STORAGE_KEY = "reviewcheck.checks.v1";
export const CHECKS_STORAGE_LIMIT = 30;

export function isMapsUrl(url) {
  return /https?:\/\/([^/]*\.)?(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|g\.page)/i.test(
    url || "",
  );
}

export function domainOf(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    if (!host) return "";
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

export function isDiagnosablePage(url) {
  return /^https?:\/\//i.test(url || "");
}

/** 今のタブ。マップの店舗ページはURLのまま、それ以外はホスト名で診断する。 */
export function queryFromTab(url) {
  if (!isDiagnosablePage(url)) return null;
  if (isMapsUrl(url)) return { mapsUrl: url };
  const domain = domainOf(url);
  return domain ? { text: domain } : null;
}

export function queryFromManual(value) {
  const q = String(value || "").trim();
  if (!q) return null;
  if (/^https?:\/\//i.test(q)) {
    if (isMapsUrl(q)) return { mapsUrl: q };
    const domain = domainOf(q);
    return domain ? { text: domain } : null;
  }
  return { text: q };
}

export function storageTargetKey(tabUrl, manualValue) {
  const manual = String(manualValue || "").trim();
  if (manual) {
    if (/^https?:\/\//i.test(manual)) {
      if (isMapsUrl(manual)) return `maps:${manual}`;
      const domain = domainOf(manual);
      return domain ? `domain:${domain}` : "";
    }
    return `text:${manual}`;
  }
  if (isMapsUrl(tabUrl)) return `maps:${tabUrl}`;
  const domain = domainOf(tabUrl || "");
  return domain ? `domain:${domain}` : "";
}

export function pickHighlights(result) {
  const improvements = Array.isArray(result?.improvements) ? result.improvements : [];
  const titles = [];
  for (const item of improvements) {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    if (!title || titles.includes(title)) continue;
    titles.push(title);
    if (titles.length === 3) break;
  }
  if (titles.length > 0) return titles;
  const summary = typeof result?.summary === "string" ? result.summary.trim() : "";
  return summary ? [summary] : [];
}

export function buildExtensionShareText({ score, storeName, points }) {
  const rounded = Math.round(Number(score));
  const name = typeof storeName === "string" ? storeName.trim() : "";
  const head = name
    ? `選ばれやすさ ${rounded}点（目安）｜${name}`
    : `選ばれやすさ ${rounded}点（目安）`;
  const lines = (Array.isArray(points) ? points : [])
    .map((point) => String(point).trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((point) => `・${point}`);
  return lines.length > 0 ? `${head}\n${lines.join("\n")}` : head;
}

function jstParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const num = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
  };
}

export function formatPreviousJst(date) {
  const parts = jstParts(date);
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${parts.year}年${parts.month}月${parts.day}日 ${hour}:${minute}`;
}

/** 日本時間の暦で1か月後。月末は翌月の最終日に収める。 */
export function nextCheckMonthDay(previous) {
  const parts = jstParts(previous);
  let month = parts.month + 1;
  let year = parts.year;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(parts.day, last) };
}

export function formatNextCheckLabel(previous) {
  const next = nextCheckMonthDay(previous);
  return `${next.month}月${next.day}日（1か月後）`;
}

export function recheckCopy(previousIso) {
  const date = new Date(previousIso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    previous: `前回の点検：${formatPreviousJst(date)}`,
    next: `次の点検の目安：${formatNextCheckLabel(date)}`,
  };
}

export function encodeReportId(input) {
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function mergeCheckEntry(existing, key, entry) {
  const base = existing && typeof existing === "object" ? { ...existing } : {};
  base[key] = entry;
  const keys = Object.keys(base);
  if (keys.length <= CHECKS_STORAGE_LIMIT) return base;
  const sorted = keys.sort((a, b) => {
    const left = Date.parse(base[a]?.diagnosedAt || "") || 0;
    const right = Date.parse(base[b]?.diagnosedAt || "") || 0;
    return right - left;
  });
  const next = {};
  for (const item of sorted.slice(0, CHECKS_STORAGE_LIMIT)) next[item] = base[item];
  return next;
}
