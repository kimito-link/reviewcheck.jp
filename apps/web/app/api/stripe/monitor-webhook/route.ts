import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stableTargetId, type MonitorTarget } from "@reviewcheck/monitor";
import { notifyOwner } from "@/lib/ownerNotify";
import { getMonitorStore, hasPersistentStore } from "@/lib/monitorStore";
import { normalizePlaceId } from "@/lib/monitorTarget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 評判の継続監視 Stripe Webhook — 完全自動の「自販機」化。
 *
 *  - checkout.session.completed     → 監視対象（店舗）を自動で有効化
 *  - customer.subscription.deleted  → 該当対象を自動で停止（無効化）
 *
 * 署名を STRIPE_WEBHOOK_SECRET で検証（生body=request.text()）。キー未設定時は素通し。
 * metadata.kind === "monitoring" の決済のみ処理する（他の決済導線と混在しても安全）。
 *
 * 注意: reviewcheck の web には別の Stripe 決済導線が既にあるため、本 webhook は
 * `/api/stripe/monitor-webhook` という別パスに分け、監視サブスク専用にしている。
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sig = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();

  const stripe = new Stripe(apiKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[monitor webhook] 署名検証に失敗", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[monitor webhook] ${event.type} の処理に失敗`, err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** 決済完了 → 店舗の評判監視を自動で有効化する。 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const meta = session.metadata ?? {};
  if (meta.kind !== "monitoring") return;

  // monitor の url 欄に入れた識別子（reviewcheck では placeId）を復元。
  const placeId = normalizePlaceId(meta.url);
  if (!placeId) {
    await notifyOwner(
      `【評判監視 決済完了・要手当て】metadata.url(placeId) を復元できませんでした: ${meta.url ?? ""}`,
    );
    return;
  }

  const id = meta.targetId || stableTargetId(placeId);
  const email = meta.email ?? session.customer_email ?? undefined;
  const storeName = meta.storeName || undefined;
  const lineUserId = meta.lineUserId || undefined;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? undefined);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? undefined);

  const store = getMonitorStore();
  const existing = await store.getTarget(id);

  const target: MonitorTarget = {
    id,
    url: placeId,
    label: storeName ?? existing?.label,
    notifyTo: lineUserId ?? existing?.notifyTo,
    enabled: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    stripeSubscriptionId: subscriptionId ?? existing?.stripeSubscriptionId,
    stripeCustomerId: customerId ?? existing?.stripeCustomerId,
  };
  await store.saveTarget(target);

  await notifyOwner(
    [
      "【評判監視 決済完了 → 自動有効化】",
      `店舗: ${storeName ?? placeId}`,
      `連絡先: ${email ?? "不明"}`,
      `金額: ${(session.amount_total ?? 0).toLocaleString()}円`,
      `サブスク: ${subscriptionId ?? "不明"}`,
      hasPersistentStore()
        ? "監視を有効化しました。次回の巡回から評判の変化を検知します。"
        : "⚠ 永続ストア未接続のため登録が保持されません。KV接続を確認してください。",
    ].join("\n"),
  );
}

/** 解約 → 該当する監視対象を自動で停止する（履歴を残すため無効化）。 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const store = getMonitorStore();

  const metaTargetId = subscription.metadata?.targetId;
  const target = metaTargetId
    ? await store.getTarget(metaTargetId)
    : await store.findTargetBySubscriptionId(subscription.id);

  if (!target) {
    await notifyOwner(
      `【解約検知・対象不明】サブスク ${subscription.id} に対応する監視対象が見つかりませんでした。`,
    );
    return;
  }

  await store.saveTarget({ ...target, enabled: false });

  await notifyOwner(
    [
      "【解約 → 自動停止】",
      `店舗: ${target.label ?? target.url}`,
      `サブスク: ${subscription.id}`,
      "評判監視を停止しました。",
    ].join("\n"),
  );
}
