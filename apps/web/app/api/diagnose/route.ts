import { NextResponse } from "next/server";
import {
  analyzeReviews,
  diagnose,
  fetchCompetitors,
  fetchStore,
  InvalidInputError,
  type Competitor,
  type ReviewItem,
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
  let reviews: ReviewItem[] = [];

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
    reviews = fetched.reviews ?? [];
  }

  // 2) 実データが取得できず、手入力の星評価もない
  //    → 架空の数値は出さず、実数値の入力を促す（正直な診断）。
  if (!base && !hasManualRating) {
    // クエリ種別に応じて、原因が伝わる正確なメッセージを返す（“準備中”という誤解を避ける）。
    const triedMapsUrl = Boolean(query.mapsUrl?.trim());
    const message = triedMapsUrl
      ? "このURLからはお店を特定できませんでした。Googleマップでお店を開いた際のURL（maps.app.goo.gl/… や maps.google.com/…）を貼り付けるか、店舗名（例：渋谷 ○○整体院）で検索してください。Googleマップ以外のURLには対応していません。"
      : "お店を特定できませんでした。店舗名（例：渋谷 ○○整体院）またはGoogleマップの店舗URLで入力してください。すぐに診断したい場合は、下に星評価・口コミ数を入力して「この条件で再診断する」を押してください。";
    return NextResponse.json(
      {
        needsManualInput: true,
        message,
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
    // 5) 取得できた代表口コミを簡易分析して付与（共有用IDには含めない）。
    //    デモ時は雰囲気が伝わるようサンプル口コミで分析を見せる（価値の先出し）。
    const reviewSource = demo ? DEMO_REVIEWS : reviews;
    result.reviewAnalysis = analyzeReviews(reviewSource);
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

// デモ体験用のサンプル口コミ（「サンプル整体院（デモ）」に対応）。
const DEMO_REVIEWS: ReviewItem[] = [
  { rating: 5, text: "先生の施術がとても丁寧で、スタッフの対応も親切でした。説明もわかりやすく安心して通えます。", relativeTime: "2週間前" },
  { rating: 5, text: "腰痛が楽になりました。院内も清潔で雰囲気が良いです。また行きたいです。", relativeTime: "1か月前" },
  { rating: 4, text: "技術は満足ですが、人気で予約が取りにくく待ち時間が少し長いのが残念。", relativeTime: "1か月前" },
  { rating: 2, text: "受付の対応が少し冷たく感じました。料金もやや高い印象です。", relativeTime: "2か月前" },
  { rating: 5, text: "駐車場があり通いやすいです。リーズナブルでコスパが良いと思います。", relativeTime: "3か月前" },
];

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
