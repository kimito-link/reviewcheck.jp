/**
 * 原価の守り（Google Places など、1回ごとに当社の鍵で費用が出る呼び出し用）。
 *
 * 正本: ai-generic-rules/docs/policies/COST_SAFETY_POLICY.md（§3 L1〜L4・L6）
 * 見本: kimitolink-linktree/lib/server/ouen/budget.ts の reserveMilli を写したもの。
 *
 * ★この層は「数える場所（Redis 等）」を引数で受け取る。core は外部依存を持たないため、
 *   Upstash への接続は apps/web/lib/costGuard.ts が担う。テストは偽のストアで回す。
 *
 * ★fail-closed:
 *   ストアが無い・ストアがエラー・上限の env が数値として読めない → **呼ばない**。
 *   「数えられないなら使わない」。キャッシュの読み書きだけは失敗しても費用が増えないので
 *   黙って素通りする（キャッシュ無し＝毎回予約して呼ぶ、になるだけ）。
 */

export { isBearerAuthorized } from "./auth";

/** 予約・上限に使う最小限のカウンタ操作（Upstash Redis の部分集合）。 */
export interface CounterStore {
  incrby(key: string, by: number): Promise<number>;
  decrby(key: string, by: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

/** 永続キャッシュに使う最小限の操作。 */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts: { ex: number }): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// 原価の見積り（円・整数・切り上げ）。
// ★見積りと既定の上限は同じこのファイルから導く（別ファイルに数字を置くと
//   上限が見積りより小さくなり「必ず拒否」になる。budget.ts の教訓）。
// 根拠（Places API (New) の SKU 単価・1ドル=150円で切り上げ。無料枠は数えない＝保守的）:
//   Text Search Pro（displayName を取る）          $32/1000 → 5円
//   Place Details Enterprise+Atmosphere（reviews） $25/1000 → 4円
//   Nearby Search Enterprise（rating を取る）       $35/1000 → 6円
// ---------------------------------------------------------------------------
export const PLACES_COST_YEN = {
  /** 店舗の特定＋詳細（Text Search＋Place Details）。placeId 指定でも保守的に同額。 */
  store: 9,
  /** 周辺競合の自動検出（Nearby Search 1回）。 */
  competitors: 6,
  /** 現在地周辺の候補（Nearby Search 1回）。 */
  nearby: 6,
} as const;

/** 1診断（キャッシュ無し）の原価。 */
export const DIAGNOSE_COST_YEN = PLACES_COST_YEN.store + PLACES_COST_YEN.competitors;

/**
 * 匿名プールの日次予算の既定（円）。★提案値。最終決定は運用者（env で上書き）。
 * 1,500円/日 ＝ キャッシュに無い新しい店の診断 100件/日。
 */
export const DEFAULT_ANON_DAILY_BUDGET_YEN = DIAGNOSE_COST_YEN * 100;

/**
 * IP ごとの1日の上限（キャッシュに無い＝実際に費用が出る呼び出しだけ数える）。提案値。
 * diagnose は「店舗」「競合」で1回ずつ数えるので 30 ≒ 新しい店の診断 15件/日。
 */
export const DEFAULT_IP_DAILY_LIMIT = {
  diagnose: 30,
  nearby: 10,
} as const;

export type GuardReason = "disabled" | "budget_exhausted" | "rate_limited" | "unavailable";

export type ReserveResult =
  | { ok: true; reservedYen: number; usedYen: number; limitYen: number }
  | { ok: false; reason: GuardReason };

/** UTC の日付キー（YYYY-MM-DD）。 */
export function utcDateKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** キルスイッチ（L1）。PAID_CALLS_DISABLED が 1/true/yes なら全停止。 */
export function isPaidCallsDisabled(raw: string | undefined): boolean {
  if (!raw) return false;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/**
 * env から非負整数の上限を読む。未設定なら既定値。
 * ★NaN・負数・小数は設定ミス → null（呼び出し側は止める。既定値に黙って落とさない）。
 */
export function readLimit(raw: string | undefined, fallback: number): number | null {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

/**
 * 日次予算の予約（L2）。INCRBY で先に積み、超えたら DECRBY で戻して拒否する。
 * ★呼んだ後に失敗しても戻さない（課金済みかもしれないので、多く数える側に倒す）。
 */
export async function reserveDailyBudget(
  store: CounterStore | null,
  opts: { pool: string; costYen: number; limitYen: number | null; at?: Date },
): Promise<ReserveResult> {
  const { pool, costYen, limitYen } = opts;
  if (!store || limitYen === null || !(costYen > 0)) return { ok: false, reason: "unavailable" };
  const key = `costguard:budget:${pool}:${utcDateKey(opts.at ?? new Date())}`;
  let after: number;
  try {
    after = Number(await store.incrby(key, costYen));
    // 見直し用に14日残す。
    if (after === costYen) await store.expire(key, 14 * 24 * 60 * 60);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!Number.isFinite(after)) return { ok: false, reason: "unavailable" };
  if (after > limitYen) {
    try {
      await store.decrby(key, costYen);
    } catch {
      // 戻せなくても止めるのが正しい（多く数える側）。
    }
    return { ok: false, reason: "budget_exhausted" };
  }
  return { ok: true, reservedYen: costYen, usedYen: after, limitYen };
}

/**
 * 1人あたりの上限（L4・固定ウィンドウ 1日）。★ストアが無い・エラーなら通さない。
 */
export async function hitDailyLimit(
  store: CounterStore | null,
  opts: { scope: string; subject: string; limit: number | null; at?: Date },
): Promise<{ ok: true } | { ok: false; reason: "rate_limited" | "unavailable" }> {
  if (!store || opts.limit === null) return { ok: false, reason: "unavailable" };
  const key = `costguard:rl:${opts.scope}:${utcDateKey(opts.at ?? new Date())}:${opts.subject}`;
  let count: number;
  try {
    count = Number(await store.incrby(key, 1));
    if (count === 1) await store.expire(key, 26 * 60 * 60);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!Number.isFinite(count)) return { ok: false, reason: "unavailable" };
  return count <= opts.limit ? { ok: true } : { ok: false, reason: "rate_limited" };
}

/**
 * 店舗の問い合わせを正規化したキャッシュキー（L3）。
 * placeId があればそれだけ（大文字小文字を区別する ID なので変えない）。
 * 無ければ URL／店名を NFKC・小文字・空白圧縮して使う。
 */
export function normalizeStoreQueryKey(q: {
  text?: string;
  mapsUrl?: string;
  placeId?: string;
}): string | null {
  const placeId = q.placeId?.trim();
  if (placeId) return `pid:${placeId}`;
  const norm = (s: string | undefined) =>
    (s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const url = norm(q.mapsUrl);
  if (url) return `url:${url}`;
  const text = norm(q.text);
  if (text) return `txt:${text}`;
  return null;
}

/** キャッシュの読み出し。★失敗は「無かった」扱い（費用は増えないが、予約を通ることになる）。 */
export async function cacheGet<T>(cache: CacheStore | null, key: string): Promise<T | null> {
  if (!cache) return null;
  try {
    return (await cache.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  cache: CacheStore | null,
  key: string,
  value: unknown,
  ttlSec: number,
): Promise<void> {
  if (!cache) return;
  try {
    await cache.set(key, value, { ex: ttlSec });
  } catch {
    // 書けなくても費用は増えない（次回また予約して取りに行くだけ）。
  }
}

/** 予算切れ等で取得しなかったときに利用者へ見せる文言（L6。取れなかったものを良好と言わない）。 */
export function guardMessage(reason: GuardReason, what: "store" | "nearby"): string {
  const tail =
    what === "store"
      ? "Googleマップに表示されている星評価と口コミ数を入力すれば、この場で診断できます。"
      : "店舗名かGoogleマップのURLで検索してください。";
  switch (reason) {
    case "budget_exhausted":
      return `本日の自動取得の無料枠が終了しました（明日またご利用いただけます）。${tail}`;
    case "rate_limited":
      return `本日の自動取得の回数上限に達しました（明日またご利用いただけます）。${tail}`;
    case "disabled":
    case "unavailable":
    default:
      return `ただいま店舗データの自動取得を停止しています。${tail}`;
  }
}
