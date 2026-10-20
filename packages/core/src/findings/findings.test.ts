/**
 * 所見 K6「良好な状態」の回帰テスト
 *
 * 【なぜこのテストがあるか】
 * 返信・鮮度・周辺比較が未取得（undefined / null）でも K6 が
 * 「今回測定した範囲（星評価・口コミ数・返信・鮮度）では…」と表示され、
 * 測っていない項目まで測ったかのように読めていた。
 * 未取得の項目があるときはそれが分かる文言にし、測っていない項目を測ったと言わないことを固定する。
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectReviewFindings, isFindingBannedFree } from "./index.ts";
import type {
  CompetitorComparison,
  DiagnosisResult,
  StoreInput,
} from "../types/index.ts";

function makeResult(
  store: Partial<StoreInput>,
  comparison: Partial<CompetitorComparison> | null,
): DiagnosisResult {
  const s: StoreInput = { rating: 4.6, reviewCount: 120, source: "places", ...store };
  return {
    input: { store: s, competitors: [] },
    diagnosedAt: "2026-10-01T00:00:00.000Z",
    score: 90,
    band: "good",
    summary: "",
    factors: [],
    comparison:
      comparison === null
        ? null
        : {
            avgRating: 4.2,
            avgReviewCount: 80,
            ratingDiff: 0.4,
            reviewCountDiff: 40,
            ratingRank: 1,
            reviewCountRank: 1,
            total: 5,
            ...comparison,
          },
    simulation: {
      currentRating: s.rating,
      currentReviewCount: s.reviewCount,
      targetRating: 4.6,
      targetBasis: "preset",
      scenarios: [],
    },
    improvements: [],
    disclaimer: "",
    providers: [],
  } as DiagnosisResult;
}

function allText(r: ReturnType<typeof selectReviewFindings>): string {
  assert.ok(r);
  return [r.primary.name, r.primary.finding, r.primary.structure, r.primary.selfCare].join("\n");
}

describe("K6: 全項目を測れたとき", () => {
  test("従来どおり4項目を測定した範囲として述べる", () => {
    const r = selectReviewFindings(
      makeResult({ hasOwnerReplies: true, daysSinceLastReview: 10 }, {}),
    );
    assert.equal(r?.primary.key, "K6");
    assert.equal(r?.primary.name, "良好な状態");
    assert.match(r!.primary.finding, /星評価・口コミ数・返信・鮮度/);
    assert.match(r!.primary.structure, /周辺のお店と比べても/);
  });
});

describe("K6: 未取得の項目があるとき", () => {
  test("返信・鮮度が未取得 → 測った範囲に含めず、未確認と明記する", () => {
    const r = selectReviewFindings(makeResult({}, {}));
    assert.equal(r?.primary.key, "K6");
    const f = r!.primary.finding;
    assert.doesNotMatch(f, /星評価・口コミ数・返信・鮮度/);
    assert.match(f, /今回確認できた範囲（星評価・口コミ数）/);
    assert.match(f, /返信・鮮度は今回確認できていない/);
    assert.notEqual(r!.primary.name, "良好な状態");
  });

  test("鮮度だけ未取得 → 返信は確認済み、鮮度は未確認と述べる", () => {
    const r = selectReviewFindings(makeResult({ hasOwnerReplies: true }, {}));
    const f = r!.primary.finding;
    assert.match(f, /（星評価・口コミ数・返信）/);
    assert.match(f, /鮮度は今回確認できていない/);
  });

  test("周辺比較が未取得 → 周辺と比べた主張をしない", () => {
    const r = selectReviewFindings(
      makeResult({ hasOwnerReplies: true, daysSinceLastReview: 10 }, null),
    );
    assert.equal(r?.primary.key, "K6");
    assert.doesNotMatch(r!.primary.structure, /周辺のお店と比べても/);
    assert.match(r!.primary.finding, /周辺のお店との比較は今回確認できていない/);
    assert.notEqual(r!.primary.name, "良好な状態");
  });

  test("未取得ありの文言も禁句を含まない", () => {
    for (const r of [
      selectReviewFindings(makeResult({}, null)),
      selectReviewFindings(makeResult({ hasOwnerReplies: true }, {})),
    ]) {
      for (const line of allText(r).split("\n")) {
        assert.ok(isFindingBannedFree(line), `禁句: ${line}`);
      }
    }
  });
});
