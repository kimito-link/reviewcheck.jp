/**
 * 公開の店舗座標。地図プロバイダには依存しない。
 * 小数第5位（約1m）までに揃え、共有URLを不必要に長くしない。
 */

const COORD_SCALE = 1e5;

export interface PublicPoint {
  lat: number;
  lng: number;
}

/** 緯度経度が組として使えるときだけ返す。片方だけでは位置にしない。 */
export function readPoint(lat: unknown, lng: unknown): PublicPoint | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat: Math.round(lat * COORD_SCALE) / COORD_SCALE,
    lng: Math.round(lng * COORD_SCALE) / COORD_SCALE,
  };
}

/**
 * 本体の座標を優先し、無ければ fallback（Place Details の context など）を使う。
 * どちらも不正なら lat/lng キー自体を落とす。店名など他の項目はそのまま残す。
 */
export function withPublicPoint<T extends object>(
  entity: T,
  fallback?: { lat?: number; lng?: number },
): T & { lat?: number; lng?: number } {
  const record = entity as T & { lat?: unknown; lng?: unknown };
  const point =
    readPoint(record.lat, record.lng) ??
    (fallback ? readPoint(fallback.lat, fallback.lng) : null);
  const next: Record<string, unknown> = { ...record };
  delete next.lat;
  delete next.lng;
  if (!point) return next as T & { lat?: number; lng?: number };
  next.lat = point.lat;
  next.lng = point.lng;
  return next as T & { lat?: number; lng?: number };
}

/** 2点間の距離（メートル）。地球を球（半径 6371000m）として測る。 */
export function distanceMeters(a: PublicPoint, b: PublicPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
