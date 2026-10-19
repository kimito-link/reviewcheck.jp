/**
 * 原価の守りのテスト（COST_SAFETY_POLICY §4: 上限を小さくした環境で、実際に拒否されること）。
 *
 * 実行: pnpm test（packages/core/src/**\/*.test.ts をまとめて回す）
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ANON_DAILY_BUDGET_YEN,
  DIAGNOSE_COST_YEN,
  PLACES_COST_YEN,
  cacheGet,
  guardMessage,
  hitDailyLimit,
  isBearerAuthorized,
  isPaidCallsDisabled,
  normalizeStoreQueryKey,
  readLimit,
  reserveDailyBudget,
  type CacheStore,
  type CounterStore,
} from "./index.ts";

/** Redis の INCRBY/DECRBY/EXPIRE だけを真似た偽ストア。 */
function memoryStore(): CounterStore & { values: Map<string, number> } {
  const values = new Map<string, number>();
  return {
    values,
    async incrby(key, by) {
      const v = (values.get(key) ?? 0) + by;
      values.set(key, v);
      return v;
    },
    async decrby(key, by) {
      const v = (values.get(key) ?? 0) - by;
      values.set(key, v);
      return v;
    },
    async expire() {
      return 1;
    },
  };
}

/** つながらない Redis。 */
const brokenStore: CounterStore = {
  async incrby() {
    throw new Error("ECONNREFUSED");
  },
  async decrby() {
    throw new Error("ECONNREFUSED");
  },
  async expire() {
    throw new Error("ECONNREFUSED");
  },
};

const at = new Date("2026-10-19T03:00:00Z");

describe("reserveDailyBudget（L2・日次予算の予約）", () => {
  test("上限を小さくすると、超えた分は拒否され、カウンタは戻る", async () => {
    const store = memoryStore();
    const opts = { pool: "t", costYen: PLACES_COST_YEN.store, limitYen: 20, at };
    const first = await reserveDailyBudget(store, opts); // 9
    const second = await reserveDailyBudget(store, opts); // 18
    const third = await reserveDailyBudget(store, opts); // 27 > 20 → 拒否
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.deepEqual(third, { ok: false, reason: "budget_exhausted" });
    // 拒否した分は戻っている（呼んでいないので使っていない）。
    assert.equal([...store.values.values()][0], 18);
  });

  test("上限 0 なら1回目から拒否（キルスイッチ代わりにも使える）", async () => {
    const r = await reserveDailyBudget(memoryStore(), {
      pool: "t",
      costYen: 9,
      limitYen: 0,
      at,
    });
    assert.deepEqual(r, { ok: false, reason: "budget_exhausted" });
  });

  test("ストアが無い → 拒否（fail-closed）", async () => {
    const r = await reserveDailyBudget(null, { pool: "t", costYen: 9, limitYen: 100, at });
    assert.deepEqual(r, { ok: false, reason: "unavailable" });
  });

  test("ストアがエラー → 拒否（fail-closed）", async () => {
    const r = await reserveDailyBudget(brokenStore, {
      pool: "t",
      costYen: 9,
      limitYen: 100,
      at,
    });
    assert.deepEqual(r, { ok: false, reason: "unavailable" });
  });

  test("上限の env が壊れている（null）→ 拒否（既定値に黙って落とさない）", async () => {
    const r = await reserveDailyBudget(memoryStore(), {
      pool: "t",
      costYen: 9,
      limitYen: readLimit("abc", 1500),
      at,
    });
    assert.deepEqual(r, { ok: false, reason: "unavailable" });
  });

  test("日付が変わると別のカウンタになる", async () => {
    const store = memoryStore();
    const opts = { pool: "t", costYen: 9, limitYen: 9 };
    assert.equal((await reserveDailyBudget(store, { ...opts, at })).ok, true);
    assert.equal((await reserveDailyBudget(store, { ...opts, at })).ok, false);
    const tomorrow = new Date("2026-10-20T03:00:00Z");
    assert.equal((await reserveDailyBudget(store, { ...opts, at: tomorrow })).ok, true);
  });

  test("既定の予算は1診断の原価の整数倍（見積りと上限がずれて必ず拒否、にならない）", () => {
    assert.equal(DEFAULT_ANON_DAILY_BUDGET_YEN % DIAGNOSE_COST_YEN, 0);
    assert.ok(DEFAULT_ANON_DAILY_BUDGET_YEN >= DIAGNOSE_COST_YEN);
  });
});

