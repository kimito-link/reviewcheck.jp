import Stripe from "stripe";
import { stableTargetId } from "@reviewcheck/monitor";

/**
 * 評判の継続監視に対する Stripe 決済リンク生成。
 *
 * reviewcheck は web に Stripe 連携が既にあるが、これは「評判監視サブスク」専用。
 * `STRIPE_SECRET_KEY` 未設定なら null（申込→人手承認フローのまま）。
 *
 * 監視対象は店舗（Google Place）なので識別子は placeId（URLではない）。
 */
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface MonitoringCheckoutParams {
  /** 監視対象の placeId（メタデータに残す。webhook で照合）。 */
  placeId: string;
  /** 申込者の連絡先メール。 */
  email: string;
  /** 表示用の店舗名（任意）。 */
  storeName?: string;
  /** LIFF ログインで取得した顧客の LINE userId（任意）。決済後の通知先になる。 */
  lineUserId?: string;
}

/**
 * 評判の継続監視の Stripe Payment Link を作る。
 * 金額は `MONITOR_PLAN_AMOUNT_JPY`（円・既定 5500）。キー未設定/失敗時は null。
 */
export async function createMonitoringPaymentLink(
  params: MonitoringCheckoutParams,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const amountYen = Number(process.env.MONITOR_PLAN_AMOUNT_JPY ?? "5500");
  if (!Number.isFinite(amountYen) || amountYen <= 0) return null;

  // 監視対象IDを先に確定（target.url には placeId を入れる運用）。
  const targetId = stableTargetId(params.placeId);
  const meta: Record<string, string> = {
    kind: "monitoring",
    targetId,
    // monitor の MonitorTarget.url 欄に入れる識別子（reviewcheck では placeId）。
    url: params.placeId,
    email: params.email,
  };
  if (params.storeName) meta.storeName = params.storeName;
  if (params.lineUserId) meta.lineUserId = params.lineUserId;

  try {
    const product = await stripe.products.create({
      name: params.storeName
        ? `店舗評判の継続監視（月額）— ${params.storeName}`
        : "店舗評判の継続監視（月額）",
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amountYen),
      currency: "jpy",
      recurring: { interval: "month" },
    });
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: meta,
      subscription_data: { metadata: meta },
    });
    return link.url;
  } catch {
    return null;
  }
}
