import { MAX_COMPETITORS } from "../competitor/index";
import type { Competitor, StoreInput } from "../types/index";
import { distanceMeters, readPoint, type PublicPoint } from "../utils/geo";

/** 結果文に置かない語。画面の固定文もこの一覧で検査する。 */
export const AREA_COPY_BANNED = ["無料", "必ず", "保証", "今すぐ", "緊急"] as const;

export interface AreaPlace {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  /** 口コミ数の順位。1 が最多。同数は同順位（1, 1, 3）。 */
  reviewCountRank: number;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  /** 診断したお店からの距離（メートル）。座標が無い、または診断店自身は undefined。 */
  distanceMeters?: number;
  isSubject: boolean;
}

/** 地図ピン。座標がある店だけ。診断店の座標が無ければ空。 */
export interface AreaMapPin {
  id: string;
  lat: number;
  lng: number;
  kind: "subject" | "peer";
  /** 診断店は「自」。周辺店は順位の数字。色ではなく形と文字で区別する。 */
  mark: string;
  label: string;
}

export interface AreaComparison {
  places: AreaPlace[];
  total: number;
  /** 診断店を含む口コミ数の中央値。偶数件のときは中央2件の平均。 */
  medianReviewCount: number;
  /**
   * 診断店の件数が、いまの中央値以上になるまでに必要な件数。
   * 既に届いていれば 0。中央値そのものは足す前の並びで固定する。
   */
  reviewsToReachMedian: number;
  pins: AreaMapPin[];
}

/**
 * 診断で既に持っている店だけで、エリア比較の一覧・順位・中央値・ピンを作る。
 * 競合が無ければ null。新しい件数は作らない。
 */
export function buildAreaComparison(
  store: StoreInput | undefined,
  competitors: Competitor[] | undefined,
): AreaComparison | null {
  if (!store || !Number.isFinite(store.rating) || !Number.isFinite(store.reviewCount)) {
    return null;
  }
  const peers = (competitors ?? [])
    .slice(0, MAX_COMPETITORS)
    .filter((c) => Number.isFinite(c.rating) && Number.isFinite(c.reviewCount));
  if (peers.length === 0) return null;

  const subjectPoint = readPoint(store.lat, store.lng);
  const draft: AreaPlace[] = [
    toPlace(store, subjectPoint, true, store.placeId ?? "subject"),
    ...peers.map((peer, index) =>
      toPlace(
        peer,
        readPoint(peer.lat, peer.lng),
        false,
        `${peer.placeId ?? "peer"}:${index}`,
      ),
    ),
  ];

  const counts = draft.map((place) => place.reviewCount);
  const places = draft
    .map((place) => ({
      ...place,
      reviewCountRank: rankOf(place.reviewCount, counts),
      distanceMeters: distanceFromSubject(subjectPoint, place),
    }))
    .sort(byReviewCount);

  const medianReviewCount = median(counts);
  const reviewsToReachMedian =
    store.reviewCount >= medianReviewCount
      ? 0
      : Math.ceil(medianReviewCount - store.reviewCount);

  return {
    places,
    total: places.length,
    medianReviewCount,
    reviewsToReachMedian,
    pins: mapPins(places, subjectPoint != null),
  };
}

/**
 * 一覧の範囲。検索半径そのものではなく、いま並んでいる店のいちばん遠い距離。
 * 密集地は近く、まばらな地域は広くなり、1回の検索の上限は20件。
 */
export function areaScopeMessage(area: Pick<AreaComparison, "places">): string {
  let farthest = 0;
  let seen = false;
  for (const place of area.places) {
    if (place.isSubject || place.distanceMeters == null) continue;
    if (!seen || place.distanceMeters > farthest) {
      farthest = place.distanceMeters;
      seen = true;
    }
  }
  const reach = seen
    ? `いま並んでいるお店は、診断したお店から${formatDistanceMeters(farthest)}までの範囲です。`
    : "";
  return `${reach}同じ種類のお店を、その業種でお客さんが来る範囲から探しています。店が密集している場所では近い店が並び、まばらな場所ではより広い範囲が並びます。1回の検索で返るのは最大20件です。`;
}

/** 中央値と、そこに届く件数の目安。結果画面の一文。 */
export function areaMedianMessage(
  area: Pick<AreaComparison, "medianReviewCount" | "reviewsToReachMedian">,
): string {
  const medianLabel = formatReviewCount(area.medianReviewCount);
  if (area.reviewsToReachMedian <= 0) {
    return `このエリアの口コミ数の中央値は${medianLabel}件です。いまの件数は中央値に届いています。来店前に見比べる人への材料は、いま中央値まで揃っています。`;
  }
  return `このエリアの口コミ数の中央値は${medianLabel}件です。あと${area.reviewsToReachMedian}件が、中央値に届く目安です。来店前に見比べる人への材料が、その件数まで揃います。`;
}

export function areaCopyIssues(text: string): string[] {
  return AREA_COPY_BANNED.filter((word) => text.includes(word));
}

export function formatReviewCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

/** 距離の表示。測れていないときは null（呼び出し側が「未取得」と書く）。 */
export function formatDistanceMeters(meters: number | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  if (km < 10) {
    return `${(Math.round(km * 10) / 10).toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

function toPlace(
  source: Pick<StoreInput, "name" | "rating" | "reviewCount" | "mapsUrl" | "placeId">,
  point: PublicPoint | null,
  isSubject: boolean,
  id: string,
): AreaPlace {
  return {
    id: isSubject ? `subject:${id}` : `peer:${id}`,
    name: source.name?.trim() || (isSubject ? "診断したお店" : "周辺のお店"),
    rating: source.rating,
    reviewCount: source.reviewCount,
    ...(source.mapsUrl ? { mapsUrl: source.mapsUrl } : {}),
    ...(point ? { lat: point.lat, lng: point.lng } : {}),
    isSubject,
    reviewCountRank: 0,
  };
}

function distanceFromSubject(
  subject: PublicPoint | null,
  place: AreaPlace,
): number | undefined {
  if (place.isSubject || !subject || place.lat == null || place.lng == null) return undefined;
  return distanceMeters(subject, { lat: place.lat, lng: place.lng });
}

/** 診断店のピンが無い地図は出さない。周辺だけを地図にすると、順位の根拠に見えない。 */
function mapPins(places: AreaPlace[], subjectHasPoint: boolean): AreaMapPin[] {
  if (!subjectHasPoint) return [];
  const pins: AreaMapPin[] = [];
  for (const place of places) {
    if (place.lat == null || place.lng == null) continue;
    pins.push({
      id: place.id,
      lat: place.lat,
      lng: place.lng,
      kind: place.isSubject ? "subject" : "peer",
      mark: place.isSubject ? "自" : String(place.reviewCountRank),
      label: `${place.isSubject ? "診断したお店 " : ""}${place.name} 星${place.rating.toFixed(1)} 口コミ${place.reviewCount}件 第${place.reviewCountRank}位`,
    });
  }
  return pins.some((pin) => pin.kind === "peer") ? pins : [];
}

function byReviewCount(a: AreaPlace, b: AreaPlace): number {
  if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
  if (a.isSubject !== b.isSubject) return a.isSubject ? -1 : 1;
  return a.name.localeCompare(b.name, "ja");
}

function rankOf(value: number, all: number[]): number {
  let higher = 0;
  for (const item of all) {
    if (item > value) higher += 1;
  }
  return higher + 1;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) return 0;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1];
  if (lower === undefined) return upper;
  return (lower + upper) / 2;
}
