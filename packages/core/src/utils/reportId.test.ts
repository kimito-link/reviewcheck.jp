/**
 * 共有URLの id に採点ルール版と取得時刻が残ること。
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decodeReportId, encodeReportId } from "./reportId.ts";

describe("report id", () => {
  test("ruleVersion と diagnosedAt を往復できる", () => {
    const id = encodeReportId({
      store: { name: "テスト食堂", rating: 4, reviewCount: 45 },
      competitors: [],
      ruleVersion: "1.0",
      diagnosedAt: "2026-10-24T08:41:00.000Z",
    });
    const back = decodeReportId(id);
    assert.ok(back);
    assert.equal(back.ruleVersion, "1.0");
    assert.equal(back.diagnosedAt, "2026-10-24T08:41:00.000Z");
    assert.equal(back.store.rating, 4);
  });

  test("版を記録する前の id は ruleVersion を持たない", () => {
    const id = encodeReportId({
      store: { rating: 4.2, reviewCount: 10 },
      competitors: [],
    });
    const back = decodeReportId(id);
    assert.ok(back);
    assert.equal(back.ruleVersion, undefined);
    assert.equal(back.diagnosedAt, undefined);
  });
});
