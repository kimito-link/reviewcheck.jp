import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { diagnose } from "@reviewcheck/core";
import { RESULT_ESTIMATE_SENTENCE } from "@reviewcheck/config";
import { ReportView } from "./ReportView";
import { scoreHistoryKey } from "@/lib/scoreHistory";

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

const RESULT_SECTION_ORDER = [
  "score",
  "estimate",
  "cta",
  "findings",
  "causes",
  "if-left-alone",
  "fixes",
  "cta-repeat",
  "share",
  "disclaimer",
] as const;

const fixture = diagnose({
  store: {
    name: "テスト食堂",
    category: "食堂",
    address: "長野県岡谷市長地柴宮2-5-65",
    rating: 4,
    reviewCount: 45,
    hasOwnerReplies: false,
    source: "manual",
  },
  competitors: [
    { name: "競合A", rating: 4.7, reviewCount: 320 },
    { name: "競合B", rating: 4.6, reviewCount: 210 },
    { name: "競合C", rating: 4.5, reviewCount: 160 },
    { name: "競合D", rating: 4.4, reviewCount: 120 },
  ],
  diagnosedAt: "2026-10-24T08:41:00.000Z",
  ruleVersion: "1.0",
});

describe("診断結果の並び", () => {
  test("点数から免責まで、指定の順で並ぶ", async () => {
    window.localStorage.setItem(
      scoreHistoryKey("テスト食堂"),
      JSON.stringify({
        score: 62,
        date: "2026-10-01T00:00:00.000Z",
        ruleVersion: "1.0",
      }),
    );

    const { container } = render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/abc/"
      />,
    );

    const ids = [...container.querySelectorAll("[data-result-section]")].map(
      (el) => el.getAttribute("data-result-section"),
    );
    expect(ids).toEqual([...RESULT_SECTION_ORDER]);

    expect(container).toHaveTextContent(RESULT_ESTIMATE_SENTENCE);
    expect(container).toHaveTextContent(
      "採点ルール v1.0 ／ 取得：2026-10-24 17:41（日本時間） ／ 出典：Googleマップ",
    );
    expect(container).toHaveTextContent(
      "星4.0／口コミ45件／周辺5店中 口コミ数 第5位",
    );
    expect(container.textContent ?? "").not.toContain("無料");
    expect(container.innerHTML).not.toContain("topic=consult");
    expect(container.innerHTML).not.toContain("border-[#06C755]");
    expect(container.innerHTML).not.toContain("bg-[#06C755]/");
    expect(
      container.querySelector('[data-result-section="if-left-alone"]')
        ?.textContent ?? "",
    ).not.toMatch(/円/);

    expect(
      await screen.findByText("前回（10/1）62点 → 今回45点（-17）"),
    ).toBeInTheDocument();

    const saved = window.localStorage.getItem(scoreHistoryKey("テスト食堂"));
    expect(saved).toBeTruthy();
    expect(saved ?? "").not.toContain("テスト食堂");
    expect(saved ?? "").not.toContain("岡谷");
  });

  test("古い共有URLではルール版の注記を出す", () => {
    render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/old/"
        shareContext={{ loadedRuleVersion: undefined, fetchedAtRecorded: false }}
      />,
    );
    expect(
      screen.getByText(/採点ルールの版を記録する前/),
    ).toBeInTheDocument();
    expect(screen.getByText(/取得：記録なし/)).toBeInTheDocument();
  });
});
