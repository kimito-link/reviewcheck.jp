import {
  prepareCohortWrite,
  toPublicSummary,
  type CohortObservation,
  type CohortPublic,
} from "./public";
import { createCohortStore, type CohortStore } from "./store";

/**
 * 業種×地域の集計。クライアントから import しない（Redis を含む）。
 *
 * 保存先（既存の Upstash Redis / Vercel KV。診断カウンタと同じ接続）:
 * - UPSTASH_REDIS_REST_URL または KV_REST_API_URL
 * - UPSTASH_REDIS_REST_TOKEN または KV_REST_API_TOKEN
 * 未設定のときはプロセス内メモリ（インスタンスをまたがない。本番では件数が
 * しきい値に届かず、比較は出ない）。
 * COHORT_STORE=off で保存も参照も止める。COHORT_STORE=memory で Redis があってもメモリ。
 *
 * キーは採点ルールの版・業種・地域だけ。値は件数と合計と点数のヒストグラムだけ。
 */

let cached: CohortStore | undefined;

export function getCohortStore(): CohortStore {
  if (cached) return cached;
  try {
    cached = createCohortStore({
      cohortStore: process.env.COHORT_STORE,
      redisUrl:
        process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
      redisToken:
        process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
    });
  } catch {
    cached = createCohortStore({ cohortStore: "off" });
  }
  return cached;
}

export function resetCohortStoreForTests(): void {
  cached = undefined;
}

/** Places の実測だけを足す。デモ・モック・手入力の上書きは足さない。 */
export function shouldRecordCohort(input: {
  demo: boolean;
  source?: string | null;
  manualTouch: boolean;
}): boolean {
  return !input.demo && input.source === "places" && !input.manualTouch;
}

export async function publishCohort(
  input: CohortObservation & { record: boolean; store?: CohortStore },
): Promise<CohortPublic> {
  const prepared = prepareCohortWrite(input);
  if (!prepared) return { show: false };
  const store = input.store ?? getCohortStore();
  try {
    const totals = input.record
      ? await store.add(prepared.key, prepared.delta)
      : await store.read(prepared.key);
    return toPublicSummary(totals, input.score, {
      categoryLabel: prepared.categoryLabel,
      regionLabel: prepared.regionLabel,
    });
  } catch {
    return { show: false };
  }
}
