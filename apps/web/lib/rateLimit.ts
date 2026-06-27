import { Redis } from "@upstash/redis";

/**
 * 軽量なレート制限。固定ウィンドウ方式。
 *
 * - KV（Vercel KV / Upstash）接続時: Redis の INCR + EXPIRE でインスタンスを
 *   またいで効く（サーバーレスでも堅牢）。
 * - 未接続時: プロセス内メモリへフォールバック。同一インスタンス内の連打は
 *   防げるが、インスタンスをまたぐと効かない（開発・最小運用向け）。
 *
 * 外部スキャンを伴わない軽い書き込み系API（申し込み等）のスパム抑止が目的。
 */

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

// インメモリ・フォールバック用の固定ウィンドウカウンタ。
const memoryHits = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  /** 許可されたか */
  ok: boolean;
  /** このウィンドウの残り許容回数 */
  remaining: number;
  /** ウィンドウがリセットされる時刻(epoch ms) */
  resetAt: number;
}

export interface RateLimitOptions {
  /** 一意キー（例: `signup:<ip>`）。 */
  key: string;
  /** ウィンドウ内の許容回数。 */
  limit: number;
  /** ウィンドウ長(秒)。 */
  windowSec: number;
}

/**
 * 1リクエストを記録し、上限を超えていないか判定する。
 * 超過時は ok=false。失敗（KVエラー等）時は通す（fail-open）。
 */
export async function rateLimit({
  key,
  limit,
  windowSec,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + windowSec * 1000;

  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        // 最初のヒットでだけTTLを張る（固定ウィンドウ）。
        await redis.expire(redisKey, windowSec);
      }
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch {
      // KV障害時はサービスを止めない（fail-open）。
      return { ok: true, remaining: limit, resetAt };
    }
  }

  // インメモリ・フォールバック
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  entry.count += 1;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * リクエストからクライアントIPを推定する。
 * Vercel/プロキシ経由では x-forwarded-for の先頭が実IP。
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
