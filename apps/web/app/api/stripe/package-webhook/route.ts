import { NextResponse } from "next/server";
import Stripe from "stripe";
import { notifyOwner } from "@/lib/ownerNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 総合改善パッケージ（plans.ts）の Stripe Webhook（P1-4）。
 *
 * 監視サブスク専用の `/api/stripe/monitor-webhook`（metadata.kind=monitoring 限定）とは
 * 意図的に分離する（既存方針を踏襲）。総合PKGの契約作成は partnership 側 admin.ts の
 * 手動 createContract 運用のまま変えない（設計書DESIGN-affiliate-program-2026-07-06.md
 * P1-4「軽実装で可能か確認してから」の結論：新規の自動契約作成はスコープ外、
 * 運営者通知にref・プラン・金額を載せて手動紐付けを助けるだけに留める）。
 *
 * metadata.kind === "monitoring" の決済はここでは扱わない（二重通知防止）。
 */
export async function POST(request: Request) {
  // Stripeはエンドポイントごとに別の署名シークレットを発行するため、
  // 既存の monitor-webhook（STRIPE_WEBHOOK_SECRET）とは別の環境変数にする。
  const secret = process.env.STRIPE_WEBHOOK_SECRET_PACKAGE;
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
    console.error("[package webhook] 署名検証に失敗", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handlePackageCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[package webhook] ${event.type} の処理に失敗`, err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handlePackageCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const meta = session.metadata ?? {};
  if (meta.kind === "monitoring" || !meta.plan) return;

  const amountYen = session.amount_total ?? 0;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? undefined);

  await notifyOwner(
    [
      "【総合PKG 決済完了】",
      `プラン: ${meta.plan}`,
      `月額: ${amountYen.toLocaleString()}円`,
      meta.store ? `店舗/URL: ${meta.store}` : "",
      session.customer_email ? `メール: ${session.customer_email}` : "",
      subscriptionId ? `サブスク: ${subscriptionId}` : "",
      meta.ref
        ? `紹介コード: ${meta.ref}（partnership管理画面で手動contract作成時にこのパートナーへ紐付けてください）`
        : "紹介コードなし（直販）",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
