import { describe, expect, test } from "vitest";
import { encodePlaceReportId, encodeReportId } from "@reviewcheck/core";
import { isPreviewRequest } from "./previewRequest";
import { reportLoadPlan } from "./reportLoadPlan";

function headers(values: Record<string, string>): { get(name: string): string | null } {
  const map = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => map.get(name.toLowerCase()) ?? null };
}

describe("プレビューは Places を呼ばない", () => {
  test("クローラ・空のUA・文書以外はプレビュー", () => {
    expect(
      isPreviewRequest(
        headers({
          "user-agent": "Mozilla/5.0",
          "sec-fetch-dest": "document",
        }),
      ),
    ).toBe(false);
    expect(
      isPreviewRequest(headers({ "user-agent": "facebookexternalhit/1.1" })),
    ).toBe(true);
    expect(isPreviewRequest(headers({ "user-agent": "" }))).toBe(true);
    expect(
      isPreviewRequest(
        headers({
          "user-agent": "Mozilla/5.0",
          "sec-fetch-dest": "image",
        }),
      ),
    ).toBe(true);
    expect(
      isPreviewRequest(
        headers({
          "user-agent": "Mozilla/5.0",
          purpose: "prefetch",
          "sec-fetch-dest": "document",
        }),
      ),
    ).toBe(true);
  });

  test("プレビューと古い点数は、取り直しの引数に入らない", () => {
    const placeId = "ChIJbrowser";
    const id = encodePlaceReportId(placeId);
    expect(reportLoadPlan(id, true)).toEqual({ fetch: false, reason: "preview" });
    expect(reportLoadPlan(id, false)).toEqual({ fetch: true, placeId });

    const legacy = encodeReportId({
      store: {
        name: "古い店",
        rating: 3.2,
        reviewCount: 10,
        placeId: "ChIJlegacy",
        lat: 35,
        lng: 139,
        source: "places",
      },
      competitors: [],
      diagnosedAt: "2026-01-01T00:00:00.000Z",
      ruleVersion: "1.0",
    });
    const plan = reportLoadPlan(legacy, false);
    expect(plan).toEqual({ fetch: true, placeId: "ChIJlegacy" });
    expect(JSON.stringify(plan)).not.toContain("3.2");
    expect(JSON.stringify(plan)).not.toContain("古い店");

    const noPlace = encodeReportId({
      store: { name: "手入力", rating: 4, reviewCount: 1, source: "manual" },
      competitors: [],
      diagnosedAt: "2026-01-01T00:00:00.000Z",
      ruleVersion: "1.0",
    });
    expect(reportLoadPlan(noPlace, false)).toEqual({ fetch: false, reason: "no-place" });
  });
});
