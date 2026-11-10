import { catchmentAssumption, NEARBY_SAMPLE_CAP } from "../catchment/index";
import { MAX_COMPETITORS } from "../competitor/index";
import type { Competitor, StoreInput } from "../types/index";
import { readPoint } from "../utils/geo";
import {
  parseMapsUrl,
  isShortMapsUrl,
  looksLikeUrl,
  isAllowedMapsHost,
} from "../utils/mapsUrl";
import { normalizeRating, toCount } from "../utils/number";
import type { StoreDataProvider, StoreQuery } from "./types";

/** 店舗取得の付帯情報（競合検索に使う座標・業種） */
export interface StoreContext {
  lat?: number;
  lng?: number;
  /** Places の primaryType（例: "restaurant"）。競合の同業種絞り込みに使う。 */
  primaryType?: string;
  placeId?: string;
}

export interface FetchCompetitorsOptions {
  /** 検索半径（メートル）。既定 1500m。 */
  radius?: number;
  /** 返す競合の最大件数。既定 5。 */
  limit?: number;
}

/**
 * 店名検索は place ID だけ。
 * Text Search Essentials (IDs Only)。displayName を足すと Pro になるが、応答の id 以外は使わない。
 */
export const TEXT_SEARCH_FIELD_MASK = "places.id";

/**
 * Place Details。reviews は付けない（Enterprise + Atmosphere に上がる。点数は本文を使わない）。
 * rating があるので、この呼び出しは Enterprise。電話・営業時間は同じ段で、別料金にはならない。
 */
export const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "primaryType",
  "primaryTypeDisplayName",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "regularOpeningHours",
  "location",
].join(",");

/**
 * 周辺競合の FieldMask。
 * rating / userRatingCount で Nearby Search は Enterprise になる。
 * location はそれより下なので、この1項目を足しても SKU は上がらない。
 * reviews は足さない。
 */
export const COMPETITOR_SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.location";

/**
 * Google Places API (v1 / Places API New) adapter。
 * 環境変数 GOOGLE_PLACES_API_KEY が設定されているときのみ有効。
 *
 * 取得方針（Places APIの制限内）:
 *   - Text Search は place ID だけ → Place Details で rating / userRatingCount /
 *     座標・業種・基本情報を取得する。口コミ本文は取らない。
 *   - 競合は searchNearby を1回だけ。半径の自動拡大はしない。
 *
 * 詳細な接続手順は docs/api-design.md を参照。
 */
export class GooglePlacesProvider implements StoreDataProvider {
  name = "google-places";

