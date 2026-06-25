/**
 * インフラ不要・プロセス内メモリのTTLキャッシュ。
 *
 * 目的（LTV最大化の観点）：
 * - 「この条件で再診断する」「競合の出し直し」など、同じ店舗を短時間に何度も
 *   取得するUX上のループで、最上位SKU（reviews込みPlace Details）を払い直さない。
 * - 何より、再取得の待ち時間（1〜2秒）を消して離脱を防ぎ、転換率＝LTVを守る。
 *
 * 注意：
 * - サーバーレスでは温まったインスタンス内でのみ有効（コールドスタートで消える）。
 *   外部KV不要のぶん、過度な期待はしない“軽い保険”という位置づけ。
 * - 星評価・口コミ数は日次でほぼ変わらないため、短TTL（既定30分）で実害なし。
 */
interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> {
  private store = new Map<string, Entry<V>>();
  constructor(
    private ttlMs: number,
    private maxEntries = 500,
  ) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    // 上限を超えたら最古を1件捨てる（簡易LRU相当）。
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * 取得済みならそれを返し、無ければ loader を実行して結果をキャッシュする。
   * loader が null/undefined を返した場合はキャッシュしない（失敗を固定化しない）。
   */
  async wrap(key: string, loader: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    if (value !== null && value !== undefined) this.set(key, value);
    return value;
  }
}
