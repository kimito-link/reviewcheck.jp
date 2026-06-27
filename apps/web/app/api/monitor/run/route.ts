import { NextResponse } from "next/server";
import { runAllMonitors } from "@reviewcheck/monitor";
import { getMonitorStore, hasPersistentStore } from "@/lib/monitorStore";
import { getMonitorNotifier, hasRealNotifier } from "@/lib/monitorNotifier";
import { createReviewcheckScanner } from "@/lib/monitorScanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 評判の定期監視 実行エンドポイント（Vercel Cron 想定）。
 *
 * 認可: CRON_SECRET の Bearer。未設定の環境ではスキップ。
 * 永続ストア未接続のうちは差分の基準が保持されない（本番は KV 接続が前提）。
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

  const store = getMonitorStore();
  const { results, errors } = await runAllMonitors({
    store,
    scanner: createReviewcheckScanner(),
    notifier: getMonitorNotifier(),
  });

  const notified = results.filter((r) => r.shouldNotify).length;

  return NextResponse.json({
    ok: true,
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
