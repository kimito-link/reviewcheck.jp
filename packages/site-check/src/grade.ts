import { evidenceFor, hasFrameAncestors, SITE_CHECK_ROWS, siteCheckCopy, siteCheckScore } from "./rubric";
import {
  SITE_CHECK_HONEST_NOTE,
  SITE_CHECK_RUBRIC_VERSION,
  type GradeSiteCheckInput,
  type SiteCheckCounts,
  type SiteCheckFinding,
  type SiteCheckJson,
  type SiteCheckSeverity,
  type SiteCheckStatus,
  type SiteSignal,
} from "./types";

function findSignal(signals: readonly SiteSignal[], id: string): SiteSignal | undefined {
  return signals.find((signal) => signal.id === id);
}

function headerValue(headers: Record<string, string>, name: string): string {
  return headers[name] ?? headers[name.toLowerCase()] ?? "";
}

function isStatus(signal: SiteSignal | undefined, status: SiteSignal["status"]): boolean {
  return signal?.status === status;
}

function severityOf(status: SiteCheckStatus): SiteCheckSeverity {
  if (status === "action") return "high";
  if (status === "caution") return "medium";
  if (status === "unknown") return "unknown";
  return "none";
}

function mailStatus(signal: SiteSignal | undefined): SiteCheckStatus {
  if (!signal) return "unknown";
  if (signal.status === "pass") return "ok";
  if (signal.unconfirmed) return "unknown";
  if (signal.status === "info" || signal.status === "warn" || signal.status === "fail") return "caution";
  return "unknown";
}

/**
 * 観測から採点JSONを作る。通信しない。
 * malwarecheck は自分の点検結果を signals に写してこれを呼ぶ（同じサイトへ二度取りにいかない）。
 * 他の診断は runSiteCheck が観測を集めてからこれを呼ぶ。
 */
