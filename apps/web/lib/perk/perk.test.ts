import { describe, expect, test } from "vitest";
import { diagnose } from "@reviewcheck/core";
import { buildRecheckIcs, recheckPageUrl } from "./ics";
import {
  buildDiagnosisReport,
  previousCompareLine,
  REPORT_LEAD,
  reportToHtml,
} from "./reportDocument";

const result = diagnose({
  store: {
    name: "テスト食堂",
    category: "食堂",
    address: "長野県岡谷市長地柴宮2-5-65",
    rating: 4,
    reviewCount: 45,
    hasOwnerReplies: false,
    phone: "0266-00-0000",
    mapsUrl: "https://maps.google.com/?cid=1",
    placeId: "ChIJfixtureplace",
    source: "manual",
  },
  competitors: [
    { name: "競合A", rating: 4.7, reviewCount: 320 },
    { name: "競合B", rating: 4.6, reviewCount: 210 },
  ],
  diagnosedAt: "2026-10-24T08:41:00.000Z",
  ruleVersion: "1.0",
});

describe("再点検のics", () => {
  test("URLだけで、店名・回答・クエリは入らない", () => {
    const ics = buildRecheckIcs(
      "2026-10-24T08:41:00.000Z",
      new Date("2026-10-24T08:41:00.000Z"),
    );
    expect(recheckPageUrl()).toBe("https://reviewcheck.jp/check/");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("URL:https://reviewcheck.jp/check/");
    expect(ics).toContain("DESCRIPTION:https://reviewcheck.jp/check/");
    expect(ics).toContain("SUMMARY:口コミの再点検");
    expect(ics).toContain("DTSTART:20261124T010000Z");
    expect(ics).toContain("DTEND:20261124T020000Z");
    expect(ics).toContain("\r\n");
    expect(ics).not.toContain("テスト食堂");
    expect(ics).not.toContain("柴宮");
    expect(ics).not.toContain("競合");
    expect(ics).not.toContain("ChIJ");
    expect(ics).not.toContain("0266");
    expect(ics).not.toContain("?");
    expect(ics).not.toContain("無料");
    expect(ics).not.toContain("45点");
  });

  test("月末は翌月の実在する日に丸める", () => {
    const ics = buildRecheckIcs("2026-01-30T15:00:00.000Z");
    expect(ics).toContain("DTSTART:20260228T010000Z");
  });
});

describe("前回との差", () => {
  test("同じ版のときだけ差を出す", () => {
    expect(
      previousCompareLine(null, {
        score: 45,
        date: "2026-10-24T08:41:00.000Z",
        ruleVersion: "1.0",
      }),
    ).toBeNull();
    expect(
      previousCompareLine(
        {
          score: 62,
          date: "2026-10-01T00:00:00.000Z",
          ruleVersion: "1.0",
        },
        {
          score: 74,
          date: "2026-11-02T01:00:00.000Z",
          ruleVersion: "1.1",
        },
      ),
    ).toBeNull();
    expect(
      previousCompareLine(
        {
          score: 70,
          date: "2026-11-02T01:00:00.000Z",
          ruleVersion: "1.1",
          prev: {
            score: 62,
            date: "2026-10-01T00:00:00.000Z",
            ruleVersion: "1.0",
          },
        },
        {
          score: 70,
          date: "2026-11-02T01:00:00.000Z",
          ruleVersion: "1.1",
        },
      ),
    ).toBeNull();
    expect(
      previousCompareLine(
        {
          score: 62,
          date: "2026-10-01T00:00:00.000Z",
          ruleVersion: "1.0",
        },
        {
          score: 74,
          date: "2026-11-02T01:00:00.000Z",
          ruleVersion: "1.0",
        },
      ),
    ).toBe("前回（10/1）62点 → 今回74点（+12）");
  });
});

describe("端末内レポート", () => {
  test("推定の一文と記録があり、「無料」と個別の番地は無い", () => {
    const doc = buildDiagnosisReport({
      result,
      previous: {
        score: 62,
        date: "2026-10-01T00:00:00.000Z",
        ruleVersion: "1.0",
      },
      cohort: { show: false },
    });
    const html = reportToHtml(doc);
    expect(doc.lead).toBe(REPORT_LEAD);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("これは診断時点の推定で、断定ではありません。");
    expect(html).toContain("SCORE_RULE_VERSION：1.0");
    expect(html).toContain("診断日時：2026-10-24 17:41（日本時間）");
    expect(html).toContain("データの取得元：手入力");
    expect(html).toContain("取得時刻：2026-10-24 17:41（日本時間）");
    expect(html).toContain("font-size: 16px");
    expect(html).toContain(
      `前回（10/1）62点 → 今回${result.score}点（${result.score - 62}）`,
    );
    expect(html).not.toContain("無料");
    expect(html).not.toContain("柴宮");
    expect(html).not.toContain("競合A");
    expect(html).not.toContain("ChIJ");
    expect(html).not.toContain("0266");
    expect(html).not.toContain("maps.google");
    expect(html).not.toMatch(/[0-9,]+円/);
    const headings = doc.blocks.map((block) => block.heading);
    expect(headings[0]).toBe("点数");
    expect(headings.indexOf("直し方")).toBeLessThan(headings.indexOf("このままだと失うこと"));
    expect(headings.indexOf("このままだと失うこと")).toBeLessThan(headings.indexOf("次の一歩"));
    expect(headings.indexOf("次の一歩")).toBeLessThan(headings.indexOf("確認できなかった項目"));
    expect(headings.at(-1)).toBe("記録");
    expect(html).not.toContain("上位");
    expect(html).not.toContain("安全です");
    expect(html).not.toContain("優良");
  });

  test("版が違う前回はレポートに差を書かない", () => {
    const html = reportToHtml(
      buildDiagnosisReport({
        result,
        previous: {
          score: 62,
          date: "2026-10-01T00:00:00.000Z",
          ruleVersion: "0.9",
        },
        cohort: null,
      }),
    );
    expect(html).not.toContain("前回");
    expect(html).not.toContain("62点");
  });
});
