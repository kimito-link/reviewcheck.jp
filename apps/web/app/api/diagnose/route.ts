import { NextResponse } from "next/server";
import {
  areaScopeText,
  diagnose,
  fetchCompetitors,
  fetchStore,
  getEnabledProviders,
  withPublicPoint,
  guardMessage,
  InvalidInputError,
  MAX_COMPETITORS,
  MockStoreProvider,
  PLACES_COST_YEN,
  type FetchStoreResult,
  type Competitor,
  type StoreContext,
  type StoreInput,
} from "@reviewcheck/core";
import { incrementDiagnosisCount } from "@/lib/diagnosisCounter";
import { incrementFunnel } from "@/lib/funnelCount";
import { corsHeaders, guardPlacesCall } from "@/lib/costGuard";
import { buildPlacesFixtureResult, isPlacesFixtureRequest } from "@/lib/placesFixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Google の店名・星・口コミ数・URL・座標は Redis に書かないし、古いキーも読まない。
 * 既存キー（rc:store:v1:*、rc:comp:v1:*、rc:comp:v2:*、rc:nearby:v1:*、rc:cohort:v1:*）は
 * この変更では消さない。本番反映の承認後に、運用者が期限を見て削除する。
 * 同時リクエストのまとめは core の処理中だけ。完了後は残さない。
 */

// 公開診断API。CORS は自社ドメインだけ（Chrome拡張は host_permissions で CORS の外から呼ぶ）。
const CORS_METHODS = "GET, POST, OPTIONS";

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request, CORS_METHODS) });
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

async function handle(request: Request, body: DiagnoseBody) {
  const CORS_HEADERS = {
    ...corsHeaders(request, CORS_METHODS),
    "Cache-Control": "private, no-store",
  };
  const demo = body.demo === true;
  const query = body.query ?? {};
  // 画面確認用。環境変数が無い本番ではここへ入らない。Google も Redis も呼ばない。
  if (!demo && isPlacesFixtureRequest(query)) {
    incrementFunnel({ event: "diagnosis_complete" }).catch(() => {});
    return NextResponse.json(buildPlacesFixtureResult(), {
      headers: {
        ...CORS_HEADERS,
        "x-funnel-counted": "diagnosis_complete",
      },
    });
  }
  const hasQuery = Boolean(
    query.text?.trim() || query.mapsUrl?.trim() || query.placeId?.trim(),
  );
  const override = body.store ?? {};
  const hasManualRating = typeof override.rating === "number";

  let base: StoreInput | null = null;
  let providers: string[] = [];
  let context: StoreContext | undefined;
  // 原価の守りで取得しなかった理由（利用者に正直に見せる。L6）。
  let storeGuardReason: Parameters<typeof guardMessage>[0] | null = null;
  const notices: string[] = [];
  // Places の鍵が無い環境（開発・mock）は費用が出ないので関所を通さない。
  const placesEnabled = getEnabledProviders().length > 0;

  // 1) クエリがあれば実プロバイダで店舗データを取得。
  //    実データが取れず手入力もない場合、デモ指定のときだけ mock を許可する。
  //    応答は今の画面に出すだけ。Redis には書かない。
  if (hasQuery) {
    const storeQuery = {
      text: query.text,
      mapsUrl: query.mapsUrl,
      placeId: query.placeId,
    };
    let fetched: FetchStoreResult | null = null;
    const guard = placesEnabled
      ? await guardPlacesCall(request, "diagnose", PLACES_COST_YEN.store)
      : ({ ok: true } as const);
    if (guard.ok) {
      fetched = await fetchStore(storeQuery, { allowMock: demo });
    } else {
      storeGuardReason = guard.reason;
      if (demo) {
        const store = await new MockStoreProvider().fetchStore(storeQuery);
        fetched = { store, providers: [], isMock: true };
      }
    }
    if (fetched) {
      base = fetched.store ? withPublicPoint(fetched.store, fetched.context) : null;
      providers = fetched.providers;
      context = fetched.context;
    }
  }

  // 1.5) 予算切れ等で取得しなかった。手入力が無ければ、取れなかったことを正直に伝えて手入力へ。
  //      （「見つかりません」とも「良好」とも言わない。）
  if (storeGuardReason && !base && !hasManualRating) {
    return NextResponse.json(
      {
        needsManualInput: true,
        reason: storeGuardReason,
        message: guardMessage(storeGuardReason, "store"),
        storeNameGuess: query.text?.trim() || null,
        mapsUrl: query.mapsUrl?.trim() || null,
      },
      { status: 200, headers: CORS_HEADERS },
    );
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
  const autoCompetitors =
    competitors.length === 0 && !body.noAutoCompetitors && !demo && Boolean(context);
  let searchedPeers = false;
  if (autoCompetitors && context) {
    const guard = await guardPlacesCall(request, "diagnose", PLACES_COST_YEN.competitors);
    if (guard.ok) {
      searchedPeers = true;
      try {
        competitors = await fetchCompetitors(context, { limit: MAX_COMPETITORS });
      } catch {
        competitors = [];
      }
    } else {
      notices.push(
        "本日の自動取得の上限に達したため、周辺の店との比較は取得していません（未取得）。",
      );
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
    if (!demo) {
      incrementDiagnosisCount().catch(() => {});
      incrementFunnel({ event: "diagnosis_complete" }).catch(() => {});
    }
    const manualNumbers =
      typeof override.rating === "number" || typeof override.reviewCount === "number";
    const userListedCompetitors = (body.competitors ?? []).length > 0;
    const placesAttributed =
      !demo && store.source === "places" && !manualNumbers && !userListedCompetitors;
    const scopeText = searchedPeers
      ? areaScopeText({
          primaryType: context?.primaryType,
          shown: competitors.length,
        })
      : undefined;
    return NextResponse.json(
      {
        ...result,
        placesAttributed,
        ...(scopeText ? { areaScopeText: scopeText } : {}),
        ...(notices.length > 0 ? { notices } : {}),
        // 業種×地域の集計は、確認が終わるまで読まない・書かない。
        cohort: { show: false },
      },
      { headers: CORS_HEADERS },
    );
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
  return handle(request, body);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const text = params.get("text") ?? params.get("q") ?? undefined;
  const mapsUrl = params.get("mapsUrl") ?? params.get("url") ?? undefined;
  const placeId = params.get("placeId") ?? undefined;
  const rating = params.get("rating");
  const reviewCount = params.get("reviewCount");
  return handle(request, {
    query: { text: text ?? undefined, mapsUrl: mapsUrl ?? undefined, placeId },
    store: {
      ...(rating ? { rating: Number(rating) } : {}),
      ...(reviewCount ? { reviewCount: Number(reviewCount) } : {}),
    },
  });
}