describe("hitDailyLimit（L4・IP ごとの上限）", () => {
  test("上限を超えたら拒否", async () => {
    const store = memoryStore();
    const opts = { scope: "places-diagnose", subject: "203.0.113.1", limit: 2, at };
    assert.equal((await hitDailyLimit(store, opts)).ok, true);
    assert.equal((await hitDailyLimit(store, opts)).ok, true);
    assert.deepEqual(await hitDailyLimit(store, opts), { ok: false, reason: "rate_limited" });
    // 別の IP は影響を受けない。
    assert.equal((await hitDailyLimit(store, { ...opts, subject: "203.0.113.2" })).ok, true);
  });

  test("Redis エラー時は通さない（以前の rateLimit は通していた）", async () => {
    const r = await hitDailyLimit(brokenStore, { scope: "s", subject: "x", limit: 10, at });
    assert.deepEqual(r, { ok: false, reason: "unavailable" });
  });

  test("ストアが無いときも通さない", async () => {
    const r = await hitDailyLimit(null, { scope: "s", subject: "x", limit: 10, at });
    assert.deepEqual(r, { ok: false, reason: "unavailable" });
  });
});

describe("readLimit / isPaidCallsDisabled", () => {
  test("未設定は既定値、数値はその値、壊れた値は null", () => {
    assert.equal(readLimit(undefined, 1500), 1500);
    assert.equal(readLimit("", 1500), 1500);
    assert.equal(readLimit("300", 1500), 300);
    assert.equal(readLimit("0", 1500), 0);
    assert.equal(readLimit("-1", 1500), null);
    assert.equal(readLimit("1.5", 1500), null);
    assert.equal(readLimit("abc", 1500), null);
  });

  test("キルスイッチ", () => {
    assert.equal(isPaidCallsDisabled(undefined), false);
    assert.equal(isPaidCallsDisabled("0"), false);
    assert.equal(isPaidCallsDisabled("1"), true);
    assert.equal(isPaidCallsDisabled("TRUE"), true);
  });
});

describe("normalizeStoreQueryKey（L3・同じ店に二度払わない）", () => {
  test("全角・大文字・空白の違いは同じキー", () => {
    assert.equal(
      normalizeStoreQueryKey({ text: "  渋谷　ＡＢＣ整体院 " }),
      normalizeStoreQueryKey({ text: "渋谷 abc整体院" }),
    );
  });

  test("placeId があれば最優先・大文字小文字は保つ", () => {
    assert.equal(normalizeStoreQueryKey({ placeId: "ChIJAbC", text: "x" }), "pid:ChIJAbC");
  });

  test("空の問い合わせはキャッシュしない", () => {
    assert.equal(normalizeStoreQueryKey({ text: "  " }), null);
  });
});

describe("cacheGet", () => {
  test("キャッシュが壊れていても例外にせず「無し」扱い", async () => {
    const broken: CacheStore = {
      async get() {
        throw new Error("down");
      },
      async set() {
        throw new Error("down");
      },
    };
    assert.equal(await cacheGet(broken, "k"), null);
  });
});

describe("guardMessage（L6・取れなかったものを良好と言わない）", () => {
  test("予算切れは「終了」と言い、良好・問題なし・見つからないとは言わない", () => {
    for (const reason of ["budget_exhausted", "rate_limited", "disabled", "unavailable"] as const) {
      const msg = guardMessage(reason, "store");
      assert.doesNotMatch(msg, /良好|問題なし|問題ありません|見つかりません/);
      assert.match(msg, /入力/);
    }
    assert.match(guardMessage("budget_exhausted", "store"), /無料枠が終了/);
  });
});

describe("isBearerAuthorized（cron・管理系は fail-closed）", () => {
  test("secret 未設定なら、ヘッダが何でも拒否", () => {
    assert.equal(isBearerAuthorized(undefined, undefined), false);
    assert.equal(isBearerAuthorized("Bearer ", ""), false);
    assert.equal(isBearerAuthorized("Bearer undefined", undefined), false);
  });

  test("一致したときだけ通す", () => {
    assert.equal(isBearerAuthorized("Bearer s3cret", "s3cret"), true);
    assert.equal(isBearerAuthorized("Bearer s3creT", "s3cret"), false);
    assert.equal(isBearerAuthorized(null, "s3cret"), false);
  });
});
