import type { Competitor, StoreInput } from "@reviewcheck/core";
import { buildPublicFacts, type PublicFacts } from "./placesPublic";

/** 画面確認用の架空店舗。実在の Place ID ではない。 */
export const PLACES_FIXTURE_PLACE_ID = "fixture-places-facts";

/** 診断フォームに入れる固定の文言。この文字列のときだけ、下の応答を返す。 */
export const PLACES_FIXTURE_TEXT = "架空フィクスチャ（Google固定応答）";

export const PLACES_FIXTURE_NOTE =
  "架空の固定応答です。Googleへは問い合わせていません。";

export function placesFixtureEnabled(): boolean {
  return process.env.REVIEWCHECK_PLACES_FIXTURE === "1";
}

export function isPlacesFixtureRequest(query: {
  text?: string;
  placeId?: string;
}): boolean {
  if (!placesFixtureEnabled()) return false;
  const text = query.text?.trim();
  const placeId = query.placeId?.trim();
  return text === PLACES_FIXTURE_TEXT || placeId === PLACES_FIXTURE_PLACE_ID;
}

const store: StoreInput = {
  name: "架空フィクスチャ食堂",
  address: PLACES_FIXTURE_NOTE,
  category: "食堂",
  rating: 4.2,
  reviewCount: 18,
  source: "places",
  placeId: PLACES_FIXTURE_PLACE_ID,
  phone: "",
  website: "",
  hasOpeningHours: false,
  lat: 35.6812,
  lng: 139.7671,
};

const competitors: Competitor[] = [
  {
    name: "架空の隣店A",
    rating: 4.6,
    reviewCount: 80,
    placeId: "fixture-peer-a",
    lat: 35.682,
    lng: 139.768,
  },
  {
    name: "架空の隣店B",
    rating: 4.4,
    reviewCount: 40,
    placeId: "fixture-peer-b",
    lat: 35.683,
    lng: 139.769,
  },
];

/**
 * Google の通常経路に載せる固定応答。
 * 点数・順位・シミュレーションは計算しない。
 */
export function buildPlacesFixtureResult(): PublicFacts {
  return buildPublicFacts({
    store,
    competitors,
    placesAttributed: true,
    diagnosedAt: "2026-11-10T00:00:00.000Z",
    areaScopeText: PLACES_FIXTURE_NOTE,
  });
}
