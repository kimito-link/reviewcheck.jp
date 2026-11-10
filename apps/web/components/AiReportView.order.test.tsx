import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import type { AiCheckScore } from "@reviewcheck/core";
import { AiReportView } from "./AiReportView";

const score: AiCheckScore = {
  total: 62,
  band: "almost",
  factors: [
    { key: "aiVisibility", score: 12, max: 25, excluded: false, note: "言及はあります。" },
    { key: "reviews", score: 18, max: 25, excluded: false },
    { key: "search", score: 10, max: 20, excluded: false },
    { key: "siteHealth", score: null, max: 20, excluded: true, note: "サイトは測っていません。" },
    { key: "impersonation", score: 8, max: 10, excluded: false },
  ],
};

describe("AI診断結果の並び", () => {
  test("最初は結果で、確かめ方は閉じた details の中", () => {
    const { container } = render(
      <AiReportView
        score={score}
        storeName="テスト食堂"
        aiSafeHead="テスト食堂は食堂として紹介される傾向があります。"
        aiRedactedCount={2}
        negativeSuggestCount={1}
        probedAtLabel="2026-10-28"
        probedModel="test-model"
        shareUrl="https://reviewcheck.jp/ai-report/abc/"
      />,
    );
    const ids = [...container.querySelectorAll("[data-result-section]")].map((el) =>
      el.getAttribute("data-result-section"),
    );
    expect(ids[0]).toBe("result");
    expect(ids.indexOf("gains")).toBeGreaterThan(ids.indexOf("result"));
    expect(ids.indexOf("losses")).toBeGreaterThan(ids.indexOf("gains"));
    expect(ids.indexOf("cta")).toBeGreaterThan(ids.indexOf("losses"));
    const result = container.querySelector("[data-result-section='result']");
    expect(result?.textContent).toContain("62");
    expect(result?.textContent).toContain("テスト食堂は食堂として紹介される傾向があります。");
    expect(result?.textContent).not.toContain("サイトの健康");
    const missed = container.querySelector("[data-result-section='unconfirmed']");
    expect(missed?.textContent).toContain("サイトの健康");
    const method = container.querySelector("details[data-result-section='method']");
    expect(method?.hasAttribute("open")).toBe(false);
    expect(method?.textContent).toContain("この診断の確かめ方");
    expect(method?.textContent).toContain("test-model");
    expect(result?.textContent).not.toContain("この診断の確かめ方");
    expect(container.textContent ?? "").not.toMatch(/無料|必ず|保証|今すぐ|緊急/);
    expect(container.querySelectorAll("[data-result-section='cta'] button")).toHaveLength(1);
  });
});
