/**
 * 同業の商圏。1回の診断で Places を1回だけ追加する。
 *
 * 2026-11-11 に長野県諏訪市の実在店で確認したこと:
 * - 湖畔のラーメン店を半径1500m・primaryType 一致・POPULARITY で探すと、
 *   自店以外は約1.3kmの1店だけ。岡谷・茅野・下諏訪は半径の外に落ちる。
 * - 同じ店で Text Search「ラーメン」・locationBias 半径12km・RELEVANCE にすると、
 *   諏訪市・岡谷市・茅野市・下諏訪町の同業が最大約7kmまで1回で返る。
 * - 新宿で同じ Text Search は最大約2.6kmに収まる。店が密集している場所は、
 *   関連度の高い近い店が20件を埋める。
 * - Nearby を半径12km・POPULARITY のまま新宿で使うと、浅草や銀座（約9km）まで飛ぶ。
 *   広い半径の人気順は、都市部の商圏としては広すぎる。
 *
 * だから飲食は「狭い固定半径の Nearby」ではなく、業種の語で Text Search し、
 * 半径は検索の上限（bias）にする。地方は結果が広がり、都市部は近い店が埋まる。
 * 画面に残す件数は API が1回で返す最大の20件。5件で切ると、取れている同業を隠す。
 */

export const COMPETITOR_RESULT_LIMIT = 20;
/** Places の locationBias / locationRestriction が受け付ける半径の上限。 */
export const PLACES_RADIUS_MAX_METERS = 50_000;

/** 車で来る飲食の検索上限。諏訪盆地（湖畔から岡谷・茅野・下諏訪）がこの中に収まった。 */
export const FOOD_CATCHMENT_RADIUS_METERS = 12_000;
const SERVICE_RADIUS_METERS = 8_000;
const CLINIC_RADIUS_METERS = 10_000;
const STAY_RADIUS_METERS = 15_000;

export interface CatchmentInput {
  lat?: number;
  lng?: number;
  primaryType?: string;
  /** 日本語の業種表示名。店名に業種が無いときの検索語。 */
  category?: string;
  name?: string;
}

export interface CompetitorSearchPlan {
  mode: "text" | "nearby";
  textQuery?: string;
  includedPrimaryTypes?: string[];
  radiusMeters: number;
  limit: number;
  label: string;
}

export interface CompetitorPlacesRequest {
  endpoint: "searchText" | "searchNearby";
  limit: number;
  body: Record<string, unknown>;
}

interface SearchRule {
  query: string;
  radiusMeters: number;
  label: string;
}

const RAMEN: SearchRule = {
  query: "ラーメン",
  radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
  label: "ラーメン",
};
const SUSHI: SearchRule = {
  query: "寿司",
  radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
  label: "寿司",
};
const CAFE: SearchRule = {
  query: "カフェ",
  radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
  label: "カフェ",
};
const IZAKAYA: SearchRule = {
  query: "居酒屋",
  radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
  label: "居酒屋",
};
const DENTIST: SearchRule = {
  query: "歯科",
  radiusMeters: CLINIC_RADIUS_METERS,
  label: "歯科",
};
const HAIR: SearchRule = {
  query: "美容院",
  radiusMeters: SERVICE_RADIUS_METERS,
  label: "美容院",
};

const TYPE_RULES: Record<string, SearchRule> = {
  ramen_restaurant: RAMEN,
  japanese_restaurant: {
    query: "日本料理",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "日本料理",
  },
  sushi_restaurant: SUSHI,
  chinese_restaurant: {
    query: "中華",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "中華",
  },
  korean_restaurant: {
    query: "韓国料理",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "韓国料理",
  },
  italian_restaurant: {
    query: "イタリア料理",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "イタリア料理",
  },
  pizza_restaurant: {
    query: "ピザ",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "ピザ",
  },
  hamburger_restaurant: {
    query: "ハンバーガー",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "ハンバーガー",
  },
  fast_food_restaurant: {
    query: "ファストフード",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "ファストフード",
  },
  cafe: CAFE,
  coffee_shop: CAFE,
  bakery: { query: "パン", radiusMeters: SERVICE_RADIUS_METERS, label: "パン" },
  bar: { query: "バー", radiusMeters: SERVICE_RADIUS_METERS, label: "バー" },
  izakaya: IZAKAYA,
  restaurant: {
    query: "レストラン",
    radiusMeters: FOOD_CATCHMENT_RADIUS_METERS,
    label: "飲食",
  },
  meal_takeaway: { query: "弁当", radiusMeters: SERVICE_RADIUS_METERS, label: "テイクアウト" },
  meal_delivery: { query: "出前", radiusMeters: SERVICE_RADIUS_METERS, label: "出前" },
  hair_care: HAIR,
  hair_salon: HAIR,
  beauty_salon: { query: "美容", radiusMeters: SERVICE_RADIUS_METERS, label: "美容" },
  dentist: DENTIST,
  doctor: { query: "病院", radiusMeters: CLINIC_RADIUS_METERS, label: "医療" },
  gym: { query: "ジム", radiusMeters: SERVICE_RADIUS_METERS, label: "ジム" },
  lodging: { query: "ホテル", radiusMeters: STAY_RADIUS_METERS, label: "宿泊" },
  hotel: { query: "ホテル", radiusMeters: STAY_RADIUS_METERS, label: "宿泊" },
  supermarket: { query: "スーパー", radiusMeters: SERVICE_RADIUS_METERS, label: "スーパー" },
  convenience_store: { query: "コンビニ", radiusMeters: 3_000, label: "コンビニ" },
  store: { query: "店", radiusMeters: SERVICE_RADIUS_METERS, label: "店舗" },
};

