import { NextResponse } from "next/server";
import { isBearerAuthorized } from "@reviewcheck/core";
import { stableTargetId } from "@reviewcheck/monitor";
import { getMonitorStore, hasPersistentStore } from "@/lib/monitorStore";
import { MONITOR_SIGNUP_PAUSED_MESSAGE } from "@/lib/monitorPause";
import { normalizePlaceId } from "@/lib/monitorTarget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 監視対象（店舗）の管理エンドポイント（登録 / 一覧 / 解除）。
 * 監視対象は Google placeId。スキャンは cron 経由の /api/monitor/run が担う。
 *
 * 認可: ADMIN_SECRET（無ければ CRON_SECRET）の Bearer。★どちらも未設定なら拒否（fail-closed）。
 */
function isAuthorized(request: Request): boolean {
  // ★secret 未設定なら拒否（fail-closed）。以前は未設定だと誰でも通れた。
  return isBearerAuthorized(
    request.headers.get("authorization"),
    process.env.ADMIN_SECRET ?? process.env.CRON_SECRET,
  );
}

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function persistenceNote(): string | undefined {
  return hasPersistentStore()
    ? undefined
    : "永続ストア未接続のため、登録はこのプロセスの間しか保持されません。本番化にはKV/Upstashの接続が必要です。";
}

/** 監視対象を一覧取得。 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const store = getMonitorStore();
  const targets = await store.listTargets();

  return NextResponse.json({
    ok: true,
    persistentStore: hasPersistentStore(),
    note: persistenceNote(),
    count: targets.length,
    targets,
  });
}

/**
 * 新規の有効化はしない。既存 target は読まない・書き換えない・消さない。
 * 一覧と解除は、既存の記録を確認するため残す。解除は Stripe の返金ではない。
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  void request;
  return NextResponse.json(
    {
      ok: false,
      paused: true,
      error: MONITOR_SIGNUP_PAUSED_MESSAGE,
    },
    { status: 503, headers: { "Cache-Control": "private, no-store" } },
  );
}

/** 監視対象を解除。?id=<id> または ?placeId=<placeId> で指定。 */
export async function DELETE(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const placeIdParam = searchParams.get("placeId");

  let id: string | null = idParam;
  if (!id && placeIdParam) {
    const placeId = normalizePlaceId(placeIdParam);
    if (!placeId) {
      return NextResponse.json(
        { error: "placeId の形式が正しくありません。" },
        { status: 400 },
      );
    }
    id = stableTargetId(placeId);
  }

  if (!id) {
    return NextResponse.json(
      { error: "id または placeId のいずれかが必要です。" },
      { status: 400 },
    );
  }

  const store = getMonitorStore();
  await store.removeTarget(id);

  return NextResponse.json({
    ok: true,
    persistentStore: hasPersistentStore(),
    note: persistenceNote(),
    removed: id,
  });
}
