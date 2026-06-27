import { Redis } from "@upstash/redis";
import type { MonitorStore } from "./store";
import type { MonitorSnapshot, MonitorTarget } from "./types";

/**
 * Vercel KV / Upstash Redis を使った永続ストア。
 *
 * サーバーレス（Vercel の関数）はリクエストをまたいでメモリを保持しないため、
 * 差分検知の「基準スナップショット」を残すには外部の永続ストアが要る。これが本番実装。
 *
 * Redis のキー設計:
 *  - `mc:targets`        … 監視対象IDの集合（Set）。cron巡回時に全件を引くため
 *  - `mc:target:<id>`    … MonitorTarget 本体（JSON）
 *  - `mc:snapshot:<id>`  … 直近 MonitorSnapshot（JSON。差分の基準）
 *
 * @upstash/redis は値を自動でJSONシリアライズ/デシリアライズするため、
 * get/set にオブジェクトをそのまま渡せる（戻り値も型キャストで受ける）。
 */
const TARGET_SET_KEY = "mc:targets";
const targetKey = (id: string) => `mc:target:${id}`;
const snapshotKey = (id: string) => `mc:snapshot:${id}`;
// Stripe サブスクリプションID → 監視対象ID の逆引き索引。
const subIndexKey = (subscriptionId: string) => `mc:sub:${subscriptionId}`;

export class KvMonitorStore implements MonitorStore {
  private readonly redis: Redis;

  /**
   * 接続情報は環境変数から読む。`Redis.fromEnv()` は
   *  - URL:   UPSTASH_REDIS_REST_URL → なければ KV_REST_API_URL
   *  - Token: UPSTASH_REDIS_REST_TOKEN → なければ KV_REST_API_TOKEN
   * の順でフォールバックするため、Vercel KV と Upstash 直の両方に対応できる。
   *
   * テスト等で明示的に注入したい場合は redis を渡す。
   */
  constructor(redis?: Redis) {
    this.redis = redis ?? Redis.fromEnv();
  }

  async listTargets(): Promise<MonitorTarget[]> {
    const ids = await this.redis.smembers(TARGET_SET_KEY);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => targetKey(id));
    // mget は欠損キーを null で返す。集合とハッシュがずれていても落とさない。
    const targets = await this.redis.mget<(MonitorTarget | null)[]>(...keys);

    return targets.filter(
      (t): t is MonitorTarget => t !== null && t.enabled,
    );
  }

  async saveTarget(target: MonitorTarget): Promise<void> {
    await this.redis.set(targetKey(target.id), target);
    await this.redis.sadd(TARGET_SET_KEY, target.id);
    // 解約 webhook の逆引き用に sub→id の索引を張る。
    if (target.stripeSubscriptionId) {
      await this.redis.set(subIndexKey(target.stripeSubscriptionId), target.id);
    }
  }

  async getTarget(id: string): Promise<MonitorTarget | null> {
    return (await this.redis.get<MonitorTarget>(targetKey(id))) ?? null;
  }

  async removeTarget(id: string): Promise<void> {
    // 先に本体を読み、紐づく sub 索引も消す（孤児索引を残さない）。
    const existing = await this.getTarget(id);
    await this.redis.srem(TARGET_SET_KEY, id);
    await this.redis.del(targetKey(id), snapshotKey(id));
    if (existing?.stripeSubscriptionId) {
      await this.redis.del(subIndexKey(existing.stripeSubscriptionId));
    }
  }

  async findTargetBySubscriptionId(
    subscriptionId: string,
  ): Promise<MonitorTarget | null> {
    const id = await this.redis.get<string>(subIndexKey(subscriptionId));
    if (!id) return null;
    return this.getTarget(id);
  }

  async getLatestSnapshot(targetId: string): Promise<MonitorSnapshot | null> {
    return (
      (await this.redis.get<MonitorSnapshot>(snapshotKey(targetId))) ?? null
    );
  }

  async saveSnapshot(snapshot: MonitorSnapshot): Promise<void> {
    await this.redis.set(snapshotKey(snapshot.targetId), snapshot);
  }
}
