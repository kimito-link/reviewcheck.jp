/**
 * 月次インサイトの回帰テスト
 *
 * 【なぜこのテストがあるか】
 * データを取得できなかった月に「無事の可視化」（何も起きていない状態を今月も確認できています）
 * を出すと、確認していないものを確認したと言うことになる。未取得の月はインサイトを出さない。
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyInsight } from "./build.ts";
import { SAFE_MONTH_INSIGHT } from "./dictionary.ts";
import type { MonthlyInsightInput } from "./types.ts";

const input = (over: Partial<MonthlyInsightInput>): MonthlyInsightInput => ({
  industryTag: "restaurant",
  month: 10,
  targetId: "abcdef0123456789",
  problemIds: [],
  hadSevereEvent: false,
  unreachable: false,
  verdictLevel: "clean",
  ...over,
});

describe("buildMonthlyInsight: 未取得の月", () => {
  test("verdictLevel unknown（未取得）ならインサイトを出さない", () => {
    assert.deepEqual(buildMonthlyInsight(input({ verdictLevel: "unknown" })), []);
  });

  test("unreachable（旧形式は clean で保存）ならインサイトを出さない", () => {
    assert.deepEqual(
      buildMonthlyInsight(input({ unreachable: true, verdictLevel: "clean" })),
      [],
    );
  });

  test("取得できた clean の月は従来どおり無事の可視化を出す", () => {
    const items = buildMonthlyInsight(input({}));
    assert.equal(items[0]?.message, SAFE_MONTH_INSIGHT.fact);
  });
});
