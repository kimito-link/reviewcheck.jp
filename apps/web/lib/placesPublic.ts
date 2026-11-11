import type { Competitor, StoreInput } from "@reviewcheck/core";

/** 画面とAPIに出してよい、公開情報の並び。順位や点数は持たない。 */
export interface PublicPeer {
  name?: string;
  rating: number;
  reviewCount: number;
  placeId?: string;
  lat?: number;
  lng?: number;
}

/**
 * Google の結果とサンプルで返す形。
 * score、順位、シミュレーションはフィールドごと無い。
 */
export interface PublicFacts {
  kind: "facts";
  sample: boolean;
  diagnosedAt: string;
  placesAttributed: boolean;
  areaScopeText?: string;
  notices?: string[];
  input: {
    store: StoreInput;
    competitors: PublicPeer[];
  };
}

export function isPublicFacts(value: unknown): value is PublicFacts {
  if (!value || typeof value !== "object") return false;
  const record = value as { kind?: unknown; score?: unknown };
  return record.kind === "facts" && !("score" in record);
}

export function peersFrom(competitors: Competitor[]): PublicPeer[] {
  return competitors.map((item) => ({
    ...(item.name ? { name: item.name } : {}),
    rating: item.rating,
    reviewCount: item.reviewCount,
    ...(item.placeId ? { placeId: item.placeId } : {}),
    ...(typeof item.lat === "number" ? { lat: item.lat } : {}),
    ...(typeof item.lng === "number" ? { lng: item.lng } : {}),
  }));
}

export function buildPublicFacts(input: {
  store: StoreInput;
  competitors?: Competitor[];
  sample?: boolean;
  placesAttributed: boolean;
  areaScopeText?: string;
  notices?: string[];
  diagnosedAt?: string;
}): PublicFacts {
  const facts: PublicFacts = {
    kind: "facts",
    sample: input.sample === true,
    diagnosedAt: input.diagnosedAt ?? new Date().toISOString(),
    placesAttributed: input.placesAttributed,
    input: {
      store: input.store,
      competitors: peersFrom(input.competitors ?? []),
    },
  };
  if (input.areaScopeText) facts.areaScopeText = input.areaScopeText;
  if (input.notices && input.notices.length > 0) facts.notices = input.notices;
  return facts;
}

/** デモボタン用。架空の数値で、Google も点数計算も呼ばない。 */
export function buildSampleFacts(): PublicFacts {
  return buildPublicFacts({
    sample: true,
    placesAttributed: false,
    diagnosedAt: "2026-11-10T00:00:00.000Z",
    areaScopeText: "これはサンプルです。架空の数値で、Googleへは問い合わせていません。",
    store: {
      name: "サンプル食堂（架空）",
      address: "架空の固定応答です。Googleへは問い合わせていません。",
      category: "食堂",
      rating: 4.2,
      reviewCount: 18,
      source: "mock",
      phone: "",
      website: "",
      hasOpeningHours: false,
    },
    competitors: [
      { name: "架空の隣店A", rating: 4.6, reviewCount: 80 },
      { name: "架空の隣店B", rating: 4.4, reviewCount: 40 },
    ],
  });
}
