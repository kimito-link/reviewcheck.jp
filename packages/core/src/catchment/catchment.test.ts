import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MAX_COMPETITORS } from "../competitor/index.ts";
import {
  COMPETITOR_RESULT_LIMIT,
  FOOD_CATCHMENT_RADIUS_METERS,
  competitorPlacesRequest,
  competitorSearchPlan,
} from "./index.ts";

describe("商圏: 諏訪のラーメン店で漏れていた条件を使わない", () => {
  test("ラーメン店は半径12kmの関連検索。1500mの Nearby にはしない", () => {
    const plan = competitorSearchPlan({
      primaryType: "ramen_restaurant",
      name: "麺屋 しるし",
      category: "ラーメン店",
    });
    assert.equal(plan.mode, "text");
    assert.equal(plan.textQuery, "ラーメン");
    assert.equal(plan.radiusMeters, FOOD_CATCHMENT_RADIUS_METERS);
    assert.equal(plan.radiusMeters, 12_000);
    assert.equal(plan.limit, 20);

    const request = competitorPlacesRequest({
      lat: 36.0384,
      lng: 138.0984,
      primaryType: "ramen_restaurant",
      name: "横浜豚骨醤油ラーメン くじら家",
      category: "ラーメン店",
    });
    assert.ok(request);
    assert.equal(request.endpoint, "searchText");
    assert.equal(request.limit, COMPETITOR_RESULT_LIMIT);
    assert.equal(request.body.textQuery, "ラーメン");
    assert.equal(request.body.rankPreference, "RELEVANCE");
    assert.equal(request.body.pageSize, 20);
    assert.equal(request.body.languageCode, "ja");
    assert.equal(request.body.regionCode, "JP");
    const bias = request.body.locationBias as {
      circle: { radius: number; center: { latitude: number; longitude: number } };
    };
    assert.equal(bias.circle.radius, 12_000);
    assert.equal(bias.circle.center.latitude, 36.0384);
    assert.equal(request.body.locationRestriction, undefined);
    assert.equal("includedPrimaryTypes" in request.body, false);
    assert.equal(MAX_COMPETITORS, COMPETITOR_RESULT_LIMIT);
  });

  test("店名がラーメンなら、広い業種よりラーメンを優先する", () => {
    const plan = competitorSearchPlan({
      primaryType: "chinese_restaurant",
      name: "中華そば てんほう",
      category: "中華料理店",
    });
    assert.equal(plan.textQuery, "ラーメン");
    assert.equal(plan.radiusMeters, 12_000);
  });

  test("日本語の業種表示だけでもラーメンにする", () => {
    const plan = competitorSearchPlan({
      primaryType: "restaurant",
      category: "ラーメン店",
    });
    assert.equal(plan.textQuery, "ラーメン");
  });

  test("カフェも飲食の12km。表に無い業種は primaryType の Nearby で8km", () => {
    assert.equal(competitorSearchPlan({ primaryType: "cafe" }).radiusMeters, 12_000);
    assert.equal(competitorSearchPlan({ primaryType: "cafe" }).textQuery, "カフェ");
    const repair = competitorSearchPlan({ primaryType: "car_repair" });
    assert.equal(repair.mode, "nearby");
    assert.deepEqual(repair.includedPrimaryTypes, ["car_repair"]);
    assert.equal(repair.radiusMeters, 8_000);
    const request = competitorPlacesRequest({
      lat: 35.6,
      lng: 139.7,
      primaryType: "car_repair",
    });
    assert.equal(request?.endpoint, "searchNearby");
    assert.deepEqual(request?.body.includedPrimaryTypes, ["car_repair"]);
    const restriction = request?.body.locationRestriction as { circle: { radius: number } };
    assert.equal(restriction.circle.radius, 8_000);
  });

  test("座標が無いときはリクエストを作らない", () => {
    assert.equal(
      competitorPlacesRequest({ primaryType: "ramen_restaurant" }),
      null,
    );
  });
});
