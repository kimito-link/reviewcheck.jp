import { NextResponse } from "next/server";
import { isBearerAuthorized } from "@reviewcheck/core";
import { MONITOR_PLACES_PAUSED } from "@/lib/monitorPause";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 評判の定期監視 実行エンドポイント（Vercel Cron 想定）。
 *
 * 認可: CRON_SECRET の Bearer。★未設定なら拒否。
 * 認可のあとでも Places は呼ばない。点数の新しい記録は、書面の確認が終わるまで止める。
 * 既存の記録は消さない。
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

  return NextResponse.json(MONITOR_PLACES_PAUSED);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
