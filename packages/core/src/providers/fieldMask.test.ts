import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { COMPETITOR_SEARCH_FIELD_MASK } from "./googlePlaces.ts";

describe("周辺競合の FieldMask", () => {
  test("既存の項目に公開座標を足し、口コミ本文は足さない", () => {
    const fields = COMPETITOR_SEARCH_FIELD_MASK.split(",");
    for (const field of [
      "places.id",
      "places.displayName",
      "places.rating",
      "places.userRatingCount",
      "places.googleMapsUri",
      "places.location",
    ]) {
      assert.ok(fields.includes(field), field);
    }
    assert.equal(fields.includes("places.reviews"), false);
    assert.equal(new Set(fields).size, fields.length);
  });
});