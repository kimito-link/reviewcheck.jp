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
