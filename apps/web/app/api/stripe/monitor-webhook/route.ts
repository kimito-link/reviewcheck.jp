import { NextResponse } from "next/server";
import Stripe from "stripe";
import { notifyOwner } from "@/lib/ownerNotify";
import { getMonitorStore } from "@/lib/monitorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 評判の継続監視 Stripe Webhook — 完全自動の「自販機」化。
 *
 *  - checkout.session.completed     → 監視の新規有効化はしない（決済自体は変更しない）
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

/**
 * 監視の新規決済を、有効な巡回対象にはしない。
 * Stripe の停止・解約・返金は呼ばない。既存の target も書き換えない。
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const meta = session.metadata ?? {};
  if (meta.kind !== "monitoring") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? undefined);

  await notifyOwner(
    [
      "【評判監視 決済イベントを受領・有効化しない】",
      `サブスク: ${subscriptionId ?? "不明"}`,
      "巡回を止めているため、監視対象は有効化していません。",
      "次回の巡回は約束しません。",
      "決済の停止・解約・返金は、この処理では行っていません。",
      "既存の契約者への連絡は、別の承認がいる未対応です。",
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
