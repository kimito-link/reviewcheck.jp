import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { MonitorSnapshot, MonitorTarget } from "./types";

/**
 * 監視の永続化を抽象化するインターフェース。
 * 実装を差し替えるだけで InMemory / ファイル / Vercel KV / Postgres へ移行できる。
 *
 * 保存すべきは2種類:
 *  - 監視対象（顧客のサイト一覧）
 *  - 各対象の「直近スナップショット」（差分検知の基準）
 */
export interface MonitorStore {
  /** 有効な監視対象を全件取得（cronで巡回する用） */
  listTargets(): Promise<MonitorTarget[]>;
  /** 対象を登録・更新（upsert） */
  saveTarget(target: MonitorTarget): Promise<void>;
  /** IDで対象を取得 */
  getTarget(id: string): Promise<MonitorTarget | null>;
  /** 対象を削除（解約） */
  removeTarget(id: string): Promise<void>;
  /**
   * Stripe サブスクリプションIDから対象を逆引きする（なければ null）。
   * 解約 webhook で「どの監視を止めるか」を特定するために使う。
   */
  findTargetBySubscriptionId(subscriptionId: string): Promise<MonitorTarget | null>;

  /** 直近スナップショットを取得（なければ null） */
  getLatestSnapshot(targetId: string): Promise<MonitorSnapshot | null>;
  /** 直近スナップショットを保存（基準を更新） */
  saveSnapshot(snapshot: MonitorSnapshot): Promise<void>;
}

/** プロセスメモリ上のストア。テスト・開発・単発実行向け（再起動で消える）。 */
export class InMemoryMonitorStore implements MonitorStore {
  private targets = new Map<string, MonitorTarget>();
  private snapshots = new Map<string, MonitorSnapshot>();

  async listTargets(): Promise<MonitorTarget[]> {
    return [...this.targets.values()].filter((t) => t.enabled);
  }
  async saveTarget(target: MonitorTarget): Promise<void> {
    this.targets.set(target.id, target);
  }
  async getTarget(id: string): Promise<MonitorTarget | null> {
    return this.targets.get(id) ?? null;
  }
  async removeTarget(id: string): Promise<void> {
    this.targets.delete(id);
    this.snapshots.delete(id);
  }
  async findTargetBySubscriptionId(
    subscriptionId: string,
  ): Promise<MonitorTarget | null> {
    for (const t of this.targets.values()) {
      if (t.stripeSubscriptionId === subscriptionId) return t;
    }
    return null;
  }
  async getLatestSnapshot(targetId: string): Promise<MonitorSnapshot | null> {
    return this.snapshots.get(targetId) ?? null;
  }
  async saveSnapshot(snapshot: MonitorSnapshot): Promise<void> {
    this.snapshots.set(snapshot.targetId, snapshot);
  }
}

interface FileShape {
  targets: Record<string, MonitorTarget>;
  snapshots: Record<string, MonitorSnapshot>;
}

/**
 * 単一JSONファイルに保存するストア。サーバーレスでない実行（cron用VM・
 * ローカルバッチ）で永続化したいときの最小実装。
 *
 * 注意: Vercel のサーバーレス関数は書き込み先が一時的なので本番の永続化には
 * 向かない。本番は同じ MonitorStore インターフェースで KV/Postgres 実装に
 * 差し替えること。ここはあくまで依存ゼロの土台。
 */
export class FileMonitorStore implements MonitorStore {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<FileShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileShape>;
      return {
        targets: parsed.targets ?? {},
        snapshots: parsed.snapshots ?? {},
      };
    } catch {
      return { targets: {}, snapshots: {} };
    }
  }

  private async persist(data: FileShape): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async listTargets(): Promise<MonitorTarget[]> {
    const { targets } = await this.load();
    return Object.values(targets).filter((t) => t.enabled);
  }
  async saveTarget(target: MonitorTarget): Promise<void> {
    const data = await this.load();
    data.targets[target.id] = target;
    await this.persist(data);
  }
  async getTarget(id: string): Promise<MonitorTarget | null> {
    const { targets } = await this.load();
    return targets[id] ?? null;
  }
  async removeTarget(id: string): Promise<void> {
    const data = await this.load();
    delete data.targets[id];
    delete data.snapshots[id];
    await this.persist(data);
  }
  async findTargetBySubscriptionId(
    subscriptionId: string,
  ): Promise<MonitorTarget | null> {
    const { targets } = await this.load();
    return (
      Object.values(targets).find(
        (t) => t.stripeSubscriptionId === subscriptionId,
      ) ?? null
    );
  }
  async getLatestSnapshot(targetId: string): Promise<MonitorSnapshot | null> {
    const { snapshots } = await this.load();
    return snapshots[targetId] ?? null;
  }
  async saveSnapshot(snapshot: MonitorSnapshot): Promise<void> {
    const data = await this.load();
    data.snapshots[snapshot.targetId] = snapshot;
    await this.persist(data);
  }
}
