import type { AreaMapPin } from "@reviewcheck/core/areaMap";

/** ズームボタンは左上。ラベルを重ねない。 */
export function zoomReserve(_map: { w: number }): LabelBox {
  return { x: 0, y: 0, w: 52, h: 90 };
}
/** 右下の帰属表示にラベルを重ねないための空き。幅は地図の右端から取る。 */
export const MAP_LABEL_ATTRIBUTION_RESERVE = { w: 180, h: 28 } as const;

export type LabelDirection = "top" | "right" | "bottom" | "left";

export interface MapPoint {
  x: number;
  y: number;
  subject?: boolean;
}

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedLabel {
  direction: LabelDirection;
  /** Leaflet tooltip の offset。ピン中心から、direction の置き方に合わせる。 */
  offset: [number, number];
  box: LabelBox;
}

const GAP = 22;
const PUSHES = [0, 36, 72, 120, 168];
const PERPS = [0, -56, 56, -112, 112];
const DIRS: LabelDirection[] = ["right", "left", "bottom", "top"];

/**
 * 近いピンでも店名が見えるよう、ラベルをピンの四方へずらして重なりを減らす。
 * 戻り値の box は Leaflet の tooltip（direction + offset）と同じ位置。
 */
export function placeMapLabels(input: {
  points: MapPoint[];
  labelSizes: { w: number; h: number }[];
  map: { w: number; h: number };
}): PlacedLabel[] {
  const searched = searchPlacements(input);
  const packed = packColumns(input);
  if (!packed) return searched;
  // 狭い画面は右列に固定し、左をピンの場所として残す。
  if (input.map.w < 560) return packed;
  return totalOverlap(packed) < totalOverlap(searched) ? packed : searched;
}

function searchPlacements(input: {
  points: MapPoint[];
  labelSizes: { w: number; h: number }[];
  map: { w: number; h: number };
}): PlacedLabel[] {
  const { points, labelSizes, map } = input;
  const placed: PlacedLabel[] = new Array(points.length);
  const boxes: Array<LabelBox | undefined> = new Array(points.length);
  const order = points
    .map((point, index) => ({ index, point }))
    .sort((a, b) => {
      if (Boolean(a.point.subject) !== Boolean(b.point.subject)) {
        return a.point.subject ? -1 : 1;
      }
      if (a.point.y !== b.point.y) return a.point.y - b.point.y;
      return a.point.x - b.point.x;
    });

  for (const { index } of order) {
    const size = labelSizes[index] ?? { w: 160, h: 56 };
    let best: PlacedLabel | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const direction of DIRS) {
      for (const push of PUSHES) {
        for (const perp of PERPS) {
          const offset = offsetFor(direction, push, perp);
          const box = boxFor(points[index]!, direction, offset, size);
          const score = penalty(box, index, points, boxes, map, push, perp);
          if (score < bestScore) {
            bestScore = score;
            best = { direction, offset, box };
          }
        }
      }
    }
    const chosen = best ?? {
      direction: "right" as const,
      offset: [GAP, 0] as [number, number],
      box: boxFor(points[index]!, "right", [GAP, 0], size),
    };
    placed[index] = chosen;
    boxes[index] = chosen.box;
  }
  return placed;
}

/** ピンからラベルの縁まで。ラベルがピンに接しているときは null（線は要らない）。 */
export function connectorSegment(
  pin: MapPoint,
  box: LabelBox,
  radius = 20,
): { from: MapPoint; to: MapPoint } | null {
  const edge = {
    x: clamp(pin.x, box.x, box.x + box.w),
    y: clamp(pin.y, box.y, box.y + box.h),
  };
  const dx = edge.x - pin.x;
  const dy = edge.y - pin.y;
  const len = Math.hypot(dx, dy);
  if (len < radius + 8) return null;
  return {
    from: { x: pin.x + (dx / len) * radius, y: pin.y + (dy / len) * radius },
    to: edge,
  };
}

