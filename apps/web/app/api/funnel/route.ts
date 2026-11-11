import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { funnelBodyOrNull, incrementFunnel } from "@/lib/funnelCount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * 診断開始・完了・相談の選択・相談ページ到達の件数だけを足す。
 * ブラウザに着いたことを購入や売上にはしない。店名・点数・メールは捨てる。
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit({
    key: `funnel:${ip}`,
    limit: 60,
    windowSec: 600,
  });
  if (!limit.ok) {
    return NextResponse.json({ ok: false }, { status: 429, headers: HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: HEADERS });
  }
  const accepted = funnelBodyOrNull(body);
  if (!accepted) {
    return NextResponse.json({ ok: false }, { status: 400, headers: HEADERS });
  }
  await incrementFunnel(accepted);
  return NextResponse.json(
    { ok: true, counted: "reach", purchase: false },
    { headers: HEADERS },
  );
}
