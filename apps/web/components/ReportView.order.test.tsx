import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DIAGNOSIS_PROGRESS_STORAGE_KEY,
  diagnose,
  rankNextDiagnoses,
} from "@reviewcheck/core";
import { RESULT_ESTIMATE_SENTENCE } from "@reviewcheck/config";
import { ReportView } from "./ReportView";
import { scoreHistoryKey } from "@/lib/scoreHistory";
import { SHARER_LINE_STORAGE_KEY } from "@/lib/refLine";

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
  "next-diagnoses",
  "perks",
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
    window.history.pushState(null, "", "/report/abc/");
    window.localStorage.removeItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
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

    const history = await screen.findByText("前回（10/1）62点 → 今回45点（-17）");
    expect(history).toBeInTheDocument();
    expect(
      container.querySelector('[data-result-section="score"]'),
    ).toContainElement(history);
    expect(
      await screen.findByText("11のうち1つを確かめました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1か月後の再点検を保存" })).toBeInTheDocument();

    const next = container.querySelector('[data-result-section="next-diagnoses"]');
    expect(next?.textContent).toContain("次に試すとよい診断");
    const behindPeers = fixture.comparison
      ? fixture.comparison.ratingDiff < 0 || fixture.comparison.reviewCountDiff < 0
      : false;
    const expected = rankNextDiagnoses({
      surface: "review",
      score: fixture.score,
      hasWebsite: false,
      behindPeers,
    });
    const names = [...(next?.querySelectorAll("a") ?? [])].map(
      (anchor) => anchor.textContent,
    );
    expect(names).toEqual(expected.map((app) => app.name));
    expect(names).not.toContain("口コミチェック.jp");
    expect(names).not.toContain("口コミ診断");
    expect(names).toContain("サジェスト診断");
    const nextText = next?.textContent ?? "";
    expect(nextText).toContain("特許出願中（特願2026-223098・特願2026-227149）");
    expect(nextText).not.toMatch(/特許取得|特許技術|特許済み|®|商標登録/);
    for (const card of next?.querySelectorAll("li") ?? []) {
      const name = card.querySelector("a")?.textContent ?? "";
      if (name === "リバースハック WEB健康診断") {
        expect(card.textContent ?? "").toContain("特許出願中（特願2026-223098）");
        expect(card.textContent ?? "").not.toContain("227149");
      }
      if (name !== "WEBサイト健康診断" && name !== "リバースハック WEB健康診断") {
        expect(card.textContent ?? "").not.toContain("特許");
      }
    }
    expect(nextText).not.toContain("無料");
    expect(nextText).not.toContain("必ず");
    expect(nextText).not.toContain("保証");
    expect(nextText).not.toContain("安全です");
    expect(next?.innerHTML ?? "").toContain("underline");
    expect(next?.innerHTML ?? "").not.toContain("#06C755");

    const progress = window.localStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
    expect(progress).toBe(JSON.stringify(["check"]));
    expect(progress ?? "").not.toContain("テスト食堂");

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

