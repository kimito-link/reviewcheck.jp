import type { StoreInput } from "../types/index";
import { GooglePlacesProvider } from "./googlePlaces";
import { MockStoreProvider } from "./mock";
import type { StoreDataProvider, StoreQuery } from "./types";

export * from "./types";
export { GooglePlacesProvider } from "./googlePlaces";
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
}

/**
 * 店舗データを取得する。
 * 1) 有効な実プロバイダ（Google Places 等）があれば順に試す。
 * 2) どれも取得できなければ mock にフォールバック（初期版のデモ体験）。
 */
export async function fetchStore(query: StoreQuery): Promise<FetchStoreResult> {
  for (const provider of getEnabledProviders()) {
    const store = await provider.fetchStore(query);
    if (store) {
      return { store, providers: [provider.name], isMock: false };
    }
  }
  const mock = new MockStoreProvider();
  const store = await mock.fetchStore(query);
  return { store, providers: [], isMock: true };
}
