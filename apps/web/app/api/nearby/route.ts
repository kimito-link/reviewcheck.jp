import { NextResponse } from "next/server";
import {
  fetchNearbyStores,
  getEnabledProviders,
  guardMessage,
  PLACES_COST_YEN,
} from "@reviewcheck/core";
import { corsHeaders, guardPlacesCall } from "@/lib/costGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CORS_METHODS = "GET, OPTIONS";

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request, CORS_METHODS) });
}

// 座標は問い合わせをまとめるため小数3桁（約100m）に丸める。保存はしない。

/**
 * 現在地周辺の店舗候補を返す（摩擦ゼロ入口）。
 * 入力ゼロでワンタップ診断につなげるため、緯度経度から近い順の候補を返す。
 */
export async function GET(request: Request) {
  const CORS_HEADERS = corsHeaders(request, CORS_METHODS);
  const params = new URL(request.url).searchParams;
  const rawLat = Number(params.get("lat"));
  const rawLng = Number(params.get("lng"));

  if (
    !Number.isFinite(rawLat) ||
    !Number.isFinite(rawLng) ||
    Math.abs(rawLat) > 90 ||
    Math.abs(rawLng) > 180
  ) {
    return NextResponse.json(
      { error: "緯度・経度が不正です。" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const lat = Math.round(rawLat * 1000) / 1000;
  const lng = Math.round(rawLng * 1000) / 1000;
  const placesEnabled = getEnabledProviders().length > 0;

  try {
    if (placesEnabled) {
      const guard = await guardPlacesCall(request, "nearby", PLACES_COST_YEN.nearby);
      if (!guard.ok) {
        return NextResponse.json(
          {
            stores: [],
            areaHint: null,
            enabled: false,
            reason: guard.reason,
            message: guardMessage(guard.reason, "nearby"),
          },
          { headers: CORS_HEADERS },
        );
      }
    }
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
