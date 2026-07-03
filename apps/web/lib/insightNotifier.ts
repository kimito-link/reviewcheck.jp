import {
  buildMonthlyInsight,
  normalizeIndustryTag,
  type DiagnosisResult,
} from "@reviewcheck/core";
import type {
  MonitorEvent,
  MonitorRunResult,
  Notifier,
} from "@reviewcheck/monitor";

/**
 * 予防型インサイトのアダプタ層（monitor と core を出会わせる唯一の橋）。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md §2-0, §6-1, §6-2
 *
 * 既存 Notifier を包むデコレータ。result.scan(DiagnosisResult|null) から業種を読み、
 * core/insight の純粋関数でインサイトを組み立て、events に「追記」してから既存
 * Notifier へ委譲する。既存 result は mutate しない（複製して渡す）。
 *
 * monitor の型・core の純粋関数をここで初めて同居させる。core/insight は monitor を
 * 参照しないので、MonitorEvent への詰め替えはこのアダプタが担う。
 */

export interface WithInsightOptions {
  /**
   * 対象月(1..12)。呼び出し側（route）が決めて渡す。
   * build 内で現在時刻を読まない原則（決定的・テスト可能）を守るための注入点。
   */
  month: number;
}

export function withInsight(
  inner: Notifier,
  options: WithInsightOptions,
): Notifier {
  return {
    async notify(result: MonitorRunResult): Promise<void> {
      const insightEvents = buildInsightEvents(result, options.month);
      if (insightEvents.length === 0) {
        await inner.notify(result);
        return;
      }
      // 無事の可視化イベント（type=insight・severe=false）は先頭へ、それ以外の
      // インサイトは既存 events の末尾へ足す。既存 result は複製して渡す（§6-2）。
      const decorated: MonitorRunResult = {
        ...result,
        events: [...result.events, ...insightEvents],
      };
      await inner.notify(decorated);
    },
  };
}

/**
 * result から業種を取り出し、core/insight でインサイトを組み立て、
 * MonitorEvent(type:"insight", severe:false) に詰め替える。
 */
function buildInsightEvents(
  result: MonitorRunResult,
  month: number,
): MonitorEvent[] {
  // scan は reviewcheck では DiagnosisResult | null（monitorScanner.ts）。
  const scan = result.scan as DiagnosisResult | null;
  const category = scan?.input.store.category;
  const industryTag = normalizeIndustryTag(category);

  const items = buildMonthlyInsight({
    industryTag,
    month,
    targetId: result.snapshot.targetId,
    problemIds: result.snapshot.problemIds,
    hadSevereEvent: result.events.some((e) => e.severe),
    unreachable: result.snapshot.unreachable,
    verdictLevel: result.snapshot.verdictLevel,
  });

  return items.map((item) => ({
    type: "insight" as const,
    severe: false,
    message: item.message,
    details: item.details,
  }));
}
