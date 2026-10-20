import { NextResponse } from "next/server";
import { analyzeStoreSuggest } from "@reviewcheck/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // 古い結果（特に修正前のsafe）が残らないようキャッシュさせない
  "Cache-Control": "no-store, max-age=0",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "q is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  try {
    const result = await analyzeStoreSuggest(q);
    if (!result) {
      return NextResponse.json(
        { error: "q is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    // 取得に全て失敗した場合は「候補0件（良好）」と区別できるよう 503 で返す。
    // 呼び出し側は !res.ok を「未取得」として扱う（良い判定に使わない）。
    return NextResponse.json(result, {
      status: result.status === "unavailable" ? 503 : 200,
      headers: CORS_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { error: "suggest fetch failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
