import type { StoreInput } from "../types/index";
import { parseMapsUrl } from "../utils/mapsUrl";
import type { StoreDataProvider, StoreQuery } from "./types";

/**
 * モックプロバイダ。Places API 未接続時のデモ・初期体験用。
 * クエリ文字列から決定的に（同じ入力なら同じ結果になる）それっぽい数値を生成する。
 * ※ 実在の店舗の正確な値ではない旨を、UI側で必ず明示すること。
 */
export class MockStoreProvider implements StoreDataProvider {
  name = "mock";

  isEnabled(): boolean {
    return true; // 常に利用可能（最後のフォールバック）
  }

  async fetchStore(query: StoreQuery): Promise<StoreInput | null> {
    const parsed = query.mapsUrl ? parseMapsUrl(query.mapsUrl) : null;
    const name =
      query.text?.trim() ||
      parsed?.nameGuess ||
      (query.mapsUrl ? "サンプル店舗" : "");
    if (!name && !query.placeId && !query.mapsUrl) return null;

    const seed = hash(`${name}|${query.placeId ?? ""}|${query.mapsUrl ?? ""}`);
    const rng = mulberry32(seed);

    const rating = round1(3.6 + rng() * 1.2); // 3.6〜4.8
    const reviewCount = 8 + Math.floor(rng() * 160); // 8〜167
    const lowRatingRatio = round2(0.05 + rng() * 0.25);
    const daysSinceLastReview = 3 + Math.floor(rng() * 80);

    return {
      name: name || "サンプル店舗",
      category: pick(rng, [
        "飲食店",
        "美容院",
        "整体院",
        "クリニック",
        "歯科医院",
        "サロン",
      ]),
      address: "（デモデータ）",
      rating,
      reviewCount,
      mapsUrl: query.mapsUrl,
      placeId: query.placeId ?? parsed?.placeId,
      hasOpeningHours: rng() > 0.3,
      hasPhotos: rng() > 0.4,
      hasOwnerReplies: rng() > 0.5,
      lowRatingRatio,
      daysSinceLastReview,
      source: "mock",
    };
  }
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
