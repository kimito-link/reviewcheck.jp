import { diffSnapshots } from "./diff";
import type { MonitorStore } from "./store";
import type { Notifier } from "./notify";
import { NoopNotifier } from "./notify";
import type { MonitorRunResult, MonitorSnapshot, MonitorTarget } from "./types";

/**
 * 監視対象を診断し、前回比較できる指紋（MonitorSnapshot）に変換する関数。
 *
 * monitor をドメイン非依存に保つための注入点。各ブランドが自分の診断
 * （malwarecheck の scanUrl→ScanResult, reviewcheck の diagnose→DiagnosisResult 等）を
 * ここに適合させる。返り値の `scan` は生の診断結果（詳細表示用に運ぶだけ）、
 * `snapshot` は差分判定に使う正規化済みデータ。
 */
export interface Scanner<TScan = unknown> {
  (
    target: MonitorTarget,
  ): Promise<{ scan: TScan; snapshot: MonitorSnapshot }>;
}

export interface RunOptions<TScan = unknown> {
  store: MonitorStore;
  /** 監視対象を診断して指紋化する関数（ブランド固有。必須）。 */
  scanner: Scanner<TScan>;
  /** 通知先（省略時は何もしない） */
  notifier?: Notifier;
  /**
   * no-change のときも通知するか（既定: false。重大時のみ通知でノイズを避ける）。
   * 週次サマリ等で全件通知したい場合に true。
   */
  notifyOnNoChange?: boolean;
}

/**
 * 監視対象1件を実行する:
 *   スキャン → 前回スナップショット取得 → 差分検知 → 保存 → 必要なら通知。
 *
 * 重要: 通知判定（shouldNotify）が出ても、スナップショットは必ず更新する。
 * そうしないと同じ変化が毎回通知され続けてしまう（基準を前進させる）。
 */
export async function runMonitorCheck<TScan = unknown>(
  target: MonitorTarget,
  opts: RunOptions<TScan>,
): Promise<MonitorRunResult<TScan>> {
  const { store, scanner, notifier = new NoopNotifier() } = opts;

  // ブランド固有の診断＋指紋化（注入）。snapshot.targetId は target.id に固定。
  const { scan, snapshot: rawSnapshot } = await scanner(target);
  const snapshot: MonitorSnapshot = { ...rawSnapshot, targetId: target.id };
  const previous = await store.getLatestSnapshot(target.id);

  const events = diffSnapshots(snapshot, previous);
  const shouldNotify =
    events.some((e) => e.severe) ||
    (opts.notifyOnNoChange ?? false) ||
    // 改善・初回も「重大ではないが知らせる価値がある」ものは通知する。
    events.some((e) => e.type === "recovered" || e.type === "first-scan");

  const result: MonitorRunResult<TScan> = {
    target,
    snapshot,
    previous,
    events,
    shouldNotify,
    scan,
  };

  // 基準を前進させる（通知の有無に関わらず必ず保存）。
  await store.saveSnapshot(snapshot);

  if (shouldNotify) {
    await notifier.notify(result);
  }

  return result;
}

/**
 * 登録された有効な監視対象を全件巡回する（cronから呼ぶ想定）。
 * 1件の失敗で全体が止まらないよう、各対象は独立に try/catch する。
 */
export async function runAllMonitors<TScan = unknown>(
  opts: RunOptions<TScan>,
): Promise<{
  results: MonitorRunResult<TScan>[];
  errors: { id: string; error: string }[];
}> {
  const targets = await opts.store.listTargets();
  const results: MonitorRunResult<TScan>[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const target of targets) {
    try {
      results.push(await runMonitorCheck(target, opts));
    } catch (e) {
      errors.push({
        id: target.id,
        error: String((e as Error)?.message ?? e),
      });
    }
  }

  return { results, errors };
}
