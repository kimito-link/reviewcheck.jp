import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DIAGNOSIS_PROGRESS_STORAGE_KEY, rankNextDiagnoses } from "@reviewcheck/core";
import { SuggestCheckApp } from "./SuggestCheckApp";

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

const analysis = {
  query: "テスト食堂",
  suggestions: [
    { text: "テスト食堂 評判", level: "high", keyword: "評判" },
  ],
  negatives: [{ text: "テスト食堂 評判", level: "high", keyword: "評判" }],
  risk: "high",
  status: "ok",
  source: "google",
};

describe("サジェスト診断の次の診断", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/suggest-check/");
    window.localStorage.removeItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("一次の相談ボタンの下に、関連する診断だけを出す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => analysis,
      })),
    );
    render(<SuggestCheckApp initialQuery="テスト食堂" />);
    fireEvent.click(screen.getByRole("button", { name: "検索候補を調べる" }));

    const cta = (await screen.findAllByRole("link", { name: "サジェスト（検索候補）対策を相談する" }))[0];
    const next = document.querySelector('[data-result-section="next-diagnoses"]');
    expect(next).toBeTruthy();
    expect(
      cta.compareDocumentPosition(next as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const expected = rankNextDiagnoses({ surface: "suggest", risk: "high" });
    const names = [...(next?.querySelectorAll("ol a") ?? [])].map((anchor) => anchor.textContent);
    expect(names).toEqual(expected.map((app) => app.name));
    expect(names[0]).toBe("口コミ診断");
    expect(names).not.toContain("サジェスト汚染チェッカー");
    expect(names).not.toContain("サジェスト診断");
    expect(next?.textContent ?? "").not.toMatch(/無料|必ず|保証|安全です|特許取得|特許技術|特許済み/);
    expect(await screen.findByText("11のうち1つを確かめました")).toBeInTheDocument();
    const sections = [...document.querySelectorAll("[data-result-section]")].map((el) =>
      el.getAttribute("data-result-section"),
    );
    expect(sections[0]).toBe("result");
    expect(sections.indexOf("result")).toBeLessThan(sections.indexOf("gains"));
    expect(sections.indexOf("gains")).toBeLessThan(sections.indexOf("losses"));
    expect(sections.indexOf("losses")).toBeLessThan(sections.indexOf("cta"));
    const method = document.querySelector("details[data-result-section='method']");
    expect(method?.hasAttribute("open")).toBe(false);
    expect(method?.textContent).toContain("この診断の確かめ方");
    expect(document.querySelector("[data-result-section='result']")?.textContent).not.toContain(
      "この診断の確かめ方",
    );
    expect(document.body.textContent).not.toContain("今すぐ");
    expect(window.localStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY)).toBe(
      JSON.stringify(["suggest-check"]),
    );
  });

  test("embed=1 では次の診断を出さない", async () => {
    window.history.pushState(null, "", "/suggest-check/?embed=1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => analysis,
      })),
    );
    render(<SuggestCheckApp />);
    fireEvent.change(screen.getByLabelText("店舗名・会社名・サービス名"), {
      target: { value: "テスト食堂" },
    });
    fireEvent.click(screen.getByRole("button", { name: "検索候補を調べる" }));
    expect(
      (await screen.findAllByRole("link", { name: "サジェスト（検索候補）対策を相談する" })).length,
    ).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryByText("次に試すとよい診断")).not.toBeInTheDocument();
      expect(document.querySelector("[data-diagnosis-progress]")).toBeNull();
    });
  });
});
