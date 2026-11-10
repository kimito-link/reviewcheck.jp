import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  COMPETITOR_SEARCH_FIELD_MASK,
  PLACE_DETAILS_FIELD_MASK,
  TEXT_SEARCH_FIELD_MASK,
} from "./googlePlaces.ts";

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

  test("店の特定は ID だけ、詳細は口コミ本文を取らない", () => {
    assert.equal(TEXT_SEARCH_FIELD_MASK, "places.id");
    const details = PLACE_DETAILS_FIELD_MASK.split(",");
    assert.equal(details.includes("reviews"), false);
    assert.equal(details.includes("rating"), true);
    assert.equal(details.includes("userRatingCount"), true);
    assert.equal(new Set(details).size, details.length);
  });
});