import { Redis } from "@upstash/redis";
import {
  DEFAULT_ANON_DAILY_BUDGET_YEN,
  DEFAULT_IP_DAILY_LIMIT,
  hitDailyLimit,
  isPaidCallsDisabled,
  readLimit,
  reserveDailyBudget,
  type CacheStore,
  type CounterStore,
  type GuardReason,
} from "@reviewcheck/core";
import { clientIp } from "@/lib/rateLimit";

/**
 * 匿名の入口（/api/diagnose・/api/nearby）から Google Places を呼ぶ前の関所。
 * 本体は packages/core/src/costguard（テスト済み）。ここは Upstash への接続と env の読み取りだけ。
 *
 * 順番: キルスイッチ（L1）→ IP ごとの1日上限（L4）→ 匿名プールの日次予算の予約（L2）。
 * ★どれも fail-closed。KV 未接続の本番では Places は呼ばれない（手入力の診断は動く）。
 *
 * env（すべて任意・既定は core の提案値）:
 *   PAID_CALLS_DISABLED=1             … 有料呼び出しを全停止
 *   PLACES_ANON_DAILY_BUDGET_YEN       … 匿名プールの日次予算（円）
 *   PLACES_IP_DAILY_LIMIT_DIAGNOSE     … IP ごとの診断の1日上限
 *   PLACES_IP_DAILY_LIMIT_NEARBY       … IP ごとの周辺検索の1日上限
 */

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  cachedRedis = url && token ? new Redis({ url, token }) : null;
  return cachedRedis;
}

export function getCounterStore(): CounterStore | null {
  return getRedis();
}

export function getCacheStore(): CacheStore | null {
  return getRedis();
}

export type PlacesGuardKind = "diagnose" | "nearby";

/** 有料の Places を呼んでよいか。通れば予約済み（呼んだ後に失敗しても戻さない）。 */
export async function guardPlacesCall(
  request: Request,
  kind: PlacesGuardKind,
  costYen: number,
): Promise<{ ok: true } | { ok: false; reason: GuardReason }> {
  if (isPaidCallsDisabled(process.env.PAID_CALLS_DISABLED)) {
    return { ok: false, reason: "disabled" };
  }
  const store = getCounterStore();

  const ipLimit = readLimit(
    kind === "diagnose"
      ? process.env.PLACES_IP_DAILY_LIMIT_DIAGNOSE
      : process.env.PLACES_IP_DAILY_LIMIT_NEARBY,
    DEFAULT_IP_DAILY_LIMIT[kind],
  );
  const perIp = await hitDailyLimit(store, {
    scope: `places-${kind}`,
    subject: clientIp(request),
    limit: ipLimit,
  });
  if (!perIp.ok) return perIp;

  const budget = await reserveDailyBudget(store, {
    pool: "places-anon",
    costYen,
    limitYen: readLimit(process.env.PLACES_ANON_DAILY_BUDGET_YEN, DEFAULT_ANON_DAILY_BUDGET_YEN),
  });
  if (!budget.ok) return { ok: false, reason: budget.reason };
  return { ok: true };
}

/**
 * CORS（自社ドメインだけ）。Chrome 拡張は host_permissions で CORS の外から呼ぶので許可不要。
 * 他の自社製品から呼ぶ場合は CORS_ALLOWED_ORIGINS（カンマ区切り）に足す。
 * ★CORS はブラウザ以外（curl 等）を止めない。原価の守りは guardPlacesCall が本体。
 */
const DEFAULT_ALLOWED_ORIGINS = ["https://reviewcheck.jp", "https://www.reviewcheck.jp"];

export function corsHeaders(request: Request, methods: string): Record<string, string> {
  const extra = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
