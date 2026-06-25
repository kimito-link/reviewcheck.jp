import type { Competitor, StoreInput } from "../types/index";
import type { ReviewItem } from "../reviews/index";
import {
  GooglePlacesProvider,
  type FetchCompetitorsOptions,
  type StoreContext,
} from "./googlePlaces";
import { MockStoreProvider } from "./mock";
import type { StoreDataProvider, StoreQuery } from "./types";

export * from "./types";
export {
  GooglePlacesProvider,
  type StoreContext,
  type FetchCompetitorsOptions,
  type NearbyStore,
} from "./googlePlaces";
export { MockStoreProvider } from "./mock";

/** 実データプロバイダ（キー設定済みのもの）。mock は含めない。 */
export function getEnabledProviders(): StoreDataProvider[] {
  const all: StoreDataProvider[] = [new GooglePlacesProvider()];
  return all.filter((p) => p.isEnabled());
}

export interface FetchStoreResult {
  store: StoreInput | null;
  /** 実データプロバイダ名（mockなら空配列） */
  providers: string[];
  /** モックデータかどうか */
  isMock: boolean;
  /** 競合自動検出に使う座標・業種（実プロバイダ取得時のみ） */
  context?: StoreContext;
  /** Places が返した代表口コミ（口コミ分析に使う。実プロバイダ取得時のみ） */
  reviews?: ReviewItem[];
}

export interface FetchStoreOptions {
  /**
   * 実データが取得できなかったとき、mock（架空のデモ値）で埋めてよいか。
   * 既定 false。実在店舗の診断で勝手にそれっぽい数値を作らないための安全弁。
   * 「デモで試す」など、デモと明示した場合のみ true にする。
   */
  allowMock?: boolean;
}

/**
 * 店舗データを取得する。
 * 1) 有効な実プロバイダ（Google Places 等）があれば順に試す。
 * 2) 取得できず allowMock=true のときのみ mock にフォールバック（明示的なデモ体験）。
 * 3) それ以外は null を返す（呼び出し側で実数値の手入力を促す）。
 */
export async function fetchStore(
  query: StoreQuery,
  options: FetchStoreOptions = {},
): Promise<FetchStoreResult> {
  for (const provider of getEnabledProviders()) {
    // GooglePlacesProvider は座標・業種つきで取得できる
    if (provider instanceof GooglePlacesProvider) {
      const detailed = await provider.fetchStoreDetailed(query);
      if (detailed) {
        return {
          store: detailed.store,
          providers: [provider.name],
          isMock: false,
          context: detailed.context,
          reviews: detailed.reviews,
        };
      }
      continue;
    }
    const store = await provider.fetchStore(query);
    if (store) {
      return { store, providers: [provider.name], isMock: false };
    }
  }
  if (options.allowMock) {
    const mock = new MockStoreProvider();
    const store = await mock.fetchStore(query);
    return { store, providers: [], isMock: true };
  }
  return { store: null, providers: [], isMock: false };
}

/**
 * 現在地周辺の店舗候補を取得する（摩擦ゼロの入口）。
 * 実プロバイダ（Google Places）が有効なときのみ。未接続なら空配列。
 */
export async function fetchNearbyStores(
  lat: number,
  lng: number,
  options: { radius?: number; limit?: number } = {},
): Promise<import("./googlePlaces").NearbyStore[]> {
  for (const provider of getEnabledProviders()) {
    if (provider instanceof GooglePlacesProvider) {
      return provider.searchNearbyStores(lat, lng, options);
    }
  }
  return [];
}

/**
 * 起点店舗の周辺から競合を自動検出する。
 * 実プロバイダ（Google Places）が有効で、座標が分かる場合のみ動作。
 * それ以外は空配列（手動入力にフォールバック）。
 */
export async function fetchCompetitors(
  context: StoreContext | undefined,
  options: FetchCompetitorsOptions = {},
): Promise<Competitor[]> {
  if (!context) return [];
  for (const provider of getEnabledProviders()) {
    if (provider instanceof GooglePlacesProvider) {
      return provider.fetchCompetitors(context, options);
    }
  }
  return [];
}
