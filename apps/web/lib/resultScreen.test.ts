import { describe, expect, test } from "vitest";
import {
  areaFromAddress,
  buildAiHearingMessage,
  DEFAULT_RESULT_AI_HEARING_URL,
  getResultAiHearingUrl,
  resolveAiHearingHref,
  RESULT_ESTIMATE_SENTENCE,
  selectResultCta,
} from "@reviewcheck/config";
import {
  planScoreHistory,
  SCORE_HISTORY_FIRST,
  SCORE_HISTORY_MISMATCH,
} from "./scoreHistory";
import {
  buildCountSummary,
  buildShareText,
  formatDiagnosedAtJst,
  leftAloneParagraphs,
} from "./resultCopy";

describe("結果CTAのしきい値", () => {
  test("60未満・60〜79・80以上で行き先が分かれる", () => {
    expect(selectResultCta(59).kind).toBe("line-auto");
    expect(selectResultCta(59).headline).toBe(
      "診断結果をLINEで送ると、自動で次の一手が届きます",
    );
    expect(selectResultCta(60).kind).toBe("line-hearing");
    expect(selectResultCta(60).label).toBe(
      "LINEで質問に答えて、改善のポイントを受け取る",
    );
    expect(selectResultCta(79).kind).toBe("line-hearing");
    expect(selectResultCta(80).kind).toBe("monitoring");
    expect(selectResultCta(80).label).toBe("月次モニタリングで、この点数を守る");
    expect(selectResultCta(100).kind).toBe("monitoring");
  });

  test("文言に「無料」がなく、相談フォームへは繋がない", () => {
    for (const score of [10, 59, 60, 79, 80, 100]) {
      const cta = selectResultCta(score);
      const text = `${cta.label}${cta.headline}${cta.body}`;
      expect(text).not.toContain("無料");
      expect(text).not.toContain("必ず");
      expect(text).not.toContain("保証");
      expect(text).not.toContain("/contact/");
      expect(text).not.toContain("15分");
    }
    expect(RESULT_ESTIMATE_SENTENCE).toContain("目安");
    expect(RESULT_ESTIMATE_SENTENCE).toContain("断定ではありません");
    expect(RESULT_ESTIMATE_SENTENCE).not.toContain("無料");
  });
});

describe("AIヒアリングの文面", () => {
  test("既定URLは lin.ee。店名は選んだときだけ", () => {
    expect(getResultAiHearingUrl()).toBe(DEFAULT_RESULT_AI_HEARING_URL);
    const hidden = buildAiHearingMessage({
      score: 68,
      ruleVersion: "1.0",
      category: "食堂",
      area: "長野県岡谷市",
    });
    expect(hidden.startsWith("【口コミ診断】選ばれやすさ 68点（目安）")).toBe(
      true,
    );
    expect(hidden).toContain("採点ルール v1.0");
    expect(hidden).toContain("業種：食堂");
    expect(hidden).toContain("エリア：長野県岡谷市");
    expect(hidden).not.toContain("店名");
    expect(hidden).not.toContain("無料");

    const named = buildAiHearingMessage({
      score: 68,
      ruleVersion: "1.0",
      shopName: "テスト食堂",
      category: "食堂",
      area: areaFromAddress("長野県岡谷市長地柴宮2-5-65"),
    });
    expect(named).toContain("店名：テスト食堂");
    expect(named).not.toContain("柴宮");
  });

  test("{message} があるURLだけ事前入力する", () => {
    const message = buildAiHearingMessage({ score: 68, ruleVersion: "1.0" });
    const plain = resolveAiHearingHref(message, DEFAULT_RESULT_AI_HEARING_URL);
    expect(plain.prefilledInUrl).toBe(false);
    expect(plain.href).toBe(DEFAULT_RESULT_AI_HEARING_URL);
    const filled = resolveAiHearingHref(
      message,
      "https://example.test/hear?text={message}",
    );
    expect(filled.prefilledInUrl).toBe(true);
    expect(filled.href).toContain(encodeURIComponent("68点"));
    expect(filled.href).not.toContain("{message}");
  });
});

describe("結果のコピー", () => {
  test("件数要約は存在する部分だけ", () => {
    expect(
      buildCountSummary({ rating: 4, reviewCount: 45 }, null),
    ).toBe("星4.0／口コミ45件");
    expect(
      buildCountSummary(
        { rating: 4, reviewCount: 45 },
        { total: 5, reviewCountRank: 4 },
      ),
    ).toBe("星4.0／口コミ45件／周辺5店中 口コミ数 第4位");
  });

  test("取得時刻は日本時間", () => {
    expect(formatDiagnosedAtJst("2026-10-24T08:41:00.000Z")).toBe(
      "2026-10-24 17:41",
    );
  });

  test("シェア文は点数から始まる", () => {
    const text = buildShareText({
      score: 68,
      storeName: "テスト食堂",
      ruleVersion: "1.0",
    });
    expect(text.startsWith("選ばれやすさ 68点（目安）｜")).toBe(true);
    expect(text).toContain("テスト食堂");
    expect(text).not.toContain("無料");
    expect(text).not.toContain("必ず");
    expect(text).not.toContain("保証");
  });

  test("このままにした場合は金額を出さない", () => {
    const lines = leftAloneParagraphs({
      reviewCountDiff: -12,
      ratingDiff: -0.4,
    });
    const text = lines.join("");
    expect(text).not.toMatch(/円|無料/);
    expect(text).toContain("目安");
  });
});

describe("前回比", () => {
  test("初回・差分・ルール違い", () => {
    const first = planScoreHistory(null, {
      score: 68,
      date: "2026-10-24T08:41:00.000Z",
      ruleVersion: "1.0",
    });
    expect(first.message).toBe(SCORE_HISTORY_FIRST);
    expect(first.store).toEqual({
      score: 68,
      date: "2026-10-24T08:41:00.000Z",
      ruleVersion: "1.0",
    });

    const next = planScoreHistory(first.store, {
      score: 74,
      date: "2026-11-02T01:00:00.000Z",
      ruleVersion: "1.0",
    });
    expect(next.message).toBe("前回（10/24）68点 → 今回74点（+6）");

    const mismatch = planScoreHistory(first.store, {
      score: 70,
      date: "2026-11-02T01:00:00.000Z",
      ruleVersion: "1.1",
    });
    expect(mismatch.message).toBe(SCORE_HISTORY_MISMATCH);

    const again = planScoreHistory(next.store, {
      score: 74,
      date: "2026-11-02T01:00:00.000Z",
      ruleVersion: "1.0",
    });
    expect(again.message).toBe("前回（10/24）68点 → 今回74点（+6）");
    expect(again.store).toBeNull();
  });
});
