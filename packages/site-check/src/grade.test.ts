import { describe, expect, it } from "vitest";
import { gradeSiteCheck } from "./grade";
import { renderSiteCheckCard } from "./card";
import { SITE_CHECK_FINDING_KEYS, SITE_CHECK_RUBRIC_VERSION } from "./types";
import type { SiteSignal } from "./types";

function signal(id: string, status: SiteSignal["status"], message = "確認しました。", unconfirmed?: true): SiteSignal {
  return { id, status, message, ...(unconfirmed ? { unconfirmed: true as const } : {}) };
}

describe("site-check v1.0", () => {
  it("要対応1・注意5で 71/100 になり、JSON の項目が揃う", () => {
    const report = gradeSiteCheck({
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
      target: "https://example.com",
    });
    expect(report.rubric).toBe(SITE_CHECK_RUBRIC_VERSION);
    expect(report.score).toBe(71);
    expect(report.counts).toEqual({ action: 1, caution: 5, ok: 10, unknown: 0, na: 6 });
    const item = report.items.find((row) => row.id === "https-redirect");
    expect(item).toMatchObject({ status: "action", severity: "high" });
    for (const key of SITE_CHECK_FINDING_KEYS) {
      expect(item).toHaveProperty(key);
    }
    expect(item?.evidence.summary).not.toMatch(/password|secret/i);
    const html = renderSiteCheckCard(report);
    expect(html).toContain("71");
    expect(html).toContain("要対応1・注意5・問題なし10・確認できず0・対象外6");
    expect(html).toContain("■");
    expect(renderSiteCheckCard({ ...report, items: report.items.map((row) => ({ ...row, title: "<script>" })) })).toContain("&lt;script&gt;");
  });
});
