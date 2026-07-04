import { NextResponse } from "next/server";
import { getDiagnosisCount } from "@/lib/diagnosisCounter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 累計診断件数を返す軽量な集計API。
 * TOPページの DiagnosisCounter（クライアント側）から取得する。
 * TOPページ自体は静的生成されるため、ここだけ動的に取得してカウントの鮮度を保つ。
 */
export async function GET() {
  const count = await getDiagnosisCount();
  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
