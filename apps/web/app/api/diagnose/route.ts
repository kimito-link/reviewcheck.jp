import { NextResponse } from "next/server";
import {
  diagnose,
  fetchCompetitors,
  fetchStore,
  InvalidInputError,
  type Competitor,
  type StoreContext,
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
  /** デモ体験（明示）。true のときだけ架空のサンプル値で診断する。 */
  demo?: boolean;
  /** 競合を自動検出しない（手動入力のみ使う）場合 true。既定は自動検出する。 */
  noAutoCompetitors?: boolean;
}

async function handle(body: DiagnoseBody) {
  const demo = body.demo === true;
  const query = body.query ?? {};
  const hasQuery = Boolean(
    query.text?.trim() || query.mapsUrl?.trim() || query.placeId?.trim(),
  );
  const override = body.store ?? {};
  const hasManualRating = typeof override.rating === "number";

  let base: StoreInput | null = null;
  let providers: string[] = [];
  let context: StoreContext | undefined;

  // 1) クエリがあれば実プロバイダで店舗データを取得。
  //    実データが取れず手入力もない場合、デモ指定のときだけ mock を許可する。
  if (hasQuery) {
    const fetched = await fetchStore(
      {
        text: query.text,
        mapsUrl: query.mapsUrl,
        placeId: query.placeId,
      },
      { allowMock: demo },
    );
    base = fetched.store;
    providers = fetched.providers;
    context = fetched.context;
  }

  // 2) 実データが取得できず、手入力の星評価もない
  //    → 架空の数値は出さず、実数値の入力を促す（正直な診断）。
  if (!base && !hasManualRating) {
    return NextResponse.json(
      {
        needsManualInput: true,
        message:
          "自動取得は現在準備中です。正確に診断するため、Googleマップに表示されている星評価と口コミ数を入力してください。",
        storeNameGuess: query.text?.trim() || null,
        mapsUrl: query.mapsUrl?.trim() || null,
      },
      { status: 200, headers: CORS_HEADERS },
    );
  }

  // 3) ベース（取得 or 空）に手入力を上書き
  const store: StoreInput = {
    ...(base ?? {
      source: "manual" as const,
      rating: 0,
      reviewCount: 0,
      name: query.text?.trim() || undefined,
      mapsUrl: query.mapsUrl?.trim() || undefined,
    }),
    ...stripUndefined(override),
  };

  // 4) 競合：手動入力があればそれを優先。無ければ周辺競合を自動検出（実データ取得時のみ）。
  let competitors: Competitor[] = body.competitors ?? [];
  if (
    competitors.length === 0 &&
    !body.noAutoCompetitors &&
    !demo &&
    context
  ) {
    try {
      competitors = await fetchCompetitors(context, { limit: 5 });
    } catch {
      competitors = [];
    }
  }

  try {
    const result = diagnose(
      {
        store,
        competitors,
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
