import { NextResponse } from "next/server";
import { fetchNearbyStores } from "@reviewcheck/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * 現在地周辺の店舗候補を返す（摩擦ゼロ入口）。
 * 入力ゼロでワンタップ診断につなげるため、緯度経度から近い順の候補を返す。
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "緯度・経度が不正です。" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const stores = await fetchNearbyStores(lat, lng, { radius: 600, limit: 12 });
    // 周辺の地名（住所の先頭）を簡易的に出す。Geocoding APIは使わずコストを抑える。
    const areaHint = stores[0]?.address
      ? stores[0].address.replace(/^日本、?\s*/, "").replace(/〒?\d{3}-?\d{4}\s*/, "")
      : null;
    return NextResponse.json(
      { stores, areaHint, enabled: true },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { stores: [], areaHint: null, enabled: false },
      { headers: CORS_HEADERS },
    );
  }
}
