import { describe, expect, test } from "vitest";
import type { AreaMapPin } from "@reviewcheck/core/areaMap";
import {
  MAP_LABEL_ATTRIBUTION_RESERVE,
  connectorSegment,
  mapLabelHtml,
  overlapArea,
  placeMapLabels,
  zoomReserve,
  type MapPoint,
} from "./labelLayout";

function pin(partial: Partial<AreaMapPin> & Pick<AreaMapPin, "kind" | "name">): AreaMapPin {
  return {
    id: partial.id ?? partial.name,
    lat: partial.lat ?? 36,
    lng: partial.lng ?? 138,
    kind: partial.kind,
    mark: partial.mark ?? (partial.kind === "subject" ? "自" : "1"),
    label: partial.label ?? "",
    name: partial.name,
    rating: partial.rating ?? 4,
    reviewCount: partial.reviewCount ?? 45,
    reviewCountRank: partial.reviewCountRank ?? 1,
  };
}

describe("placeMapLabels", () => {
  test("近い5店でもラベルは重ならず、ズームと帰属を避け、地図の中に収まる", () => {
    const map = { w: 360, h: 384 };
    const points: MapPoint[] = [
      { x: 130, y: 190, subject: true },
      { x: 148, y: 176 },
      { x: 116, y: 206 },
      { x: 154, y: 208 },
      { x: 122, y: 164 },
    ];
    const placed = placeMapLabels({
      points,
      labelSizes: points.map(() => ({ w: 148, h: 52 })),
      map,
    });
    expect(placed).toHaveLength(5);
    const attribution = {
      x: map.w - MAP_LABEL_ATTRIBUTION_RESERVE.w,
      y: map.h - MAP_LABEL_ATTRIBUTION_RESERVE.h,
      w: MAP_LABEL_ATTRIBUTION_RESERVE.w,
      h: MAP_LABEL_ATTRIBUTION_RESERVE.h,
    };
    for (let i = 0; i < placed.length; i += 1) {
      const box = placed[i]!.box;
      expect(box.x).toBeGreaterThanOrEqual(2);
      expect(box.y).toBeGreaterThanOrEqual(2);
      expect(box.x + box.w).toBeLessThanOrEqual(map.w - 2);
      expect(box.y + box.h).toBeLessThanOrEqual(map.h - 2);
      expect(overlapArea(box, zoomReserve(map))).toBe(0);
      expect(overlapArea(box, attribution)).toBe(0);
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(overlapArea(box, placed[j]!.box)).toBe(0);
      }
    }
    expect(placed.some((item) => item.direction)).toBe(true);
  });

  test("広い画面で離れた店も、ラベルを地図の外へ出さない", () => {
    const map = { w: 1100, h: 320 };
    const points: MapPoint[] = [
      { x: 220, y: 90, subject: true },
      { x: 860, y: 90 },
      { x: 220, y: 230 },
      { x: 860, y: 230 },
      { x: 540, y: 160 },
    ];
    const placed = placeMapLabels({
      points,
      labelSizes: points.map(() => ({ w: 200, h: 56 })),
      map,
    });
    for (const item of placed) {
      expect(item.box.x).toBeGreaterThanOrEqual(2);
      expect(item.box.y).toBeGreaterThanOrEqual(2);
      expect(item.box.x + item.box.w).toBeLessThanOrEqual(map.w - 2);
      expect(item.box.y + item.box.h).toBeLessThanOrEqual(map.h - 2);
      expect(overlapArea(item.box, zoomReserve(map))).toBe(0);
    }
  });

  test("390px幅の地図でも、実寸のラベルが枠内で重ならない", () => {
    const map = { w: 316, h: 544 };
    const points: MapPoint[] = [
      { x: 150, y: 190, subject: true },
      { x: 168, y: 176 },
      { x: 136, y: 206 },
      { x: 174, y: 208 },
      { x: 142, y: 164 },
    ];
    const placed = placeMapLabels({
      points,
      labelSizes: points.map((point) => ({ w: 140, h: point.subject ? 126 : 81 })),
      map,
    });
    for (let i = 0; i < placed.length; i += 1) {
      const box = placed[i]!.box;
      expect(box.x).toBeGreaterThanOrEqual(160);
      expect(box.y).toBeGreaterThanOrEqual(2);
      expect(box.x + box.w).toBeLessThanOrEqual(map.w - 2);
      expect(box.y + box.h).toBeLessThanOrEqual(map.h - 2);
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(overlapArea(box, placed[j]!.box)).toBe(0);
      }
    }
  });

  test("同じ座標の2店は別のラベル位置になる", () => {
    const placed = placeMapLabels({
      points: [
        { x: 180, y: 160, subject: true },
        { x: 180, y: 160 },
      ],
      labelSizes: [
        { w: 140, h: 64 },
        { w: 140, h: 52 },
      ],
      map: { w: 390, h: 384 },
    });
    expect(overlapArea(placed[0]!.box, placed[1]!.box)).toBe(0);
  });
});

describe("connectorSegment", () => {
  test("ラベルが離れているとき、線はピンの円の外からラベルの縁へ向かう", () => {
    const segment = connectorSegment(
      { x: 100, y: 100 },
      { x: 160, y: 80, w: 140, h: 52 },
    );
    expect(segment).not.toBeNull();
    const from = segment!.from;
    expect(Math.hypot(from.x - 100, from.y - 100)).toBeCloseTo(20, 5);
    expect(from.x).toBeGreaterThan(100);
  });

  test("ラベルがピンに接しているときは線を出さない", () => {
    expect(
      connectorSegment({ x: 40, y: 40 }, { x: 48, y: 10, w: 80, h: 40 }),
    ).toBeNull();
  });
});

describe("mapLabelHtml", () => {
  test("診断店は名前・星・口コミ数・順位と「診断したお店」を、クリックなしの文として出す", () => {
    const html = mapLabelHtml(
      pin({
        kind: "subject",
        name: "麺屋<script>",
        rating: 3.9,
        reviewCount: 264,
        reviewCountRank: 2,
      }),
    );
    expect(html).toContain("麺屋&lt;script&gt;");
    expect(html).toContain("診断したお店");
    expect(html).toContain("星3.9");
    expect(html).toContain("口コミ264件");
    expect(html).toContain("第2位");
    expect(html).not.toMatch(/無料|必ず|保証|今すぐ|緊急/);
  });

  test("周辺店のラベルに診断店の呼び名は付けない", () => {
    const html = mapLabelHtml(
      pin({ kind: "peer", name: "湊店", rating: 4, reviewCount: 10, reviewCountRank: 3 }),
    );
    expect(html).toContain("湊店");
    expect(html).toContain("第3位");
    expect(html).not.toContain("診断したお店");
  });
});