/** 店名か日本語の業種に含まれるとき、primaryType より優先する。 */
const KEYWORD_RULES: ReadonlyArray<{ pattern: RegExp; rule: SearchRule }> = [
  { pattern: /ラーメン|らーめん|らぁめん|中華そば/, rule: RAMEN },
  { pattern: /寿司|鮨/, rule: SUSHI },
  { pattern: /焼肉|焼き肉/, rule: { query: "焼肉", radiusMeters: FOOD_CATCHMENT_RADIUS_METERS, label: "焼肉" } },
  { pattern: /カフェ|喫茶/, rule: CAFE },
  { pattern: /居酒屋/, rule: IZAKAYA },
  { pattern: /歯科|歯医者/, rule: DENTIST },
  { pattern: /美容室|美容院/, rule: HAIR },
];

export function competitorSearchPlan(input: CatchmentInput): CompetitorSearchPlan {
  const haystack = `${input.name ?? ""} ${input.category ?? ""}`;
  for (const keyword of KEYWORD_RULES) {
    if (keyword.pattern.test(haystack)) return textPlan(keyword.rule);
  }
  const typed = input.primaryType ? TYPE_RULES[input.primaryType] : undefined;
  if (typed) return textPlan(typed);
  if (input.primaryType) {
    return {
      mode: "nearby",
      includedPrimaryTypes: [input.primaryType],
      radiusMeters: SERVICE_RADIUS_METERS,
      limit: COMPETITOR_RESULT_LIMIT,
      label: input.category?.trim() || input.primaryType,
    };
  }
  const category = input.category?.trim();
  if (category) {
    return textPlan({
      query: category,
      radiusMeters: SERVICE_RADIUS_METERS,
      label: category,
    });
  }
  return {
    mode: "nearby",
    radiusMeters: SERVICE_RADIUS_METERS,
    limit: COMPETITOR_RESULT_LIMIT,
    label: "周辺",
  };
}

/**
 * 競合取得1回分の Places リクエスト。
 * 座標が無いときは null（呼び出し自体をしない）。
 */
export function competitorPlacesRequest(
  input: CatchmentInput,
  options: { radius?: number; limit?: number } = {},
): CompetitorPlacesRequest | null {
  if (typeof input.lat !== "number" || typeof input.lng !== "number") return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;

  const plan = competitorSearchPlan(input);
  const radius = clampRadius(options.radius ?? plan.radiusMeters);
  const limit = clampLimit(options.limit ?? plan.limit);
  const center = { latitude: input.lat, longitude: input.lng };

  if (plan.mode === "text" && plan.textQuery) {
    return {
      endpoint: "searchText",
      limit,
      body: {
        textQuery: plan.textQuery,
        pageSize: COMPETITOR_RESULT_LIMIT,
        rankPreference: "RELEVANCE",
        languageCode: "ja",
        regionCode: "JP",
        locationBias: { circle: { center, radius } },
      },
    };
  }

  const body: Record<string, unknown> = {
    maxResultCount: COMPETITOR_RESULT_LIMIT,
    rankPreference: "POPULARITY",
    languageCode: "ja",
    regionCode: "JP",
    locationRestriction: { circle: { center, radius } },
  };
  if (plan.includedPrimaryTypes && plan.includedPrimaryTypes.length > 0) {
    body.includedPrimaryTypes = plan.includedPrimaryTypes;
  }
  return { endpoint: "searchNearby", limit, body };
}

function textPlan(rule: SearchRule): CompetitorSearchPlan {
  return {
    mode: "text",
    textQuery: rule.query,
    radiusMeters: rule.radiusMeters,
    limit: COMPETITOR_RESULT_LIMIT,
    label: rule.label,
  };
}

function clampRadius(radius: number): number {
  if (!Number.isFinite(radius)) return FOOD_CATCHMENT_RADIUS_METERS;
  return Math.min(PLACES_RADIUS_MAX_METERS, Math.max(1, Math.round(radius)));
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return COMPETITOR_RESULT_LIMIT;
  return Math.min(COMPETITOR_RESULT_LIMIT, Math.max(1, Math.round(limit)));
}
