import { describe, expect, test } from "vitest";
import { shortShopHash } from "@/lib/scoreHistory";
import { COHORT_MIN_COUNT } from "./constants";
import {
  applyDelta,
  cohortTotalKeys,
  emptyTotals,
  parseCohortPublic,
  prepareCohortWrite,
  toPublicSummary,
  type CohortObservation,
} from "./public";
import { parseCohortRegion } from "./region";
import {
  DisabledCohortStore,
  MemoryCohortStore,
  totalsFromHash,
  totalsOnlyHaveAggregateFields,
} from "./store";
import { publishCohort, shouldRecordCohort } from "./service";

const secrets = {
  name: "秘密食堂",
  mapsUrl: "https://maps.google.com/secret-shop",
  placeId: "ChIJsecretplaceidvalue",
  phone: "0266-12-3456",
  reviewText: "秘密の口コミ本文です",
  street: "長地柴宮2-5-65",
};

function observation(patch: Partial<CohortObservation> = {}): CohortObservation {
  return {
    category: "食堂",
    address: "長野県岡谷市長地柴宮2-5-65",
    score: 50,
    rating: 4,
    reviewCount: 40,
    hasOwnerReplies: false,
    ruleVersion: "1.0",
    ...patch,
  };
}

describe("地域の粒度", () => {
  test("番地は落とし、市区町村まで取る。無ければ都道府県", () => {
    expect(parseCohortRegion("長野県岡谷市長地柴宮2-5-65")?.label).toBe(
      "長野県岡谷市",
    );
    expect(
      parseCohortRegion("日本、〒394-0021 長野県岡谷市長地柴宮２丁目５−６５")
        ?.label,
    ).toBe("長野県岡谷市");
    expect(parseCohortRegion("東京都渋谷区神南1-1-1")?.label).toBe("東京都渋谷区");
    expect(parseCohortRegion("北海道札幌市中央区北1条")?.label).toBe(
      "北海道札幌市",
    );
    expect(parseCohortRegion("長野県")?.label).toBe("長野県");
    expect(parseCohortRegion("岡谷市")).toBeNull();
    expect(parseCohortRegion("（デモデータ）")).toBeNull();
  });
});

