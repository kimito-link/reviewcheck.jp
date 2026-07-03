import { NextResponse } from "next/server";
import { runAllMonitors } from "@reviewcheck/monitor";
import { getMonitorStore, hasPersistentStore } from "@/lib/monitorStore";
import { getMonitorNotifier, hasRealNotifier } from "@/lib/monitorNotifier";
import { createReviewcheckScanner } from "@/lib/monitorScanner";
import { withInsight } from "@/lib/insightNotifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 予防型インサイト付き 月次監視レポート 実行エンドポイント（Vercel Cron 想定）。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md §2-0, §6-3
 *
 * 既存 /api/monitor/run と認可・部品構成は同一。差分は2点だけ:
 *  - notifier を withInsight() で包む（無事の可視化＋業種別インサイトを events に追記）
 *  - notifyOnNoChange: true（変化なしの月も届ける。既存 run はノイズ回避で false）
 *
 * 注意（§6-3）: 月次はスキャンして snapshot 基準を前進させる。既存 run と時刻をずらして
 * スケジュールすること（同日に走ると片方の差分がもう片方に吸われる）。
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 対象月は実行時に確定して注入する（純粋関数 build 側は時刻を読まない）。
  const month = new Date().getUTCMonth() + 1; // 1..12

  const store = getMonitorStore();
  const { results, errors } = await runAllMonitors({
    store,
    scanner: createReviewcheckScanner(),
    notifier: withInsight(getMonitorNotifier(), { month }),
    notifyOnNoChange: true,
  });

  const notified = results.filter((r) => r.shouldNotify).length;

  return NextResponse.json({
    ok: true,
    mode: "monthly-report",
    month,
    persistentStore: hasPersistentStore(),
    realNotifier: hasRealNotifier(),
    note: hasPersistentStore()
      ? undefined
      : "永続ストア未接続のため差分の基準は保持されません。本番化にはKV/Postgresの接続が必要です。",
    scanned: results.length,
    notified,
    errors,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
