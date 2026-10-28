import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { FactView } from "./FactView";

describe("公開情報ビューの並び", () => {
  test("最初は観測事実で、確認できなかった情報源と確かめ方は後ろ", () => {
    const { container } = render(
      <FactView
        targetName="テスト商事"
        facts={[
          {
            observation: "公式サイトに社名が掲載されています。",
            source: { name: "公式サイト", kind: "web", url: "https://example.com/" },
            retrievedAt: "2026-10-28",
          },
        ]}
        retrievalFailures={[{ source: "官報", attemptedAt: "2026-10-28" }]}
        pointers={[
          {
            name: "官報",
            whatCanBeConfirmed: "公告の有無",
            howToAccess: "https://example.com/kanpo で検索する",
          },
        ]}
      />,
    );
    const ids = [...container.querySelectorAll("[data-result-section]")].map((el) =>
      el.getAttribute("data-result-section"),
    );
    expect(ids[0]).toBe("result");
    expect(ids.indexOf("gains")).toBeGreaterThan(0);
    expect(ids.indexOf("losses")).toBeGreaterThan(ids.indexOf("gains"));
    expect(ids.indexOf("cta")).toBeGreaterThan(ids.indexOf("losses"));
    const result = container.querySelector("[data-result-section='result']");
    expect(result?.textContent).toContain("公式サイトに社名が掲載されています。");
    expect(result?.textContent).not.toContain("取得されませんでした");
    expect(result?.textContent).not.toContain("官報");
    const missed = container.querySelector("[data-result-section='unconfirmed']");
    expect(missed?.textContent).toContain("官報");
    expect(missed?.textContent).toContain("取得されませんでした");
    const method = container.querySelector("details[data-result-section='method']");
    expect(method?.hasAttribute("open")).toBe(false);
    expect(method?.textContent).toContain("この診断の確かめ方");
    expect(method?.textContent).toContain("公告の有無");
    expect(result?.compareDocumentPosition(method as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(container.textContent ?? "").not.toMatch(/今すぐ|緊急/);
  });
});