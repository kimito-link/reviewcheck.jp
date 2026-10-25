import { promises as dns } from "node:dns";
import tls from "node:tls";
import { isBlockedSiteHost, runSiteCheck, type SiteCheckJson } from "site-check";
import { mockSiteCheckReport } from "./siteCheckFixture";
import { usableWebsite } from "./websiteUrl";

/**
 * 正本: kimito-link/malwarecheck.site packages/site-check
 * commit d9226b10d897002fc80446130361aac88e9987a0（site-check v1.0）
 *
 * 採点は vendored の runSiteCheck に任せる。ここは証明書の期限と TXT を渡し、
 * URL を集計へ送らない。
 */
const USER_AGENT = "ReviewCheck/1.0 (+https://reviewcheck.jp/check/; passive GET)";
const BUDGET_MS = 12_000;

export async function checkStoreWebsite(
  raw: string | null | undefined,
): Promise<SiteCheckJson | null> {
  const url = usableWebsite(raw);
  if (!url) return null;
  if (process.env.SITE_CHECK_MOCK === "1") return mockSiteCheckReport();
  try {
    const parsed = new URL(url);
    const https = parsed.protocol === "https:" && !isBlockedSiteHost(parsed.hostname);
    const certNotAfter = https
      ? await readCertNotAfter(parsed.hostname, parsed.port ? Number(parsed.port) : 443)
      : null;
    return await runSiteCheck(url, {
      userAgent: USER_AGENT,
      certNotAfter,
      lookupTxt,
      signal: AbortSignal.timeout(BUDGET_MS),
    });
  } catch {
    return null;
  }
}

async function lookupTxt(name: string): Promise<string[] | null> {
  try {
    const rows = await dns.resolveTxt(name);
    return rows.map((parts) => parts.join(""));
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOENT") return [];
    return null;
  }
}

function readCertNotAfter(hostname: string, port: number): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        timeout: 4_000,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) return finish(null);
        const exp = new Date(cert.valid_to);
        finish(Number.isNaN(exp.getTime()) ? null : exp.toISOString());
      },
    );
    socket.on("error", () => finish(null));
    socket.on("timeout", () => {
      socket.destroy();
      finish(null);
    });
  });
}
