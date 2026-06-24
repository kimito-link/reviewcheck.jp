import type { StoreInput } from "../types/index";
import { parseMapsUrl } from "../utils/mapsUrl";
import { normalizeRating, toCount } from "../utils/number";
import type { StoreDataProvider, StoreQuery } from "./types";

/**
 * Google Places API (v1 / Places API New) adapter。
 * 環境変数 GOOGLE_PLACES_API_KEY が設定されているときのみ有効。
 *
 * 取得方針（Places APIの制限内）:
 *   - Text Search で place を特定 → Place Details で rating / userRatingCount /
 *     基本情報を取得する。
 *   - reviews は最大5件程度しか返らないため、口コミの完全取得は前提にしない。
 *   - 取得できない項目（オーナー返信の網羅、低評価比率など）は補完しない。
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
        body: JSON.stringify({ textQuery: text, languageCode: "ja", regionCode: "JP" }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { id?: string }[];
    };
    return data.places?.[0]?.id ?? null;
  }

  /** Place Details を取得して StoreInput に変換 */
  private async fetchDetails(
    placeId: string,
    key: string,
  ): Promise<StoreInput | null> {
    const fields = [
      "id",
      "displayName",
      "formattedAddress",
      "rating",
      "userRatingCount",
      "primaryTypeDisplayName",
      "internationalPhoneNumber",
      "websiteUri",
      "googleMapsUri",
      "regularOpeningHours",
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
    return {
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
  }
}

interface PlaceDetails {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: unknown;
}