  private get apiKey(): string | undefined {
    return typeof process !== "undefined"
      ? process.env?.GOOGLE_PLACES_API_KEY
      : undefined;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchStore(query: StoreQuery): Promise<StoreInput | null> {
    const detailed = await this.fetchStoreDetailed(query);
    return detailed?.store ?? null;
  }

  /** 店舗本体＋座標・業種（競合検索の起点）を取得する。口コミ本文は取らない。 */
  async fetchStoreDetailed(
    query: StoreQuery,
  ): Promise<{
    store: StoreInput;
    context: StoreContext;
  } | null> {
    const key = this.apiKey;
    if (!key) return null;
    try {
      const placeId = await this.resolvePlaceId(query, key);
      if (!placeId) return null;
      return await this.fetchDetails(placeId, key);
    } catch {
      return null;
    }
  }

  /**
   * 起点店舗の周辺から同業種の競合を自動検出する。
   * 1回の searchNearby で各店舗の rating / userRatingCount まで取得するため、
   * 競合件数ぶんの追加リクエストは発生しない（コスト効率が良い）。
   */
  async fetchCompetitors(
    context: StoreContext,
    options: FetchCompetitorsOptions = {},
  ): Promise<Competitor[]> {
    const key = this.apiKey;
    if (!key) return [];
    if (typeof context.lat !== "number" || typeof context.lng !== "number") {
      return [];
    }

    const radius = options.radius ?? catchmentAssumption(context.primaryType).radiusMeters;
    const limit = options.limit ?? MAX_COMPETITORS;

    try {
      const body: Record<string, unknown> = {
        maxResultCount: NEARBY_SAMPLE_CAP,
        rankPreference: "POPULARITY",
        languageCode: "ja",
        regionCode: "JP",
        locationRestriction: {
          circle: {
            center: { latitude: context.lat, longitude: context.lng },
            radius,
          },
        },
      };
      if (context.primaryType) {
        body.includedPrimaryTypes = [context.primaryType];
      }

      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": COMPETITOR_SEARCH_FIELD_MASK,
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) return [];

      const data = (await res.json()) as { places?: NearbyPlace[] };
      const places = data.places ?? [];

      return places
        .filter(
          (p) =>
            p.id &&
            p.id !== context.placeId &&
            typeof p.rating === "number" &&
            typeof p.userRatingCount === "number",
        )
        .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
        .slice(0, limit)
        .map((p) => {
          const point = readPoint(p.location?.latitude, p.location?.longitude);
          return {
            name: p.displayName?.text,
            rating: normalizeRating(p.rating as number),
            reviewCount: toCount(p.userRatingCount ?? 0),
            mapsUrl: p.googleMapsUri,
            placeId: p.id,
            ...(point ? { lat: point.lat, lng: point.lng } : {}),
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * 現在地周辺の店舗候補を取得する（摩擦ゼロの入口用）。
   * ユーザーが店名やURLを入力しなくても、近い順に候補を出してワンタップ診断につなげる。
   * 1回の searchNearby で各店舗の評価・口コミ数まで取得（追加リクエストなし）。
   */
  async searchNearbyStores(
    lat: number,
    lng: number,
    options: { radius?: number; limit?: number } = {},
  ): Promise<NearbyStore[]> {
    const key = this.apiKey;
    if (!key) return [];
    if (typeof lat !== "number" || typeof lng !== "number") return [];

    const radius = options.radius ?? 500;
    const limit = options.limit ?? 12;

    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.formattedAddress,places.googleMapsUri",
          },
          body: JSON.stringify({
            maxResultCount: NEARBY_SAMPLE_CAP,
            // 現在地に近い順（自分の店を見つけやすくする）
            rankPreference: "DISTANCE",
            languageCode: "ja",
            regionCode: "JP",
            locationRestriction: {
              circle: { center: { latitude: lat, longitude: lng }, radius },
            },
          }),
        },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { places?: NearbyDetailPlace[] };
      return (data.places ?? [])
        .filter((p) => p.id)
        .slice(0, limit)
        .map((p) => ({
          placeId: p.id as string,
          name: p.displayName?.text,
          rating:
            typeof p.rating === "number" ? normalizeRating(p.rating) : undefined,
          reviewCount:
            typeof p.userRatingCount === "number"
              ? toCount(p.userRatingCount)
              : undefined,
          category: p.primaryTypeDisplayName?.text,
          address: p.formattedAddress,
          mapsUrl: p.googleMapsUri,
        }));
    } catch {
      return [];
    }
  }

  /** クエリから place_id を特定する */
  private async resolvePlaceId(
    query: StoreQuery,
    key: string,
  ): Promise<string | null> {
    if (query.placeId) return query.placeId;

    let parsed = query.mapsUrl ? parseMapsUrl(query.mapsUrl) : null;

    // 短縮URL（share.google / maps.app.goo.gl 等）や、名前・place_id を
    // 取り出せないURLは、リダイレクトを追って展開してから再解析する。
    // SSRF対策: Googleマップ系URLと確認できた場合（isMapsUrl）のみ展開する。
    // 任意ホストへのfetchを避けるため、Maps系と判定できないURLは展開しない。
    if (
      query.mapsUrl &&
      parsed?.isMapsUrl &&
      (isShortMapsUrl(query.mapsUrl) || !parsed?.placeId) &&
      !parsed?.nameGuess
    ) {
      const expanded = await this.expandUrl(query.mapsUrl);
      if (expanded) {
        const reparsed = parseMapsUrl(expanded.url);
        parsed = {
          isMapsUrl: true,
          placeId: reparsed.placeId ?? parsed?.placeId,
          nameGuess:
            reparsed.nameGuess ??
            extractTitleName(expanded.body) ??
            parsed?.nameGuess,
          lat: reparsed.lat ?? parsed?.lat,
          lng: reparsed.lng ?? parsed?.lng,
          cid: reparsed.cid ?? parsed?.cid,
        };
      }
    }

    if (parsed?.placeId) return parsed.placeId;

    // URL文字列そのものは検索語にしない（誤検索の防止）。
    const rawText = query.text?.trim();
    const text =
      rawText && !looksLikeUrl(rawText) ? rawText : parsed?.nameGuess;
    if (!text) return null;

    const body: Record<string, unknown> = {
      textQuery: text,
      languageCode: "ja",
      regionCode: "JP",
    };
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
      body.locationBias = {
        circle: {
          center: { latitude: parsed.lat, longitude: parsed.lng },
          radius: 500,
        },
      };
    }

    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { id?: string }[];
    };
    return data.places?.[0]?.id ?? null;
  }