/** クリックしなくても読めるラベル。数字は診断が既に持っている値だけ。 */
export function mapLabelHtml(pin: AreaMapPin): string {
  const name = escapeHtml(pin.name);
  const facts = `星${pin.rating.toFixed(1)}　口コミ${pin.reviewCount}件　第${pin.reviewCountRank}位`;
  const role =
    pin.kind === "subject"
      ? `<span class="area-map-label-role">診断したお店</span>`
      : "";
  return `<span class="area-map-label-name">${name}</span>${role}<span class="area-map-label-facts">${escapeHtml(facts)}</span>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function offsetFor(
  direction: LabelDirection,
  push: number,
  perp: number,
): [number, number] {
  const gap = GAP + push;
  switch (direction) {
    case "right":
      return [gap, perp];
    case "left":
      return [-gap, perp];
    case "top":
      return [perp, -gap];
    case "bottom":
      return [perp, gap];
  }
}

/** Leaflet Tooltip._setPosition と同じ、要素の左上。 */
export function boxFor(
  point: MapPoint,
  direction: LabelDirection,
  offset: [number, number],
  size: { w: number; h: number },
): LabelBox {
  const [ox, oy] = offset;
  if (direction === "right") {
    return { x: point.x + ox, y: point.y + oy - size.h / 2, w: size.w, h: size.h };
  }
  if (direction === "left") {
    return { x: point.x + ox - size.w, y: point.y + oy - size.h / 2, w: size.w, h: size.h };
  }
  if (direction === "top") {
    return { x: point.x + ox - size.w / 2, y: point.y + oy - size.h, w: size.w, h: size.h };
  }
  return { x: point.x + ox - size.w / 2, y: point.y + oy, w: size.w, h: size.h };
}

function penalty(
  box: LabelBox,
  index: number,
  points: MapPoint[],
  boxes: Array<LabelBox | undefined>,
  map: { w: number; h: number },
  push: number,
  perp: number,
): number {
  let score = push * 0.35 + Math.abs(perp) * 0.15;
  score += outside(box, map) * 800;
  score += overlapArea(box, zoomReserve(map)) * 40;
  score +=
    overlapArea(box, {
      x: map.w - MAP_LABEL_ATTRIBUTION_RESERVE.w,
      y: map.h - MAP_LABEL_ATTRIBUTION_RESERVE.h,
      w: MAP_LABEL_ATTRIBUTION_RESERVE.w,
      h: MAP_LABEL_ATTRIBUTION_RESERVE.h,
    }) * 30;
  for (let other = 0; other < points.length; other += 1) {
    const otherBox = boxes[other];
    if (otherBox) score += overlapArea(box, otherBox) * 20;
    const pin = points[other]!;
    const keepout = {
      x: pin.x - 20,
      y: pin.y - 20,
      w: 40,
      h: 40,
    };
    const weight = other === index ? 8 : 12;
    score += overlapArea(box, keepout) * weight;
  }
  return score;
}

function packColumns(input: {
  points: MapPoint[];
  labelSizes: { w: number; h: number }[];
  map: { w: number; h: number };
}): PlacedLabel[] | null {
  const { points, labelSizes, map } = input;
  if (points.length === 0) return [];
  const margin = 8;
  const gap = 6;
  const labelW = Math.max(...labelSizes.map((size) => size.w));
  const rightX = map.w - margin - labelW;
  if (rightX < margin) return null;
  // 狭い画面は右の1列だけにして、左にピンの場所を残す。
  const columns =
    map.w < 560
      ? [{ x: rightX, y: margin }]
      : [
          { x: margin, y: margin },
          { x: rightX, y: margin },
        ];
  if (columns.length === 2 && rightX < margin + labelW + gap) return null;
  const placed: PlacedLabel[] = new Array(points.length);
  const order = points
    .map((point, index) => ({ index, point }))
    .sort((a, b) => {
      if (Boolean(a.point.subject) !== Boolean(b.point.subject)) {
        return a.point.subject ? -1 : 1;
      }
      return a.point.y - b.point.y;
    });

  for (const { index, point } of order) {
    const height = labelSizes[index]?.h ?? 56;
    let bestColumn = -1;
    let bestY = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    columns.forEach((column, columnIndex) => {
      const y = nextFreeY(column.y, column.x, labelW, height, map);
      if (y + height > map.h - margin) return;
      const dist = Math.abs(point.x - (column.x + labelW / 2));
      const score = y + dist * 0.2 + columnIndex * 0.01;
      if (score < bestScore) {
        bestScore = score;
        bestColumn = columnIndex;
        bestY = y;
      }
    });
    if (bestColumn < 0) return null;
    const column = columns[bestColumn]!;
    const box = { x: column.x, y: bestY, w: labelW, h: height };
    placed[index] = placementFromBox(point, box);
    column.y = bestY + height + gap;
  }
  return placed;
}

function nextFreeY(
  start: number,
  x: number,
  w: number,
  h: number,
  map: { w: number; h: number },
): number {
  let y = start;
  const blocked = [
    zoomReserve(map),
    {
      x: map.w - MAP_LABEL_ATTRIBUTION_RESERVE.w,
      y: map.h - MAP_LABEL_ATTRIBUTION_RESERVE.h,
      w: MAP_LABEL_ATTRIBUTION_RESERVE.w,
      h: MAP_LABEL_ATTRIBUTION_RESERVE.h,
    },
  ];
  for (let guard = 0; guard < 4; guard += 1) {
    const box = { x, y, w, h };
    const hit = blocked.find((area) => overlapArea(box, area) > 0);
    if (!hit) return y;
    y = hit.y + hit.h + 6;
  }
  return y;
}

function placementFromBox(point: MapPoint, box: LabelBox): PlacedLabel {
  return {
    direction: "right",
    offset: [box.x - point.x, box.y + box.h / 2 - point.y],
    box,
  };
}

function totalOverlap(placed: PlacedLabel[]): number {
  let score = 0;
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      score += overlapArea(placed[i]!.box, placed[j]!.box);
    }
  }
  return score;
}

function outside(box: LabelBox, map: { w: number; h: number }): number {
  const margin = 8;
  return (
    Math.max(0, margin - box.x) +
    Math.max(0, margin - box.y) +
    Math.max(0, box.x + box.w - (map.w - margin)) +
    Math.max(0, box.y + box.h - (map.h - margin))
  );
}

export function overlapArea(a: LabelBox, b: LabelBox): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
