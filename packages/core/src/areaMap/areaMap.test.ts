import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeCompetitors } from "../competitor/index.ts";
import { diagnose } from "../diagnose.ts";
import type { Competitor, StoreInput } from "../types/index.ts";
import {
  areaCopyIssues,
  areaMedianMessage,
  buildAreaComparison,
  formatDistanceMeters,
} from "./index.ts";

const store: StoreInput = {
  name: "テスト食堂",
  rating: 4,
  reviewCount: 45,
  mapsUrl: "https://maps.google.com/?q=subject",
  lat: 36.06,
  lng: 138.05,
};

const peers: Competitor[] = [
  { name: "競合A", rating: 4.7, reviewCount: 320, lat: 36.07, lng: 138.05, mapsUrl: "https://maps.google.com/?q=a" },
  { name: "競合B", rating: 4.6, reviewCount: 210, lat: 36.06, lng: 138.06 },
  { name: "競合C", rating: 4.5, reviewCount: 160 },
  { name: "競合D", rating: 4.4, reviewCount: 120, lat: 36.05, lng: 138.04, mapsUrl: "https://maps.google.com/?q=d" },
];

describe("buildAreaComparison: 並びと順位", () => {
  test("口コミ数の多い順。同数は同順位で、診断店を先に置く", () => {
    const area = buildAreaComparison(
      { ...store, reviewCount: 120 },
      [
        { name: "同数の店", rating: 4, reviewCount: 120 },
        { name: "多い店", rating: 4, reviewCount: 200 },
      ],
    );
    assert.ok(area);
    assert.deepEqual(
      area.places.map((place) => [place.name, place.reviewCountRank, place.isSubject]),
      [
        ["多い店", 1, false],
        ["テスト食堂", 2, true],
        ["同数の店", 2, false],
      ],
    );
  });

  test("診断店の順位は、既存の競合比較と同じ数え方", () => {
    const area = buildAreaComparison(store, peers);
    const comparison = analyzeCompetitors(store, peers);
    assert.ok(area);
    assert.ok(comparison);
    const subject = area.places.find((place) => place.isSubject);
    assert.equal(subject?.reviewCountRank, comparison.reviewCountRank);
    assert.equal(area.total, comparison.total);
    assert.deepEqual(
      area.places.map((place) => place.reviewCount),
      [320, 210, 160, 120, 45],
    );
  });

  test("競合が無ければ地図も一覧も作らない", () => {
    assert.equal(buildAreaComparison(store, []), null);
    assert.equal(buildAreaComparison(store, undefined), null);
  });
});

describe("buildAreaComparison: 中央値までの件数", () => {
  test("奇数件の中央値との差", () => {
    const area = buildAreaComparison(store, peers);
    assert.ok(area);
    assert.equal(area.medianReviewCount, 160);
    assert.equal(area.reviewsToReachMedian, 115);
    assert.match(areaMedianMessage(area), /中央値は160件/);
    assert.match(areaMedianMessage(area), /あと115件/);
  });

  test("偶数件は中央2件の平均。届く件数は切り上げ", () => {
    const area = buildAreaComparison(
      { ...store, reviewCount: 10 },
      [
        { name: "A", rating: 4, reviewCount: 11 },
        { name: "B", rating: 4, reviewCount: 20 },
        { name: "C", rating: 4, reviewCount: 40 },
      ],
    );
    assert.ok(area);
    assert.equal(area.medianReviewCount, 15.5);
    assert.equal(area.reviewsToReachMedian, 6);
    assert.match(areaMedianMessage(area), /中央値は15\.5件/);
    assert.match(areaMedianMessage(area), /あと6件/);
  });

  test("中央値以上なら追加件数は 0", () => {
    const area = buildAreaComparison(
      { ...store, reviewCount: 400 },
      peers,
    );
    assert.ok(area);
    assert.equal(area.reviewsToReachMedian, 0);
    assert.match(areaMedianMessage(area), /届いています/);
    assert.equal(areaMedianMessage(area).includes("あと"), false);
  });

  test("結果の一文に、押す言葉と他店を下げる言葉を入れない", () => {
    const behind = buildAreaComparison(store, peers);
    const ahead = buildAreaComparison({ ...store, reviewCount: 400 }, peers);
    assert.ok(behind);
    assert.ok(ahead);
    for (const text of [areaMedianMessage(behind), areaMedianMessage(ahead)]) {
      assert.deepEqual(areaCopyIssues(text), []);
      assert.equal(/負け|最悪|最下位|弱い/.test(text), false);
    }
  });
});

describe("buildAreaComparison: 座標と距離", () => {
  test("座標がある店だけピンにする。診断店の座標が無ければ地図は出さない", () => {
    const area = buildAreaComparison(store, peers);
    assert.ok(area);
    assert.deepEqual(
      area.pins.map((pin) => `${pin.kind}:${pin.mark}`).sort(),
      ["peer:1", "peer:2", "peer:4", "subject:自"],
    );
    assert.equal(area.pins.find((pin) => pin.kind === "subject")?.mark, "自");
    assert.equal(area.places.filter((place) => place.distanceMeters == null).length, 2);

    const noSubjectPoint = buildAreaComparison(
      { ...store, lat: undefined, lng: undefined },
      peers,
    );
    assert.ok(noSubjectPoint);
    assert.deepEqual(noSubjectPoint.pins, []);
    assert.equal(noSubjectPoint.places.length, 5);
    assert.ok(noSubjectPoint.places.every((place) => place.distanceMeters == null));
  });

  test("不正な座標はピンにせず、距離も作らない", () => {
    const area = buildAreaComparison(
      { ...store, lat: 91, lng: 138 },
      [{ name: "B", rating: 4, reviewCount: 80, lat: 36, lng: 138 }],
    );
    assert.ok(area);
    assert.deepEqual(area.pins, []);
    assert.equal(area.places[0]?.distanceMeters, undefined);
  });

  test("距離は測れたときだけ表示用の文字列にする", () => {
    assert.equal(formatDistanceMeters(undefined), null);
    assert.equal(formatDistanceMeters(850.4), "850m");
    assert.equal(formatDistanceMeters(1500), "1.5km");
    assert.equal(formatDistanceMeters(12600), "13km");
    const area = buildAreaComparison(store, [
      { name: "北", rating: 4, reviewCount: 80, lat: 36.07, lng: 138.05 },
    ]);
    const peer = area?.places.find((place) => !place.isSubject);
    assert.ok(peer?.distanceMeters);
    assert.match(formatDistanceMeters(peer.distanceMeters) ?? "", /^1\.\dkm$/);
  });
});

describe("diagnose は公開座標を残し、不正な組は落とす", () => {
  test("共有URLに往復しても座標が落ちない", () => {
    const result = diagnose({
      store: { ...store, lat: 36.056712, lng: 138.049318 },
      competitors: [
        { name: "不正", rating: 4.2, reviewCount: 30, lat: 91, lng: 10 },
        { name: "正当", rating: 4.1, reviewCount: 80, lat: 36.07, lng: 138.06 },
      ],
    });
    assert.equal(result.input.store.lat, 36.05671);
    assert.equal(result.input.store.lng, 138.04932);
    assert.equal("lat" in result.input.competitors[0]!, false);
    assert.equal(result.input.competitors[1]?.lat, 36.07);
    const again = buildAreaComparison(result.input.store, result.input.competitors);
    assert.equal(again?.pins.length, 2);
  });
});