describe("特典と比較", () => {
  test("しきい値未満の比較は出さず、特典は16px以上で「無料」が無い", () => {
    const { container } = render(<ReportView result={fixture} cohort={{ show: false }} />);
    const estimate = container.querySelector('[data-result-section="estimate"]');
    expect(container.querySelector("[data-cohort-compare]")).toBeNull();
    expect(estimate?.textContent ?? "").not.toContain("上位");
    expect(estimate?.textContent ?? "").not.toContain("同業種の平均");

    const perks = container.querySelector('[data-result-section="perks"]');
    expect(perks).toBeTruthy();
    expect(perks?.innerHTML ?? "").not.toMatch(/text-(xs|sm)\b/);
    expect(perks?.innerHTML ?? "").toContain("text-base");
    expect(perks?.textContent ?? "").not.toContain("無料");
    expect(perks?.textContent ?? "").not.toMatch(/円/);
    expect(perks?.innerHTML ?? "").not.toContain("#06C755");
  });

  test("しきい値以上の比較だけ、点数のそばに出す", () => {
    const { container } = render(
      <ReportView
        result={fixture}
        cohort={{
          show: true,
          topPercent: 12,
          averageScore: 70,
          averageRating: 4.2,
          averageReviewCount: 120,
          replyShare: 0.4,
          regionLabel: "長野県岡谷市",
          categoryLabel: "食堂",
          sampleCount: 32,
        }}
      />,
    );
    const note = container.querySelector("[data-cohort-compare]");
    expect(note?.textContent).toContain("近所の同じ業種（食堂・長野県岡谷市）の中で上位12%");
    expect(note?.textContent).toContain("同業種の平均70点");
    expect(note?.textContent).toContain("星の平均 4.2");
    expect(note?.textContent).toContain("返信ありの割合 40%");
    expect(note?.innerHTML ?? "").not.toMatch(/text-(xs|sm)\b/);
    expect(note?.textContent ?? "").not.toContain("無料");
    expect(note?.textContent ?? "").not.toMatch(/優良|認定|安全です/);
  });

  test("印刷プレビューは推定である旨から始まり、16px以上", () => {
    render(<ReportView result={fixture} />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "レポートを表示して印刷" })[0]!,
    );
    const preview = document.querySelector("[data-report-preview]");
    expect(preview?.textContent).toContain("これは診断時点の推定で、断定ではありません。");
    expect(preview?.textContent).toContain("SCORE_RULE_VERSION：1.0");
    expect(preview?.textContent).toContain("2026-10-24 17:41");
    expect(preview?.textContent).toContain("データの取得元：手入力");
    expect(preview?.textContent ?? "").not.toContain("無料");
    expect(preview?.textContent ?? "").not.toContain("柴宮");
    expect(preview?.innerHTML ?? "").not.toMatch(/text-(xs|sm)\b/);
    expect(preview?.innerHTML ?? "").toContain("text-base");
  });

  test("embed=1 では次の診断と進捗と、共有した人の連絡先を出さない", async () => {
    window.history.pushState(
      null,
      "",
      "/report/embed/?embed=1&ref_line=https%3A%2F%2Flin.ee%2Fabc",
    );
    render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/embed/"
        refLine="https://lin.ee/abc"
      />,
    );
    await waitFor(() => {
      expect(screen.queryByText("次に試すとよい診断")).not.toBeInTheDocument();
      expect(document.querySelector("[data-diagnosis-progress]")).toBeNull();
      expect(
        screen.queryByRole("link", { name: "共有した人に相談する（LINE）" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("自分の公式LINEのURL")).not.toBeInTheDocument();
    });
    expect(screen.getByText(RESULT_ESTIMATE_SENTENCE)).toBeInTheDocument();
    window.history.pushState(null, "", "/report/embed/");
  });
});

describe("共有した人の公式LINE", () => {
  test("許可したURLだけボタンにし、共有URLに載せる", async () => {
    window.history.pushState(null, "", "/report/abc/");
    window.localStorage.removeItem(SHARER_LINE_STORAGE_KEY);
    render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/abc/"
        refLine="https://evil.example/phish"
      />,
    );
    expect(
      screen.queryByRole("link", { name: "共有した人に相談する（LINE）" }),
    ).not.toBeInTheDocument();

    cleanup();
    render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/abc/"
        refLine="https://lin.ee/from-friend"
      />,
    );
    const link = screen.getByRole("link", { name: "共有した人に相談する（LINE）" });
    expect(link).toHaveAttribute("href", "https://lin.ee/from-friend");
    expect(link.closest("[data-result-section='cta']")).toBeNull();
    const shareUrl = screen.getByLabelText("共有URL") as HTMLInputElement;
    expect(shareUrl.value).toContain("ref_line=");
    expect(decodeURIComponent(shareUrl.value)).toContain("https://lin.ee/from-friend");
    const added = [
      document.querySelector("[data-sharer-line-consult]")?.textContent ?? "",
      document.querySelector("[data-sharer-line-setting]")?.textContent ?? "",
    ].join("\n");
    expect(added).not.toMatch(/無料|必ず|保証/);

    fireEvent.change(screen.getByLabelText("自分の公式LINEのURL"), {
      target: { value: "https://evil.example/phish" },
    });
    fireEvent.click(screen.getByRole("button", { name: "このURLを共有に使う" }));
    expect(screen.getByRole("alert")).toHaveTextContent("https://lin.ee/");
    expect(window.localStorage.getItem(SHARER_LINE_STORAGE_KEY)).toBeNull();

    fireEvent.change(screen.getByLabelText("自分の公式LINEのURL"), {
      target: { value: "https://line.me/R/ti/p/@example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "このURLを共有に使う" }));
    await waitFor(() => {
      expect(window.localStorage.getItem(SHARER_LINE_STORAGE_KEY)).toContain(
        "https://line.me/",
      );
    });
    expect(decodeURIComponent(shareUrl.value)).toContain("https://line.me/");
    expect(shareUrl.value).not.toContain("evil.example");
  });

  test("LINEアプリ内ブラウザでは openExternalBrowser=1 を足す", async () => {
    const original = window.navigator.userAgent;
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 Line/14.0.0",
      configurable: true,
    });
    window.history.pushState(null, "", "/report/abc/?ref_line=https%3A%2F%2Flin.ee%2Fabc");
    render(
      <ReportView
        result={fixture}
        shareUrl="https://reviewcheck.jp/report/abc/"
        refLine="https://lin.ee/abc"
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "共有した人に相談する（LINE）" }),
      ).toHaveAttribute("href", "https://lin.ee/abc?openExternalBrowser=1");
    });
    Object.defineProperty(window.navigator, "userAgent", {
      value: original,
      configurable: true,
    });
  });
});
