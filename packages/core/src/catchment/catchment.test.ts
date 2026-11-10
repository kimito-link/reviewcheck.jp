import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PEERS_IF_SELF_INCLUDED,
  RETAINED_COMPETITOR_LIMIT,
  areaScopeText,
  catchmentAssumption,
} from "./index.ts";
import { MAX_COMPETITORS } from "../competitor/index.ts";
import { SCORE_RULE_VERSION } from "../scoring/version.ts";

describe("業種の半径は1回の検索の仮定", () => {
  test("表にある業種だけ同じ業種と扱い、不明は1500m", () => {
    assert.deepEqual(catchmentAssumption("cafe"), {
      radiusMeters: 800,
      categoryMatched: true,
    });
    assert.deepEqual(catchmentAssumption("restaurant"), {
      radiusMeters: 1500,
      categoryMatched: true,
    });
    assert.deepEqual(catchmentAssumption(undefined), {
      radiusMeters: 1500,
      categoryMatched: false,
    });
    assert.equal(catchmentAssumption("unknown_type").categoryMatched, false);
  });

  test("画面に残す件数は10。検索の上限20件に自店が入ると周辺は19", () => {
    assert.equal(MAX_COMPETITORS, RETAINED_COMPETITOR_LIMIT);
    assert.equal(RETAINED_COMPETITOR_LIMIT, 10);
    assert.equal(PEERS_IF_SELF_INCLUDED, 19);
    assert.equal(SCORE_RULE_VERSION, "1.0");
  });

  test("説明は標本であり、業種が無いときは同じ業種と言わない", () => {
    const known = areaScopeText({ primaryType: "cafe", shown: 10 });
    assert.match(known, /800m/);
    assert.match(known, /最大20件/);
    assert.match(known, /最大19件/);
    assert.match(known, /10件まで/);
    assert.match(known, /エリア全体の順位ではありません/);
    assert.doesNotMatch(known, /同じ業種とは限りません/);

    const unknown = areaScopeText({ primaryType: undefined, shown: 3 });
    assert.match(unknown, /同じ業種とは限りません/);
    assert.match(unknown, /3件まで/);
  });
});
