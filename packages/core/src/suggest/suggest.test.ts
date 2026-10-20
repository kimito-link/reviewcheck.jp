/**
 * サジェスト取得・判定の回帰テスト
 *
 * 【なぜこのテストがあるか】
 * 取得に失敗したとき空配列を返していたため、「取得できなかった」と
 * 「問い合わせは成功し、ネガティブ候補が無かった」が区別できず、
 * 取得失敗でも「良好（safe）」と表示していた（偽陰性）。
 * 取得値／不存在／未取得の3状態を区別し、未取得を良い判定に使わないことを固定する。
 */
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { analyzeStoreSuggest, fetchGoogleSuggest } from "./index.ts";

const realFetch = globalThis.fetch;

/** 呼び出し順（0始まり）で応答を出し分けるモック。null は通信失敗。 */
function mockFetch(byCall: (call: number) => string[] | null | "http-error") {
  let call = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const res = byCall(call++);
    if (res === null) throw new Error("network down");
    if (res === "http-error") return new Response("", { status: 503 });
    return new Response(JSON.stringify([url.searchParams.get("q"), res]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchGoogleSuggest: 未取得と不存在を区別する", () => {
  test("通信失敗は null（未取得）", async () => {
    mockFetch(() => null);
    assert.equal(await fetchGoogleSuggest("テスト店"), null);
  });

  test("HTTP エラーは null（未取得）", async () => {
    mockFetch(() => "http-error");
    assert.equal(await fetchGoogleSuggest("テスト店"), null);
  });

  test("成功して候補0件は []（不存在）", async () => {
    mockFetch(() => []);
    assert.deepEqual(await fetchGoogleSuggest("テスト店"), []);
  });
});

describe("analyzeStoreSuggest: 未取得は safe にしない", () => {
  test("両方の取得に失敗 → unavailable / risk unknown（safe ではない）", async () => {
    mockFetch(() => null);
    const r = await analyzeStoreSuggest("テスト店");
    assert.ok(r);
    assert.equal(r.status, "unavailable");
    assert.equal(r.risk, "unknown");
    assert.notEqual(r.risk, "safe");
  });

  test("片方だけ失敗・取れた側にネガ無し → partial / risk unknown", async () => {
    mockFetch((call) => (call === 1 ? null : ["テスト店 ランチ"]));
    const r = await analyzeStoreSuggest("テスト店");
    assert.ok(r);
    assert.equal(r.status, "partial");
    assert.equal(r.risk, "unknown");
  });

  test("片方だけ失敗でも、取れた側のネガ候補は判定に使う", async () => {
    mockFetch((call) => (call === 1 ? null : ["テスト店 詐欺"]));
    const r = await analyzeStoreSuggest("テスト店");
    assert.ok(r);
    assert.equal(r.status, "partial");
    assert.equal(r.risk, "high");
    assert.equal(r.negatives.length, 1);
  });

  test("両方成功・ネガ無し → ok / safe", async () => {
    mockFetch(() => ["テスト店 ランチ", "テスト店 予約"]);
    const r = await analyzeStoreSuggest("テスト店");
    assert.ok(r);
    assert.equal(r.status, "ok");
    assert.equal(r.risk, "safe");
  });

  test("両方成功・候補0件（不存在） → ok / safe", async () => {
    mockFetch(() => []);
    const r = await analyzeStoreSuggest("テスト店");
    assert.ok(r);
    assert.equal(r.status, "ok");
    assert.equal(r.risk, "safe");
    assert.equal(r.suggestions.length, 0);
  });
});
