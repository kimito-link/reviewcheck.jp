import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { distanceMeters, readPoint, withPublicPoint } from "./geo.ts";

describe("readPoint", () => {
  test("範囲内だけ残し、小数第5位に揃える", () => {
    assert.deepEqual(readPoint(36.05671234, 138.04931234), {
      lat: 36.05671,
      lng: 138.04931,
    });
    assert.equal(readPoint(90, 180)?.lat, 90);
    assert.equal(readPoint(-90, -180)?.lng, -180);
  });

  test("片側・範囲外・数値でない組は落とす", () => {
    assert.equal(readPoint(36, undefined), null);
    assert.equal(readPoint(undefined, 138), null);
    assert.equal(readPoint(90.0001, 138), null);
    assert.equal(readPoint(36, 180.0001), null);
    assert.equal(readPoint(Number.NaN, 138), null);
    assert.equal(readPoint("36", 138), null);
  });
});

describe("withPublicPoint", () => {
  test("本体が無ければ fallback の座標を写す", () => {
    const store = withPublicPoint(
      { name: "テスト", rating: 4, reviewCount: 10 },
      { lat: 36.056712, lng: 138.049318 },
    );
    assert.equal(store.lat, 36.05671);
    assert.equal(store.lng, 138.04932);
    assert.equal(store.name, "テスト");
  });

  test("本体の座標を fallback より優先する", () => {
    const store = withPublicPoint(
      { lat: 35.0, lng: 139.0 },
      { lat: 36.0, lng: 138.0 },
    );
    assert.equal(store.lat, 35);
    assert.equal(store.lng, 139);
  });

  test("どちらも不正ならキーを残さない", () => {
    const store = withPublicPoint({ lat: 120, lng: 10, name: "A" }, { lat: 36 });
    assert.equal("lat" in store, false);
    assert.equal("lng" in store, false);
    assert.equal(store.name, "A");
  });
});

describe("distanceMeters", () => {
  test("同じ点は 0、緯度1度は約111km", () => {
    const origin = { lat: 36, lng: 138 };
    assert.equal(distanceMeters(origin, origin), 0);
    const north = distanceMeters(origin, { lat: 37, lng: 138 });
    assert.ok(north > 110_000 && north < 112_000);
  });
});
