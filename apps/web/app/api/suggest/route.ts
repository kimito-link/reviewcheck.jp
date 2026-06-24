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
    return NextResponse.json(result ?? { query: q, suggestions: [], negatives: [], risk: "safe", source: "google" }, {
      headers: CORS_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { error: "suggest fetch failed" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
