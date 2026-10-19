/**
 * 監視差分・月次レポート文面の回帰テスト
 *
 * 【なぜこのテストがあるか】
 * 店舗データを取得できなかった月のスナップショットが verdictLevel "clean" で保存され、
 * 「前回から重要な変化は見つかりませんでした」「総合判定: clean」「判定が改善しました」
 * と表示されていた（未取得を良好扱いする偽陰性）。
 * 未取得の月は「確認できませんでした」と表示し、良い判定にも悪い判定にも使わないことを固定する。
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots } from "./diff.ts";
import { buildNotification } from "./notify.ts";
import type { MonitorSnapshot, MonitorTarget } from "./types.ts";

const base: MonitorSnapshot = {
  targetId: "t1",
  url: "place-1",
  scannedAt: "2026-10-01T00:00:00.000Z",
  verdictLevel: "vulnerable",
  score: 70,
  malwareNames: [],
  exposureIds: [],
  problemIds: ["factor:reviewVolume"],
  unreachable: false,
};

const snap = (over: Partial<MonitorSnapshot>): MonitorSnapshot => ({ ...base, ...over });

/** 取得失敗時に scanner が作るスナップショット（修正後の形）。 */
const unavailable = snap({ verdictLevel: "unknown", score: 0, problemIds: [], unreachable: true });
/** 修正前に保存された取得失敗スナップショット（KV に残っている旧形式）。 */
const legacyUnavailable = snap({ verdictLevel: "clean", score: 0, problemIds: [], unreachable: true });

const target: MonitorTarget = {
  id: "t1",
  url: "place-1",
  label: "テスト店",
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const types = (events: { type: string }[]) => events.map((e) => e.type);
const NOT_GOOD = ["no-change", "recovered"];

describe("今回が未取得", () => {
  test("前回も未取得 → 変化なしではなく「確認できませんでした」", () => {
    const ev = diffSnapshots(unavailable, legacyUnavailable);
    assert.deepEqual(types(ev), ["unverified"]);
    assert.match(ev[0]!.message, /確認できませんでした/);
  });

  test("初回が未取得 → 基準となる診断結果とは言わない", () => {
    const ev = diffSnapshots(unavailable, null);
    assert.deepEqual(types(ev), ["unverified"]);
    assert.match(ev[0]!.message, /確認できませんでした/);
  });

  test("前回は取得できていた → 到達不可のみ。改善・変化なしは出さない", () => {
    const ev = diffSnapshots(legacyUnavailable, snap({ verdictLevel: "suspected" }));
    assert.deepEqual(types(ev), ["went-unreachable"]);
    for (const t of types(ev)) assert.ok(!NOT_GOOD.includes(t), t);
  });
});

describe("前回が未取得", () => {
  test("旧形式（clean で保存）の未取得月と比べて「悪化」を出さない", () => {
    const ev = diffSnapshots(snap({ verdictLevel: "vulnerable" }), legacyUnavailable);
    assert.ok(!types(ev).includes("verdict-worsened"), JSON.stringify(ev));
    assert.ok(!types(ev).includes("no-change"), JSON.stringify(ev));
  });

  test("未取得月を比較の基準にせず、今回を新しい基準として知らせる", () => {
    const ev = diffSnapshots(snap({ verdictLevel: "clean" }), unavailable);
    assert.deepEqual(types(ev), ["recovered"]);
    assert.match(ev[0]!.message, /前回は確認できなかった/);
  });
});

describe("通知文面（月次レポート）", () => {
  test("未取得の月は総合判定を clean と表示しない", () => {
    for (const s of [unavailable, legacyUnavailable]) {
      const { subject, body } = buildNotification({
        target,
        snapshot: s,
        previous: null,
        events: diffSnapshots(s, null),
        shouldNotify: true,
        scan: null,
      });
      assert.doesNotMatch(body, /clean/);
      assert.doesNotMatch(body, /重要な変化は見つかりませんでした/);
      assert.match(body, /総合判定: 確認できませんでした/);
      assert.match(subject, /確認できませんでした/);
    }
  });

  test("取得できた月は従来どおり判定とスコアを出す", () => {
    const s = snap({ verdictLevel: "clean", score: 88 });
    const { body } = buildNotification({
      target,
      snapshot: s,
      previous: s,
      events: diffSnapshots(s, s),
      shouldNotify: true,
      scan: null,
    });
    assert.match(body, /総合判定: clean \/ 安全スコア: 88/);
  });
});