export function gradeSiteCheck(input: GradeSiteCheckInput): SiteCheckJson {
  const signals = input.signals;
  const wp = input.isWordPress;
  const grades = new Map<string, SiteCheckStatus>();

  const https = findSignal(signals, "https");
  const ssl = findSignal(signals, "ssl");
  if (input.unreachable) grades.set("https", "unknown");
  else if (isStatus(https, "fail") || isStatus(ssl, "fail")) grades.set("https", "action");
  else if (isStatus(https, "pass")) grades.set("https", "ok");
  else grades.set("https", "unknown");

  const redirect = findSignal(signals, "https-redirect");
  if (!redirect || redirect.unconfirmed || redirect.status === "info") grades.set("https-redirect", "unknown");
  else if (redirect.status === "warn" || redirect.status === "fail") grades.set("https-redirect", "action");
  else grades.set("https-redirect", "ok");

  const cert = findSignal(signals, "tls-cert-expiry");
  if (!input.httpsFinal) grades.set("cert-expiry", input.unreachable ? "unknown" : "na");
  else if (!cert) grades.set("cert-expiry", "unknown");
  else if (cert.status === "warn" && /過ぎて/.test(cert.message)) grades.set("cert-expiry", "action");
  else if (cert.status === "warn") grades.set("cert-expiry", "caution");
  else grades.set("cert-expiry", "ok");

  const hsts = findSignal(signals, "header-hsts");
  if (!input.httpsFinal) grades.set("hsts", input.unreachable ? "unknown" : "na");
  else if (!hsts) grades.set("hsts", "unknown");
  else if (hsts.status === "pass") grades.set("hsts", "ok");
  else grades.set("hsts", "caution");

  const versionExposed =
    isStatus(findSignal(signals, "server-version"), "warn") ||
    isStatus(findSignal(signals, "powered-by"), "warn") ||
    isStatus(findSignal(signals, "php-version-exposed"), "warn") ||
    isStatus(findSignal(signals, "php-patch-floor-behind"), "warn");
  const versionEnded =
    isStatus(findSignal(signals, "eol-php-official"), "warn") ||
    isStatus(findSignal(signals, "php-branch-unfixed"), "warn");
  if (input.unreachable) grades.set("version-headers", "unknown");
  else if (versionEnded) grades.set("version-headers", "action");
  else if (versionExposed) grades.set("version-headers", "caution");
  else grades.set("version-headers", "ok");

  const csp = findSignal(signals, "header-csp");
  const cspWeak = findSignal(signals, "xss-csp-weak");
  if (!csp) grades.set("header-csp", "unknown");
  else if (isStatus(cspWeak, "warn") || isStatus(cspWeak, "fail")) grades.set("header-csp", "caution");
  else if (csp.status === "pass") grades.set("header-csp", "ok");
  else grades.set("header-csp", "caution");

  const xfo = headerValue(input.headers, "x-frame-options").trim();
  const covered = Boolean(xfo) || hasFrameAncestors(headerValue(input.headers, "content-security-policy"));
  if (input.unreachable) grades.set("header-frame", "unknown");
  else if (covered) grades.set("header-frame", "ok");
  else grades.set("header-frame", "caution");

  for (const [id, signalId] of [
    ["header-nosniff", "header-xcto"],
    ["header-referrer", "header-referrer"],
    ["header-permissions", "header-permissions"],
  ] as const) {
    const signal = findSignal(signals, signalId);
    if (!signal) grades.set(id, "unknown");
    else if (signal.status === "pass") grades.set(id, "ok");
    else grades.set(id, "caution");
  }

  const mixed = findSignal(signals, "mixed-content");
  if (input.unreachable) grades.set("mixed-content", "unknown");
  else if (!input.httpsFinal) grades.set("mixed-content", "na");
  else if (isStatus(mixed, "warn") || isStatus(mixed, "fail")) grades.set("mixed-content", "caution");
  else grades.set("mixed-content", "ok");

  const secret = signals.some(
    (signal) =>
      (signal.id.startsWith("exposed-secret") || signal.id.startsWith("exposed-vcs")) &&
      (signal.status === "fail" || signal.status === "warn"),
  );
  const soft = Boolean(findSignal(signals, "exposure-soft-404"));
  const exposedUnknown = findSignal(signals, "site-check-exposed-unknown");
  if (input.unreachable || !input.discoveryRan) grades.set("exposed-files", "unknown");
  else if (secret) grades.set("exposed-files", "action");
  else if (soft || exposedUnknown?.unconfirmed) grades.set("exposed-files", "unknown");
  else grades.set("exposed-files", "ok");

  const listing =
    isStatus(findSignal(signals, "directory-listing"), "warn") ||
    isStatus(findSignal(signals, "directory-listing"), "fail");
  const uploads = findSignal(signals, "dir-listing-uploads");
  const uploadsBad = isStatus(uploads, "warn") || isStatus(uploads, "fail");
  if (listing || uploadsBad) grades.set("dir-uploads", "action");
  else if (uploads?.unconfirmed) grades.set("dir-uploads", "unknown");
  else if (!input.discoveryRan && !uploads) grades.set("dir-uploads", "unknown");
  else grades.set("dir-uploads", "ok");

  const libs = findSignal(signals, "js-lib-outdated");
  if (!libs || libs.unconfirmed) grades.set("js-libs", "unknown");
  else if (libs.status === "warn" || libs.status === "fail") grades.set("js-libs", "caution");
  else if (libs.status === "pass") grades.set("js-libs", "ok");
  else grades.set("js-libs", "unknown");

  const generator = findSignal(signals, "wp-version");
  if (!wp) grades.set("wp-generator", "na");
  else if (isStatus(generator, "warn") || isStatus(generator, "fail")) grades.set("wp-generator", "caution");
  else grades.set("wp-generator", "ok");

  const readme = findSignal(signals, "wp-readme-exposed");
  if (!wp) grades.set("wp-readme", "na");
  else if (readme) grades.set("wp-readme", "caution");
  else grades.set("wp-readme", "ok");

  const feed = findSignal(signals, "wp-feed-generator");
  if (!wp) grades.set("wp-feed", "na");
  else if (!feed || feed.unconfirmed) grades.set("wp-feed", "unknown");
  else if (feed.status === "warn" || feed.status === "fail") grades.set("wp-feed", "caution");
  else grades.set("wp-feed", "ok");

  const users = findSignal(signals, "wp-json-users");
  if (!wp) grades.set("wp-users-rest", "na");
  else if (isStatus(users, "warn") || isStatus(users, "fail")) grades.set("wp-users-rest", "action");
  else if (soft) grades.set("wp-users-rest", "unknown");
  else grades.set("wp-users-rest", "ok");

  const author = findSignal(signals, "wp-author-enum");
  if (!wp) grades.set("wp-users-author", "na");
  else if (!author || author.unconfirmed) grades.set("wp-users-author", "unknown");
  else if (author.status === "warn" || author.status === "fail") grades.set("wp-users-author", "action");
  else grades.set("wp-users-author", "ok");

  const xmlrpc = findSignal(signals, "wp-xmlrpc-enabled");
  if (!wp) grades.set("wp-xmlrpc", "na");
  else if (isStatus(xmlrpc, "warn") || isStatus(xmlrpc, "fail")) grades.set("wp-xmlrpc", "caution");
  else if (soft) grades.set("wp-xmlrpc", "unknown");
  else grades.set("wp-xmlrpc", "ok");

  grades.set("spf", mailStatus(findSignal(signals, "email-domain-spf")));
  grades.set("dmarc", mailStatus(findSignal(signals, "email-domain-dmarc")));

  const counts: SiteCheckCounts = { action: 0, caution: 0, ok: 0, unknown: 0, na: 0 };
  const items: SiteCheckFinding[] = SITE_CHECK_ROWS.map((entry) => {
    const status = grades.get(entry.id) ?? "unknown";
    counts[status] += 1;
    const copy = siteCheckCopy(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      status,
      severity: severityOf(status),
      why: copy.why,
      ifLeft: copy.ifLeft,
      fix: copy.fix,
      evidence: evidenceFor(entry.id, status),
    };
  });

  return {
    rubric: SITE_CHECK_RUBRIC_VERSION,
    score: siteCheckScore(counts),
    counts,
    note: SITE_CHECK_HONEST_NOTE,
    target: input.target ?? "",
    items,
  };
}
