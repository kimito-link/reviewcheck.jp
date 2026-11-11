import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { createMonitoringPaymentLink } from "@/lib/monitorStripe";
import { normalizePlaceId } from "@/lib/monitorTarget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 評判の継続監視の「申し込み」を受けるエンドポイント。
 *
 * 利用者の「この店舗(placeId)の評判を監視したい」という申込を受け、運用者に
 * 通知する。実際の監視対象登録は運用者の確認後（人による承認）か、Stripe決済
 * 完了の webhook で自動有効化される。
 */
interface SignupBody {
  placeId?: unknown;
  email?: unknown;
  storeName?: unknown;
  /** LIFF ログインで取得した顧客の LINE userId（任意）。決済後の通知先になる。 */
  lineUserId?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/i;

export async function POST(request: Request) {
  // スパム抑止: 同一IPからの申し込みを 5回 / 10分 に制限。
  const ip = clientIp(request);
  const limit = await rateLimit({
    key: `monitor-signup:${ip}`,
    limit: 5,
    windowSec: 600,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "申し込みが集中しています。しばらく時間をおいて再度お試しください。" },
      { status: 429 },
    );
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const placeId = normalizePlaceId(body.placeId);
  if (!placeId) {
    return NextResponse.json(
      { error: "監視対象の店舗（placeId）が必要です。" },
      { status: 400 },
    );
  }

  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
    return NextResponse.json(
      { error: "連絡先メールアドレスの形式が正しくありません。" },
      { status: 400 },
    );
  }
  const email = body.email.trim();

  const storeName =
    typeof body.storeName === "string" && body.storeName.trim()
      ? body.storeName.trim()
      : undefined;

  const lineUserId =
    typeof body.lineUserId === "string" && LINE_USER_ID_RE.test(body.lineUserId)
      ? body.lineUserId
      : undefined;

  const submittedAt = new Date().toISOString();
  const summary = `評判の継続監視の申し込み\n店舗: ${storeName ?? placeId}\n連絡先: ${email}${
    lineUserId ? `\nLINE: ${lineUserId}` : ""
  }\n受付: ${submittedAt}`;

  const webhookUrl = process.env.MONITOR_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: summary,
            content: summary,
            event: {
              kind: "monitor-signup",
              placeId,
              storeName,
              email,
              submittedAt,
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error("[monitor-signup] webhook通知に失敗しました", {
        placeId,
        email,
      });
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`[monitor-signup] ${summary}`);
  }

  const checkoutUrl = await createMonitoringPaymentLink({
    placeId,
    email,
    storeName,
    lineUserId,
  });

  return NextResponse.json({ ok: true, checkoutUrl });
}
