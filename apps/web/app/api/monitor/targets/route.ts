import { NextResponse } from "next/server";
import { stableTargetId, type MonitorTarget } from "@reviewcheck/monitor";
import { getMonitorStore, hasPersistentStore } from "@/lib/monitorStore";
import { normalizePlaceId } from "@/lib/monitorTarget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 監視対象（店舗）の管理エンドポイント（登録 / 一覧 / 解除）。
 * 監視対象は Google placeId。スキャンは cron 経由の /api/monitor/run が担う。
 *
 * 認可: ADMIN_SECRET（無ければ CRON_SECRET）の Bearer。未設定ならスキップ。
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
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

interface RegisterBody {
  placeId?: unknown;
  label?: unknown;
  notifyTo?: unknown;
}

/** 監視対象を登録（同一 placeId は同一IDで upsert）。 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストボディがJSONとして解釈できません。" },
      { status: 400 },
    );
  }

  const placeId = normalizePlaceId(body.placeId);
  if (!placeId) {
    return NextResponse.json(
      { error: "placeId（Googleの店舗ID）が必要です。" },
      { status: 400 },
    );
  }

  const store = getMonitorStore();
  const id = stableTargetId(placeId);

  const existing = await store.getTarget(id);
  const target: MonitorTarget = {
    id,
    // monitor の url 欄に監視対象識別子（reviewcheck では placeId）を入れる。
    url: placeId,
    label:
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim()
        : existing?.label,
    notifyTo:
      typeof body.notifyTo === "string" && body.notifyTo.trim()
        ? body.notifyTo.trim()
        : existing?.notifyTo,
    enabled: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  await store.saveTarget(target);

  return NextResponse.json({
    ok: true,
    persistentStore: hasPersistentStore(),
    note: persistenceNote(),
    target,
  });
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
