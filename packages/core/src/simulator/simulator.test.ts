/**
 * シミュレータの回帰テスト
 *
 * 【なぜこのテストがあるか】
 * 顧客(石川さん)のフィードバックで、実際に2件の計算バグが発覚した実績がある
 * （commit 9de0b53 / 9c6df1c）。いずれも顧客に見せる数字の誤りであり、
 * テストで防げていなかった。同じ種類の退行を二度と出さないために固定する。
 *
 * 実行: node --experimental-strip-types --test packages/core/src/simulator/simulator.test.ts
 *   (追加依存なし。Node 22 の型注釈ストリップ機能を使う)
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveTargetRating, buildSimulation } from "./index.ts";
import type { StoreInput, Competitor } from "../types/index.ts";

const store = (rating: number, reviewCount = 100): StoreInput =>
  ({ name: "テスト店", rating, reviewCount }) as StoreInput;

const comp = (rating: number, reviewCount = 100): Competitor =>
  ({ name: "競合", rating, reviewCount }) as Competitor;

describe("resolveTargetRating: 目標は現在の評価を下回らない（9de0b53の回帰）", () => {
  // 【元のバグ】自店の星評価が既に高いとき、目標が既定値4.5に切り下がり
  // 「現在より低い目標」を顧客に表示していた。
  test("競合なし・自店4.8 → 目標が4.8を下回らない", () => {
    const { target } = resolveTargetRating(store(4.8), []);
    assert.ok(target >= 4.8, `目標 ${target} が現在値 4.8 を下回っている`);
  });

  test("競合が全員格下・自店4.9 → 目標が4.9を下回らない", () => {
    const { target } = resolveTargetRating(store(4.9), [comp(3.0), comp(3.2)]);
    assert.ok(target >= 4.9, `目標 ${target} が現在値 4.9 を下回っている`);
  });

  test("カスタム目標が現在値より低くても、現在値まで引き上げられる", () => {
    const { target } = resolveTargetRating(store(4.7), [], 4.0);
    assert.ok(target >= 4.7, `目標 ${target} が現在値 4.7 を下回っている`);
  });

  test("満点5.0でも目標が下がらない", () => {
    const { target } = resolveTargetRating(store(5.0), [comp(4.0)]);
    assert.ok(target >= 5.0, `目標 ${target} が現在値 5.0 を下回っている`);
  });
});

describe("resolveTargetRating: 通常ケースは従来どおり", () => {
  test("競合平均が自店より高い → 競合平均が目標になる", () => {
    const { target, basis } = resolveTargetRating(store(3.5), [comp(4.4), comp(4.6)]);
    assert.equal(basis, "competitor");
    assert.ok(target > 3.5, "競合が上なら目標は現在値より高いはず");
  });

  test("競合なし・自店が低い → 既定値が目標(preset)", () => {
    const { target, basis } = resolveTargetRating(store(3.0), []);
    assert.equal(basis, "preset");
    assert.ok(target > 3.0);
  });

  test("目標は0〜5の範囲に収まる", () => {
    for (const r of [0, 2.5, 4.9, 5]) {
      const { target } = resolveTargetRating(store(r), [comp(5), comp(5)]);
      assert.ok(target >= 0 && target <= 5, `目標 ${target} が範囲外`);
    }
  });
});

describe("buildSimulation: 到達済みと未到達で破綻しない", () => {
  test("目標到達済みでも目標が現在値を下回らない", () => {
    const sim = buildSimulation(store(4.9, 300), [comp(3.5)]);
    assert.ok(sim, "シミュレーション結果が返っていない");
    assert.ok(
      sim.targetRating >= 4.9,
      `到達済みでも目標が現在値を下回ってはいけない (targetRating=${sim.targetRating})`,
    );
  });

  test("目標到達済みなら見出しが「キープする場合」になる（9de0b53の回帰）", () => {
    // 【元のバグ】到達済みなのに「改善する場合」と表示され、見出しと
    // 答え（達成済み）が噛み合っていなかった。
    const sim = buildSimulation(store(4.9, 300), [comp(3.5)]);
    const labels = sim.scenarios.map((s) => s.label).join(" / ");
    assert.ok(
      labels.includes("キープ"),
      `到達済みなのに見出しが「キープ」でない: ${labels}`,
    );
  });

  test("未到達ケースでシナリオが生成される", () => {
    const sim = buildSimulation(store(3.2, 50), [comp(4.5), comp(4.6)]);
    assert.ok(Array.isArray(sim.scenarios), "scenarios が配列でない");
    assert.ok(sim.scenarios.length > 0, "シナリオが空");
  });

  test("必要件数は負の数にならない", () => {
    // 顧客に「あと-3件」と見せないための防御。
    // なお reviewsNeeded は number | null で、null は「その手段では達成不能」を表す
    // 正当な値（例: 4つ星だけでは4.9に届かない）。null は許容し、負の数だけを弾く。
    for (const s of buildSimulation(store(4.9, 300), [comp(3.0)]).scenarios) {
      if (s.reviewsNeeded === null) continue;
      assert.ok(
        s.reviewsNeeded >= 0,
        `reviewsNeeded が負: ${s.id}=${s.reviewsNeeded}`,
      );
    }
  });

  test("レビュー0件でも落ちない（ゼロ除算の防御）", () => {
    const sim = buildSimulation(store(0, 0), []);
    assert.ok(sim, "レビュー0件で結果が返らない");
    assert.ok(
      Number.isFinite(sim.targetRating),
      `targetRating が有限数でない: ${sim.targetRating}`,
    );
    for (const s of sim.scenarios) {
      // null（達成不能）は正当。禁止したいのは NaN / Infinity が顧客画面に出ること。
      assert.ok(
        s.reviewsNeeded === null || Number.isFinite(s.reviewsNeeded),
        `reviewsNeeded が NaN/Infinity: ${s.id}=${s.reviewsNeeded}`,
      );
    }
  });
});
