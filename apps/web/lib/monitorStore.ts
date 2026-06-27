import {
  InMemoryMonitorStore,
  KvMonitorStore,
  type MonitorStore,
} from "@reviewcheck/monitor";

/**
 * 監視ストアの選定を1か所に集約する。
 *
 * 永続ストア（Vercel KV / Upstash Redis）の接続情報が環境変数にあれば
 * KvMonitorStore を、無ければ InMemoryMonitorStore を返す。
 *
 * InMemory はサーバーレスのリクエストをまたいで保持されないため、差分検知の
 * 「基準」が残らず本番の定期監視としては土台に過ぎない。KV接続時に初めて
 * リクエストをまたいだ差分検知が機能する。呼び出し側はこの関数を使うだけで、
 * 実装の差し替えを意識しなくてよい。
 *
 * 環境変数（@upstash/redis の Redis.fromEnv が読む順）:
 *  - URL:   UPSTASH_REDIS_REST_URL → KV_REST_API_URL
 *  - Token: UPSTASH_REDIS_REST_TOKEN → KV_REST_API_TOKEN
 */
let singleton: MonitorStore | null = null;

/** KV接続情報が環境変数に存在するか（Upstash直 / Vercel KV の両命名に対応）。 */
function hasKvEnv(): boolean {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export function getMonitorStore(): MonitorStore {
  if (!singleton) {
    singleton = hasKvEnv()
      ? new KvMonitorStore()
      : new InMemoryMonitorStore();
  }
  return singleton;
}

/** 永続ストアが接続済みかどうか（ルートの応答メッセージに使う）。 */
export function hasPersistentStore(): boolean {
  return hasKvEnv();
}
