/**
 * 選ばれやすさスコアは決定的。同じ入力なら同じ点数・同じ内訳になる。
 * AIや時刻には依存しない（取得時刻は点数に使わない）。
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { diagnose } from "../diagnose.ts";
import type { DiagnosisInput } from "../types/index.ts";
import { SCORE_RULE_VERSION, staleRuleVersionNote } from "./version.ts";

const fixture: DiagnosisInput = {
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
};

describe("選ばれやすさスコアの決定性", () => {
  test("同じ入力なら同じ点数・同じ内訳", () => {
    const a = diagnose(fixture);
    const b = diagnose({
      store: { ...fixture.store },
      competitors: fixture.competitors.map((c) => ({ ...c })),
    });
    assert.equal(a.score, b.score);
    assert.equal(a.band, b.band);
    assert.deepEqual(
      a.factors.map((f) => [f.id, f.points, f.max, f.status]),
      b.factors.map((f) => [f.id, f.points, f.max, f.status]),
    );
    assert.deepEqual(a.improvements.map((i) => i.id), b.improvements.map((i) => i.id));
    assert.equal(a.ruleVersion, SCORE_RULE_VERSION);
    assert.equal(b.ruleVersion, SCORE_RULE_VERSION);
  });

  test("この入力の点数を固定する（採点式を黙って変えない）", () => {
    const result = diagnose(fixture);
    assert.equal(result.score, 45);
    assert.equal(result.band, "weak");
  });

  test("取得時刻とルール版は共有URL用の入力に残り、点数には影響しない", () => {
    const stamped = diagnose({
      ...fixture,
      diagnosedAt: "2020-01-02T03:04:05.000Z",
      ruleVersion: "0.9",
    });
    const fresh = diagnose(fixture);
    assert.equal(stamped.score, fresh.score);
    assert.equal(stamped.diagnosedAt, "2020-01-02T03:04:05.000Z");
    assert.equal(stamped.input.diagnosedAt, "2020-01-02T03:04:05.000Z");
    assert.equal(stamped.input.ruleVersion, "0.9");
    assert.equal(stamped.ruleVersion, SCORE_RULE_VERSION);
  });
});

describe("古い共有URLの注記", () => {
  test("同じ版なら注記しない", () => {
    assert.equal(staleRuleVersionNote(SCORE_RULE_VERSION), null);
  });

  test("版が無いURLと、違う版のURLでは注記する", () => {
    const legacy = staleRuleVersionNote(undefined);
    assert.ok(legacy);
    assert.match(legacy, /記録する前/);
    assert.match(legacy, new RegExp(`v${SCORE_RULE_VERSION}`));
    const old = staleRuleVersionNote("0.9");
    assert.ok(old);
    assert.match(old, /v0\.9/);
    assert.match(old, new RegExp(`v${SCORE_RULE_VERSION}`));
  });
});
