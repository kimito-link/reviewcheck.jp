import { Redis } from "@upstash/redis";
import {
  acceptFunnelBody,
  funnelStorageKey,
  type FunnelAccept,
} from "./funnelEvents";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const redis = getRedis();
const memory = new Map<string, number>();

export async function incrementFunnel(accepted: FunnelAccept): Promise<void> {
  const key = funnelStorageKey(accepted);
  if (redis) {
    try {
      await redis.incr(key);
      return;
    } catch {
      // カウントの失敗で診断は止めない。
    }
  }
  memory.set(key, (memory.get(key) ?? 0) + 1);
}

export function funnelBodyOrNull(input: unknown): FunnelAccept | null {
  return acceptFunnelBody(input);
}
