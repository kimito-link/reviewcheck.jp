import { NextResponse } from "next/server";
import { MONITOR_SIGNUP_PAUSED_MESSAGE } from "@/lib/monitorPause";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * 新規の監視申込は受けない。
 * 本文の店名・メールは読まない。決済リンクは作らない。外部へは送らない。
 * 既存契約の停止・解約・返金は、この経路では扱わない。
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      paused: true,
      checkoutUrl: null,
      error: MONITOR_SIGNUP_PAUSED_MESSAGE,
    },
    { status: 503, headers: HEADERS },
  );
}