describe("集計の保存", () => {
  test("しきい値未満では比較の数字を作らない", async () => {
    const store = new MemoryCohortStore();
    let last = await publishCohort({ ...observation(), record: true, store });
    for (let i = 1; i < COHORT_MIN_COUNT - 1; i++) {
      last = await publishCohort({
        ...observation({ score: 50, hasOwnerReplies: i % 2 === 0 }),
        record: true,
        store,
      });
    }
    expect(last).toEqual({ show: false });
    expect(JSON.stringify(last)).toBe('{"show":false}');
    const hidden = toPublicSummary(
      applyDelta(emptyTotals(), {
        score: 80,
        ratingTenths: 40,
        reviewCount: 10,
        replyYes: 0,
        replyKnown: 0,
      }),
      80,
      { categoryLabel: "食堂", regionLabel: "長野県岡谷市" },
    );
    expect(JSON.stringify(hidden)).toBe('{"show":false}');
  });

  test("しきい値に達したときだけ上位%と平均を返す", async () => {
    const store = new MemoryCohortStore();
    let last;
    for (let i = 0; i < COHORT_MIN_COUNT; i++) {
      last = await publishCohort({
        ...observation({
          score: i === COHORT_MIN_COUNT - 1 ? 80 : 50,
          hasOwnerReplies: i % 2 === 0,
        }),
        record: true,
        store,
      });
    }
    expect(last?.show).toBe(true);
    if (!last || !last.show) throw new Error("expected summary");
    expect(last.sampleCount).toBe(COHORT_MIN_COUNT);
    expect(last.averageScore).toBe(51);
    expect(last.topPercent).toBe(4);
    expect(last.averageRating).toBe(4);
    expect(last.averageReviewCount).toBe(40);
    expect(last.replyShare).toBe(0.5);
    expect(last.categoryLabel).toBe("食堂");
    expect(last.regionLabel).toBe("長野県岡谷市");
  });

  test("保存する集計に個別を特定する情報は無い", async () => {
    const leaked = {
      ...observation({ score: 68, rating: 4.2, reviewCount: 45, hasOwnerReplies: true }),
      ...secrets,
    };
    const prepared = prepareCohortWrite(leaked);
    expect(prepared).not.toBeNull();
    if (!prepared) return;
    const store = new MemoryCohortStore();
    const totals = await store.add(prepared.key, prepared.delta);
    const dumped = `${prepared.key}\n${store.dump()}\n${JSON.stringify(prepared.delta)}`;
    expect(dumped).not.toContain(secrets.name);
    expect(dumped).not.toContain("maps.google");
    expect(dumped).not.toContain(secrets.placeId);
    expect(dumped).not.toContain("0266");
    expect(dumped).not.toContain("口コミ本文");
    expect(dumped).not.toContain("柴宮");
    expect(dumped).not.toContain("2-5-65");
    expect(dumped).not.toContain(shortShopHash(secrets.name));
    expect(decodeURIComponent(prepared.key)).toContain("長野県岡谷市");
    expect(decodeURIComponent(prepared.key)).toContain("食堂");
    expect(totalsOnlyHaveAggregateFields(totals)).toBe(true);
    expect(Object.keys(totals).sort()).toEqual([...cohortTotalKeys()].sort());
    expect(JSON.stringify(totals)).not.toContain("name");
  });

  test("返信の有無が足りなければ返信の割合は出さない", () => {
    let totals = emptyTotals();
    for (let i = 0; i < COHORT_MIN_COUNT; i++) {
      totals = applyDelta(totals, {
        score: 60,
        ratingTenths: 42,
        reviewCount: 20,
        replyYes: 0,
        replyKnown: i < 5 ? 1 : 0,
      });
    }
    const pub = toPublicSummary(totals, 60, {
      categoryLabel: "食堂",
      regionLabel: "長野県",
    });
    expect(pub.show).toBe(true);
    if (!pub.show) return;
    expect(pub.replyShare).toBeNull();
    expect(JSON.stringify(pub)).not.toMatch(/\d+%/);
  });

  test("無効な保存先では数字を出さない", async () => {
    const store = new DisabledCohortStore();
    for (let i = 0; i < COHORT_MIN_COUNT + 5; i++) {
      const pub = await publishCohort({
        ...observation(),
        record: true,
        store,
      });
      expect(pub).toEqual({ show: false });
    }
    expect(await store.read("rc:cohort:v1:anything")).toBeNull();
  });

  test("参照だけでは件数を増やさない", async () => {
    const store = new MemoryCohortStore();
    for (let i = 0; i < COHORT_MIN_COUNT; i++) {
      await publishCohort({ ...observation(), record: true, store });
    }
    const read = await publishCohort({
      ...observation({ score: 80 }),
      record: false,
      store,
    });
    expect(read.show).toBe(true);
    if (!read.show) return;
    expect(read.sampleCount).toBe(COHORT_MIN_COUNT);
    const again = await publishCohort({
      ...observation(),
      record: false,
      store,
    });
    if (!again.show) throw new Error("expected summary");
    expect(again.sampleCount).toBe(COHORT_MIN_COUNT);
  });

  test("Redisのハッシュからも識別子の入る余地は数値フィールドだけ", () => {
    const totals = totalsFromHash({
      n: "30",
      scoreSum: "1800",
      ratingTenthsSum: "1200",
      reviewCountSum: "900",
      replyYes: "10",
      replyKnown: "30",
      b60: "30",
      name: "秘密食堂",
      placeId: "ChIJsecretplaceidvalue",
    });
    expect(totals?.n).toBe(30);
    expect(JSON.stringify(totals)).not.toContain("秘密食堂");
    expect(JSON.stringify(totals)).not.toContain("ChIJ");
  });

  test("画面に渡す前に、しきい値未満の数字を捨てる", () => {
    expect(
      parseCohortPublic({
        show: true,
        sampleCount: COHORT_MIN_COUNT - 1,
        topPercent: 10,
        averageScore: 80,
        averageRating: 4.2,
        averageReviewCount: 10,
        regionLabel: "長野県岡谷市",
        categoryLabel: "食堂",
      }),
    ).toEqual({ show: false });
    expect(
      parseCohortPublic({ show: false, averageScore: 99, topPercent: 1 }),
    ).toEqual({ show: false });
  });

  test("記録してよいのはPlacesの実測だけ", () => {
    expect(
      shouldRecordCohort({ demo: false, source: "places", manualTouch: false }),
    ).toBe(true);
    expect(
      shouldRecordCohort({ demo: true, source: "places", manualTouch: false }),
    ).toBe(false);
    expect(
      shouldRecordCohort({ demo: false, source: "mock", manualTouch: false }),
    ).toBe(false);
    expect(
      shouldRecordCohort({ demo: false, source: "manual", manualTouch: false }),
    ).toBe(false);
    expect(
      shouldRecordCohort({ demo: false, source: "places", manualTouch: true }),
    ).toBe(false);
  });

  test("採点ルールの版が違う集計は混ぜない", () => {
    const a = prepareCohortWrite(observation({ ruleVersion: "1.0" }));
    const b = prepareCohortWrite(observation({ ruleVersion: "1.1" }));
    expect(a?.key).not.toBe(b?.key);
  });
});