  /** 短縮URLをリダイレクト追跡で展開し、最終URLとHTML本文を返す */
  private async expandUrl(
    raw: string,
  ): Promise<{ url: string; body: string } | null> {
    // SSRF対策: 各ホップでGoogleマップ系ホストであることを再確認しながら
    // リダイレクトを手動追跡する（redirect: "follow" は転送先を検証できないため使わない）。
    const MAX_REDIRECTS = 5;
    let currentUrl = raw;
    try {
      for (let i = 0; i < MAX_REDIRECTS; i++) {
        if (!isAllowedMapsHost(currentUrl)) return null;
        const res = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept-Language": "ja",
          },
        });
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) return null;
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
        if (!res.ok) return null;
        const body = await res.text().catch(() => "");
        return { url: res.url || currentUrl, body };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Place Details を取得して StoreInput＋座標・業種に変換する。 */
  private async fetchDetails(
    placeId: string,
    key: string,
  ): Promise<{
    store: StoreInput;
    context: StoreContext;
  } | null> {
    const fields = PLACE_DETAILS_FIELD_MASK;

    // languageCode=ja を付けないと displayName / primaryTypeDisplayName が英語で返る
    // （例: "Ramen restaurant"）。カテゴリ等を日本語にするため必須。
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja&regionCode=JP`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": fields,
        },
      },
    );
    if (!res.ok) return null;

    const p = (await res.json()) as PlaceDetails;
    if (typeof p.rating !== "number") return null;

    // 注: Places API では「最新口コミの鮮度」「オーナー返信の網羅」「低評価比率」は
    // 安定して取得できないため未確認（undefined）のままにし、スコア側で推定値扱いにする。
    const point = readPoint(p.location?.latitude, p.location?.longitude);
    const store: StoreInput = {
      name: p.displayName?.text,
      address: p.formattedAddress,
      category: p.primaryTypeDisplayName?.text,
      rating: normalizeRating(p.rating),
      reviewCount: toCount(p.userRatingCount ?? 0),
      mapsUrl: p.googleMapsUri,
      placeId: p.id ?? placeId,
      phone: p.internationalPhoneNumber,
      website: p.websiteUri,
      hasOpeningHours: Boolean(p.regularOpeningHours),
      source: "places",
      ...(point ? { lat: point.lat, lng: point.lng } : {}),
    };

    const context: StoreContext = {
      lat: point?.lat,
      lng: point?.lng,
      primaryType: p.primaryType,
      placeId: p.id ?? placeId,
    };

    return { store, context };
  }
}

interface PlaceDetails {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: unknown;
  location?: { latitude?: number; longitude?: number };
}

interface NearbyPlace {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  location?: { latitude?: number; longitude?: number };
}

interface NearbyDetailPlace extends NearbyPlace {
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
}

/** 現在地周辺の店舗候補（摩擦ゼロ入口用） */
export interface NearbyStore {
  placeId: string;
  name?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  address?: string;
  mapsUrl?: string;
}

/**
 * 展開したGoogleマップページのHTMLから店舗名を推測する。
 * og:title / <title> は「<店舗名> · 住所」「<店舗名> - Google マップ」等の形式。
 */
function extractTitleName(html: string): string | undefined {
  if (!html) return undefined;
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  const title = og?.[1] ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (!title) return undefined;
  const cleaned = title
    .replace(/\s*[-–|·•]\s*Google\s*(マップ|Maps).*$/i, "")
    .replace(/\s*[·•].*$/, "")
    .trim();
  return cleaned || undefined;
}
