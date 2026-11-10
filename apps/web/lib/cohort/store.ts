import { Redis } from "@upstash/redis";
import { COHORT_HIST_SIZE } from "./constants";
import {
  applyDelta,
  cohortTotalKeys,
  emptyTotals,
  type CohortDelta,
  type CohortTotals,
} from "./public";

export interface CohortStore {
  /** 観測を1件足して、足したあとの集計を返す。識別子は受け取らない。 */
  add(key: string, delta: CohortDelta): Promise<CohortTotals>;
  read(key: string): Promise<CohortTotals | null>;
}

function cloneTotals(totals: CohortTotals): CohortTotals {
  return { ...totals, hist: totals.hist.slice() };
}

export class MemoryCohortStore implements CohortStore {
  private readonly map = new Map<string, CohortTotals>();

  async add(key: string, delta: CohortDelta): Promise<CohortTotals> {
    const next = applyDelta(this.map.get(key) ?? emptyTotals(), delta);
    this.map.set(key, next);
    return cloneTotals(next);
  }

  async read(key: string): Promise<CohortTotals | null> {
    const found = this.map.get(key);
    return found ? cloneTotals(found) : null;
  }

  /** テスト用。保存済みのキーと集計だけ。 */
  dump(): string {
    return JSON.stringify(
      [...this.map.entries()].map(([key, value]) => ({
        key,
        value: cloneTotals(value),
      })),
    );
  }
}

export class DisabledCohortStore implements CohortStore {
  async add(_key: string, _delta: CohortDelta): Promise<CohortTotals> {
    return emptyTotals();
  }

  async read(_key: string): Promise<CohortTotals | null> {
    return null;
  }
}

interface HashPipeline {
  hincrby(key: string, field: string, increment: number): unknown;
  exec(): Promise<unknown>;
}

interface HashClient {
  pipeline(): HashPipeline;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
}

function asCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function totalsFromHash(
  raw: Record<string, unknown> | null | undefined,
): CohortTotals | null {
  if (!raw) return null;
  const n = asCount(raw.n);
  if (n <= 0) return null;
  const hist = Array.from({ length: COHORT_HIST_SIZE }, (_, i) =>
    asCount(raw[`b${i}`]),
  );
  return {
    n,
    scoreSum: asCount(raw.scoreSum),
    ratingTenthsSum: asCount(raw.ratingTenthsSum),
    reviewCountSum: asCount(raw.reviewCountSum),
    replyYes: asCount(raw.replyYes),
    replyKnown: asCount(raw.replyKnown),
    hist,
  };
}

export class RedisCohortStore implements CohortStore {
  constructor(private readonly redis: HashClient) {}

  async add(key: string, delta: CohortDelta): Promise<CohortTotals> {
    const pipe = this.redis.pipeline();
    pipe.hincrby(key, "n", 1);
    pipe.hincrby(key, "scoreSum", delta.score);
    pipe.hincrby(key, "ratingTenthsSum", delta.ratingTenths);
    pipe.hincrby(key, "reviewCountSum", delta.reviewCount);
    pipe.hincrby(key, "replyYes", delta.replyYes);
    pipe.hincrby(key, "replyKnown", delta.replyKnown);
    pipe.hincrby(key, `b${delta.score}`, 1);
    await pipe.exec();
    return (await this.read(key)) ?? emptyTotals();
  }

  async read(key: string): Promise<CohortTotals | null> {
    const raw = await this.redis.hgetall(key);
    return totalsFromHash(raw);
  }
}

export function createCohortStore(env: {
  cohortStore?: string | null;
  redisUrl?: string | null;
  redisToken?: string | null;
}): CohortStore {
  if (env.cohortStore === "off") return new DisabledCohortStore();
  if (env.cohortStore === "memory") return new MemoryCohortStore();
  const url = env.redisUrl?.trim();
  const token = env.redisToken?.trim();
  if (url && token) {
    const redis = new Redis({ url, token }) as unknown as HashClient;
    return new RedisCohortStore(redis);
  }
  return new MemoryCohortStore();
}

/** 保存オブジェクトが、決めた数値フィールド以外を持っていないか。 */
export function totalsOnlyHaveAggregateFields(totals: CohortTotals): boolean {
  const keys = Object.keys(totals).sort();
  const allowed = [...cohortTotalKeys()].sort();
  return keys.join(",") === allowed.join(",");
}
