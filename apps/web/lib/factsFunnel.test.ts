import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { acceptFunnelBody, funnelStorageKey } from "./funnelEvents";
import { retentionCleanupPlan } from "./retentionPlan";
import { measuredProfileGaps, supportOffersForPlaces } from "./supportOffers";
import { buildFactsShareText } from "./resultCopy";
import {
  PLACES_FIXTURE_PLACE_ID,
  PLACES_FIXTURE_TEXT,
  buildPlacesFixtureResult,
  isPlacesFixtureRequest,
} from "./placesFixture";

describe("事実表示と到達カウント", () => {
  test("未取得の写真を欠けとして数えない", () => {
    expect(
      measuredProfileGaps({
        phone: "03-0000-0000",
        website: "https://example.com",
        hasOpeningHours: true,
      }),
    ).toEqual([]);
    expect(measuredProfileGaps({ phone: "", website: "", hasOpeningHours: false })).toEqual([
      "電話",
      "ウェブサイト",
      "営業時間",
    ]);
  });

  test("相談リンクに店名と点数を付けず、監視は売らない", () => {
    const offers = supportOffersForPlaces({ phone: "", website: "", hasOpeningHours: false });
    expect(offers.map((offer) => offer.key)).toEqual(["consult", "improvement", "meo"]);
    for (const offer of offers) {
      expect(offer.href).not.toContain("score");
      expect(offer.href).not.toContain("store=");
      expect(offer.href).not.toContain("partner.");
      expect(`${offer.price}${offer.detail}`).not.toMatch(/1時間\s*5,?000|見積.*3日/);
    }
    expect(buildFactsShareText()).not.toMatch(/\d+点/);
    expect(buildFactsShareText()).not.toContain("「");
  });

  test("到達カウントは店名と点数を拒み、購入とは呼ばない", () => {
    expect(acceptFunnelBody({ event: "diagnosis_start" })?.event).toBe("diagnosis_start");
    expect(acceptFunnelBody({ event: "cta", slot: "consult" })?.slot).toBe("consult");
    expect(acceptFunnelBody({ event: "apply", slot: "monitoring" })).toBeNull();
    expect(
      acceptFunnelBody({ event: "diagnosis_complete", placeId: "abc", score: 80 }),
    ).toBeNull();
    expect(funnelStorageKey({ event: "apply", slot: "consult" })).toBe(
      "rc:funnel:v1:apply:consult",
    );
    expect(funnelStorageKey({ event: "diagnosis_complete" })).not.toContain("purchase");
  });

  test("固定のGoogle応答は、環境変数が無いと返さない", () => {
    const previous = process.env.REVIEWCHECK_PLACES_FIXTURE;
    delete process.env.REVIEWCHECK_PLACES_FIXTURE;
    expect(
      isPlacesFixtureRequest({ text: PLACES_FIXTURE_TEXT, placeId: PLACES_FIXTURE_PLACE_ID }),
    ).toBe(false);
    process.env.REVIEWCHECK_PLACES_FIXTURE = "1";
    expect(isPlacesFixtureRequest({ text: PLACES_FIXTURE_TEXT })).toBe(true);
    const result = buildPlacesFixtureResult();
    expect(result.input.store.source).toBe("places");
    expect(result.input.store.name).toContain("架空");
    expect(result.kind).toBe("facts");
    expect(result.placesAttributed).toBe(true);
    expect("score" in result).toBe(false);
    expect(result.input.store.hasPhotos).toBeUndefined();
    expect(result.input.store.hasOwnerReplies).toBeUndefined();
    if (previous === undefined) delete process.env.REVIEWCHECK_PLACES_FIXTURE;
    else process.env.REVIEWCHECK_PLACES_FIXTURE = previous;
  });

  test("削除計画は実行できない", () => {
    const plan = retentionCleanupPlan();
    expect(plan.executable).toBe(false);
    expect(plan.patterns).toContain("rc:store:v1:*");
    expect(plan.patterns).toContain("mc:snapshot:*");
  });

  test("新規の監視申込は有効化もログも決済もしない", () => {
    const signup = readFileSync(join(process.cwd(), "app/api/monitor/signup/route.ts"), "utf8");
    expect(signup).toContain("paused: true");
    expect(signup).not.toContain("createMonitoringPaymentLink");
    expect(signup).not.toContain("console.log");
    const webhook = readFileSync(
      join(process.cwd(), "app/api/stripe/monitor-webhook/route.ts"),
      "utf8",
    );
    expect(webhook).not.toContain("enabled: true");
    expect(webhook).not.toContain("有効化しました");
    expect(webhook).toContain("返金は、この処理では行っていません");
    const targets = readFileSync(join(process.cwd(), "app/api/monitor/targets/route.ts"), "utf8");
    expect(targets).toContain("paused: true");
    expect(targets).not.toContain("enabled: true");
  });
});
