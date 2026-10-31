import { gradeSiteCheck } from "site-check";
import type { SiteSignal } from "site-check";

function signal(
  id: string,
  status: SiteSignal["status"],
  message = "確認しました。",
): SiteSignal {
  return { id, status, message };
}

/**
 * 画面確認用。正本の gradeSiteCheck が返す 71 点（要対応1・注意5）。
 * 通信はしない。
 */
export function mockSiteCheckReport() {
  return gradeSiteCheck({
    signals: [
      signal("https", "pass"),
      signal("ssl", "pass"),
      signal("https-redirect", "warn"),
      signal("tls-cert-expiry", "info", "通信の証明書の残り日数は 90 日です（重さ：参考）"),
      signal("header-hsts", "info"),
      signal("header-csp", "warn"),
      signal("header-xcto", "pass"),
      signal("header-referrer", "warn"),
      signal("header-permissions", "warn"),
      signal("js-lib-outdated", "pass"),
      signal("email-domain-spf", "pass"),
      signal("email-domain-dmarc", "pass"),
    ],
    isWordPress: false,
    unreachable: false,
    httpsFinal: true,
    headers: {},
    discoveryRan: true,
    target: "https://shop.example",
  });
}
