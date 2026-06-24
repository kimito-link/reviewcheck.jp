import type { StoreInput } from "../types/index";

/** 店舗検索の入力（店舗名 / GoogleマップURL / Place ID のいずれか） */
export interface StoreQuery {
  /** 店舗名やフリーワード */
  text?: string;
  /** GoogleマップURL */
  mapsUrl?: string;
  /** Place ID */
  placeId?: string;
}

/**
 * 店舗データプロバイダの共通インターフェース。
 * Google Places API などを後から adapter として差し込む。
 * 取得できない情報は無理にスクレイピングしない（ユーザー入力・将来のGBP API連携で補完）。
 */
export interface StoreDataProvider {
  name: string;
  /** APIキー等が設定され利用可能なら true */
  isEnabled(): boolean;
  /** 取得できれば StoreInput を返す。できなければ null。 */
  fetchStore(query: StoreQuery): Promise<StoreInput | null>;
}
