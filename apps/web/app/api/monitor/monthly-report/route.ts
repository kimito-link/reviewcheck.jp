import { NextResponse } from "next/server";
import { isBearerAuthorized } from "@reviewcheck/core";
import { MONITOR_PLACES_PAUSED } from "@/lib/monitorPause";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 予防型インサイト付き 月次監視レポート 実行エンドポイント（Vercel Cron 想定）。
 * 設計書: docs/DESIGN-predictive-insight-ltv-2026-07-03.md §2-0, §6-3
 *
 * 認可のあとでも Places は呼ばない。点数の新しい記録は、書面の確認が終わるまで止める。
 * 既存の記録は消さない。月次のスキャンも同じ停止です。
 */
function isAuthorized(request: Request): boolean {
  // ★secret 未設定なら拒否（fail-closed）。以前は未設定だと誰でも通れた。
  return isBearerAuthorized(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  );
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ...MONITOR_PLACES_PAUSED, mode: "monthly-report" });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
