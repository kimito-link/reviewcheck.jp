import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { diagnose } from "@reviewcheck/core";
import { ReportView } from "./ReportView";
import { mockSiteCheckReport } from "@/lib/siteCheckFixture";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

const base = diagnose({
  store: {
    name: "テスト食堂",
    category: "食堂",
    address: "長野県岡谷市長地柴宮2-5-65",
    rating: 4,
    reviewCount: 45,
    hasOwnerReplies: false,
    source: "manual",
  },
  competitors: [{ name: "競合A", rating: 4.7, reviewCount: 320 }],
  diagnosedAt: "2026-10-24T08:41:00.000Z",
  ruleVersion: "1.0",
});

describe("ウェブサイトの設定チェック", () => {
  test("ウェブサイトが無いときは欄を出さない", () => {
    const { container } = render(<ReportView result={base} />);
    expect(container.querySelector("[data-result-section='site-check']")).toBeNull();
  });

  test("点数が先、件数の一行、理由と直し方、全文へのリンクが続く", () => {
    const siteCheck = mockSiteCheckReport();
    const result = {
      ...base,
      input: {
        ...base.input,
        store: { ...base.input.store, website: "https://shop.example/" },
      },
    };
    const { container } = render(<ReportView result={result} siteCheck={siteCheck} />);

    const ids = [...container.querySelectorAll("[data-result-section]")].map((el) =>
      el.getAttribute("data-result-section"),
    );
    expect(ids.indexOf("site-check")).toBe(ids.indexOf("estimate") + 1);
    expect(ids[ids.indexOf("site-check") + 1]).toBe("cta");

    const section = container.querySelector("[data-result-section='site-check']");
    expect(section).not.toBeNull();
    const text = section?.textContent ?? "";
    const countLine = "要対応1・注意5・問題なし10・確認できず0・対象外6";
    expect(text.indexOf("71")).toBeLessThan(text.indexOf(countLine));
    expect(text).toContain("site-check v1.0");
    expect(text).toContain("要対応");
    expect(text).toContain("■");
    expect(text).toContain("注意");
    expect(text).toContain("▲");
    expect(text).toContain("HTTPからHTTPSへの転送");
    expect(text).toContain("HTTPで開いた人を、HTTPSの入口へ移しているかの確認です。");
    expect(text).toContain("このままの場合:");
    expect(text).toContain("直し方の例");
    expect(text).toContain("listen 80");
    expect(text).toContain("見つからない＝安全ではない。");

    const link = screen.getByRole("link", { name: "マルウェアチェックで全文を見る" });
    expect(link.getAttribute("href")).toBe(
      "https://malwarecheck.site/check/?url=https%3A%2F%2Fshop.example%2F",
    );
  });

  test("結果が渡っていてもウェブサイトが空なら出さない", () => {
    const { container } = render(
      <ReportView result={base} siteCheck={mockSiteCheckReport()} />,
    );
    expect(container.querySelector("[data-result-section='site-check']")).toBeNull();
  });
});
