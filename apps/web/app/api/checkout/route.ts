import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PLANS, SITE } from "@reviewcheck/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutBody {
  /** プランキー（light / standard など） */
  plan?: string;
  /** 申し込み元の店舗名・URL（任意・メタデータに保存） */
  store?: string;
}

/**
 * Stripe Checkout セッションを作成し、決済ページURLを返す。
 * - 月額サブスクの総合パッケージを「その場で申し込み→決済」できるようにする。
 * - STRIPE_SECRET_KEY 未設定時は needsConfig を返し、UI側は相談フォームへ誘導する。
 */
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // 鍵未設定（準備中）。架空の成功にせず、相談フォームへ誘導させる。
    return NextResponse.json(
      {
        needsConfig: true,
        message:
          "オンライン決済は現在準備中です。お申し込みフォームからご連絡ください。",
      },
      { status: 200 },
    );
  }

  let body: CheckoutBody = {};
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    body = {};
  }

  const plan = PLANS.find((p) => p.key === body.plan);
  if (!plan || !plan.checkout) {
    return NextResponse.json(
      { error: "選択されたプランはオンライン決済の対象外です。" },
      { status: 400 },
    );
  }

  try {
    const stripe = new Stripe(key);
    const base = SITE.baseUrl.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: plan.checkout.amountJpy,
            recurring: { interval: plan.checkout.interval },
            product_data: {
              name: `${SITE.name} ${plan.name}プラン（月額・税込）`,
              description: plan.audience,
            },
          },
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      locale: "ja",
      metadata: {
        plan: plan.key,
        store: (body.store ?? "").slice(0, 200),
      },
      success_url: `${base}/plans/thanks/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/plans/?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "決済ページの作成に失敗しました。" },
        { status: 500 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "決済の開始に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }
}
