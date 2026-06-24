import { NextResponse } from "next/server";
import {
  diagnose,
  fetchStore,
  InvalidInputError,
  type Competitor,
  type StoreInput,
} from "@reviewcheck/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CORS_HEADERS = {
  // 公開診断API。Chrome拡張(chrome-extension://...)・Web双方から利用するため許可。
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface DiagnoseBody {
  query?: { text?: string; mapsUrl?: string; placeId?: string };
  /** 自店舗の手入力上書き（rating / reviewCount / hasOwnerReplies 等） */
  store?: Partial<StoreInput>;
  competitors?: Competitor[];
  targetRating?: number;
}

async function handle(body: DiagnoseBody) {
  const query = body.query ?? {};
  const hasQuery = Boolean(
    query.text?.trim() || query.mapsUrl?.trim() || query.placeId?.trim(),
  );
  const override = body.store ?? {};
  const hasManualRating = typeof override.rating === "number";

  let base: StoreInput | null = null;
  let providers: string[] = [];

  // 1) クエリがあれば実プロバイダ or モックで店舗データを取得
  if (hasQuery) {
    const fetched = await fetchStore({
      text: query.text,
      mapsUrl: query.mapsUrl,
      placeId: query.placeId,
    });
    base = fetched.store;
    providers = fetched.providers;
  }

  // 2) 取得できず、手入力の星評価もない → エラー
  if (!base && !hasManualRating) {
    return NextResponse.json(
      {
        error:
          "店舗を特定できませんでした。GoogleマップURLか、実際の星評価・口コミ数を入力してください。",
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // 3) ベース（取得 or 空）に手入力を上書き
  const store: StoreInput = {
    ...(base ?? { source: "manual" as const, rating: 0, reviewCount: 0 }),
    ...stripUndefined(override),
  };

  try {
    const result = diagnose(
      {
        store,
        competitors: body.competitors ?? [],
        targetRating: body.targetRating,
      },
      { providers },
    );
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (e) {
    if (e instanceof InvalidInputError) {
      return NextResponse.json(
        { error: e.message },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json(
      { error: "診断中にエラーが発生しました。時間をおいて再度お試しください。" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export async function POST(request: Request) {
  let body: DiagnoseBody = {};
  try {
    body = (await request.json()) as DiagnoseBody;
  } catch {
    body = {};
  }
  return handle(body);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const text = params.get("text") ?? params.get("q") ?? undefined;
  const mapsUrl = params.get("mapsUrl") ?? params.get("url") ?? undefined;
  const placeId = params.get("placeId") ?? undefined;
  const rating = params.get("rating");
  const reviewCount = params.get("reviewCount");
  return handle({
    query: { text: text ?? undefined, mapsUrl: mapsUrl ?? undefined, placeId },
    store: {
      ...(rating ? { rating: Number(rating) } : {}),
      ...(reviewCount ? { reviewCount: Number(reviewCount) } : {}),
    },
  });
}
