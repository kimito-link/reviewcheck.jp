import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DIAGNOSIS_PROGRESS_STORAGE_KEY,
  diagnose,
  rankNextDiagnoses,
} from "@reviewcheck/core";
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
      await screen.findByText("6つのうち1つを確かめました"),
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
    const nextText = next?.textContent ?? "";
    expect(nextText).not.toContain("無料");
    expect(nextText).not.toContain("必ず");
    expect(nextText).not.toContain("保証");
    expect(nextText).not.toContain("安全です");
    expect(next?.innerHTML ?? "").toContain("underline");
    expect(next?.innerHTML ?? "").not.toContain("#06C755");

    const progress = window.localStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
    expect(progress).toBe(JSON.stringify(["review"]));
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

  test("embed=1 では次の診断と進捗を出さない", async () => {
    window.history.pushState(null, "", "/report/embed/?embed=1");
    render(<ReportView result={fixture} shareUrl="https://reviewcheck.jp/report/embed/" />);
    await waitFor(() => {
      expect(screen.queryByText("次に試すとよい診断")).not.toBeInTheDocument();
      expect(document.querySelector("[data-diagnosis-progress]")).toBeNull();
    });
    expect(screen.getByText(RESULT_ESTIMATE_SENTENCE)).toBeInTheDocument();
    window.history.pushState(null, "", "/report/embed/");
  });
});
