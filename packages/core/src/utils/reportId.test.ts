import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { DiagnosisInput } from "../types/index.ts";
import { encodePlaceReportId, encodeReportId, readReportReference } from "./reportId.ts";

const legacy: DiagnosisInput = {
  store: {
    name: "テスト食堂",
    rating: 4.2,
    reviewCount: 80,
    placeId: "ChIJtest",
    lat: 35.6,
    lng: 139.7,
    source: "places",
  },
  competitors: [],
  diagnosedAt: "2026-10-01T00:00:00.000Z",
  ruleVersion: "1.0",
};

describe("共有ID", () => {
  test("新しいIDは place ID だけで往復し、星や店名を載せない", () => {
    const id = encodePlaceReportId("  ChIJtest  ");
    assert.equal(id.startsWith("p1."), true);
    assert.equal(id.includes("テスト食堂"), false);
    assert.equal(id.includes("4.2"), false);
    const ref = readReportReference(id);
    assert.deepEqual(ref, { kind: "place", placeId: "ChIJtest" });
  });

  test("余分な項目があるIDは受け取らない", () => {
    const json = JSON.stringify({ placeId: "ChIJtest", rating: 4 });
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    assert.equal(readReportReference(`p1.${b64}`), null);
  });

  test("古いIDは place ID だけを返し、入っていた星は参照に残さない", () => {
    const id = encodeReportId(legacy);
    const ref = readReportReference(id);
    assert.deepEqual(ref, { kind: "legacy-place", placeId: "ChIJtest" });
    assert.equal(JSON.stringify(ref).includes("4.2"), false);
    assert.equal(JSON.stringify(ref).includes("テスト食堂"), false);
  });

  test("place ID の無い古いIDは、点数を復元しない", () => {
    const id = encodeReportId({
      ...legacy,
      store: { ...legacy.store, placeId: undefined },
    });
    assert.deepEqual(readReportReference(id), { kind: "legacy-no-place" });
  });
});
