/**
 * GoogleマップURLから、診断に使える手がかり（店舗名・place_id・座標）を
 * ベストエフォートで抽出する。完全な取得は Places API 接続後に行う。
 */
export interface ParsedMapsUrl {
  /** URL から推測した店舗名（/place/<name>/ 部分） */
  nameGuess?: string;
  /** place_id（クエリ等から取得できた場合） */
  placeId?: string;
  /** Google が内部利用する CID（!1s0x...:0x... 形式から推測） */
  cid?: string;
  /** 緯度経度（@lat,lng から） */
  lat?: number;
  lng?: number;
  /** 入力がGoogleマップ系URLとして妥当か */
  isMapsUrl: boolean;
}

const MAPS_HOSTS = [
  "google.com",
  "google.co.jp",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "g.page",
];

export function parseMapsUrl(raw: string): ParsedMapsUrl {
  const trimmed = (raw ?? "").trim();
  let url: URL | null = null;
  try {
    url = new URL(trimmed);
  } catch {
    return { isMapsUrl: false };
  }

  const host = url.hostname.replace(/^www\./, "");
  const isMaps =
    MAPS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) &&
    (url.pathname.includes("/maps") ||
      host.includes("goo.gl") ||
      host === "g.page" ||
      host.includes("maps"));

  const result: ParsedMapsUrl = { isMapsUrl: isMaps };

  // place_id クエリ
  const placeId =
    url.searchParams.get("place_id") ?? url.searchParams.get("placeid");
  if (placeId) result.placeId = placeId;

  // /place/<name>/...
  const placeMatch = url.pathname.match(/\/place\/([^/@]+)/);
  if (placeMatch && placeMatch[1]) {
    result.nameGuess = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }

  // @lat,lng
  const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at && at[1] && at[2]) {
    result.lat = Number(at[1]);
    result.lng = Number(at[2]);
  }

  // CID: !1s0x...:0x...
  const cidMatch = trimmed.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
  if (cidMatch) result.cid = cidMatch[0];

  return result;
}

/** 入力文字列がURLっぽいか（http/https） */
export function looksLikeUrl(raw: string): boolean {
  return /^https?:\/\//i.test((raw ?? "").trim());
}
