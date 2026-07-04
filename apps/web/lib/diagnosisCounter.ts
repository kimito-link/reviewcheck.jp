import { Redis } from "@upstash/redis";

/**
 * 累計診断件数のカウンタ（石川氏の指摘対応：件数を可視化して信頼シグナルにする）。
 *
 * 診断結果 /report/[id]/ はステートレス設計（DBなし・idに入力をエンコードして
 * 都度再計算）のため、既存ストアから件数を取得することはできない。
 * そこで、既に monitor 機能で使っている Upstash Redis（rateLimit.ts と同じ接続）に
 * 診断完了のたびに INCR するだけの最小カウンタを追加する。新しい外部サービスは導入しない。
 *
 * KV未接続（開発環境等）の場合はプロセス内メモリにフォールバックする
 * （インスタンスをまたぐと保持されないため、本番表示は既定で閾値非表示になりやすいが、
 * fail-open でサービスは止めない）。
 */

const COUNTER_KEY = "rc:diagnosis:count";

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const redis = getRedis();

// インメモリ・フォールバック（KV未接続時のみ）。
let memoryCount = 0;

/** 診断が1件完了するたびに呼ぶ。カウントの成否はレスポンスに影響させない（fail-open）。 */
export async function incrementDiagnosisCount(): Promise<void> {
  if (redis) {
    try {
      await redis.incr(COUNTER_KEY);
      return;
    } catch {
      // KV障害時は握りつぶす（診断自体は止めない）。
    }
  }
  memoryCount += 1;
}

/** 累計診断件数を取得する。取得できない場合は null。 */
export async function getDiagnosisCount(): Promise<number | null> {
  if (redis) {
    try {
      const count = await redis.get<number>(COUNTER_KEY);
      return typeof count === "number" ? count : Number(count ?? 0);
    } catch {
      return null;
    }
  }
  return memoryCount;
}
