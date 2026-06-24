import type { Competitor, StoreInput } from "../types/index";
import { parseMapsUrl } from "../utils/mapsUrl";
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
 * Google Places API (v1 / Places API New) adapter。
 * 環境変数 GOOGLE_PLACES_API_KEY が設定されているときのみ有効。
 *
 * 取得方針（Places APIの制限内）:
 *   - Text Search で place を特定 → Place Details で rating / userRatingCount /
 *     座標・業種・基本情報を取得する。
 *   - 競合は searchNearby（1回の呼び出しで周辺店舗の評価・口コミ数まで取得）で検出。
 *   - reviews は最大5件程度しか返らないため、口コミの完全取得は前提にしない。
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

  /** 店舗本体＋座標・業種（競合検索の起点）をまとめて取得 */
  async fetchStoreDetailed(
    query: StoreQuery,
  ): Promise<{ store: StoreInput; context: StoreContext } | null> {
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

    const radius = options.radius ?? 1500;
    const limit = options.limit ?? 5;

    try {
      const body: Record<string, unknown> = {
        maxResultCount: 20,
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
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri",
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
        .map((p) => ({
          name: p.displayName?.text,
          rating: normalizeRating(p.rating as number),
          reviewCount: toCount(p.userRatingCount ?? 0),
          mapsUrl: p.googleMapsUri,
          placeId: p.id,
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

    const parsed = query.mapsUrl ? parseMapsUrl(query.mapsUrl) : null;
    if (parsed?.placeId) return parsed.placeId;

    const text = query.text?.trim() || parsed?.nameGuess;
    if (!text) return null;

    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({
          textQuery: text,
          languageCode: "ja",
          regionCode: "JP",
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { id?: string }[];
    };
    return data.places?.[0]?.id ?? null;
  }

  /** Place Details を取得して StoreInput＋座標・業種に変換 */
  private async fetchDetails(
    placeId: string,
    key: string,
  ): Promise<{ store: StoreInput; context: StoreContext } | null> {
    const fields = [
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

    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
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
    };

    const context: StoreContext = {
      lat: p.location?.latitude,
      lng: p.location?.longitude,
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
}
