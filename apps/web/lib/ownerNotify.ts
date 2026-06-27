/**
 * 運用者向けに「素のテキスト通知」を送る小ヘルパー。
 *
 * 監視の差分通知（MonitorRunResult ベース）とは別に、決済完了など単発の
 * 出来事を運用者へ知らせるために使う。設定済みの経路へ同報し、失敗しても
 * 呼び出し側を止めない（通知は補助。本処理は別途完了している）。
 *
 * 経路:
 *  - Webhook: `MONITOR_WEBHOOK_URL`
 *  - LINE   : `LINE_IT_CHANNEL_ACCESS_TOKEN` + `MONITOR_LINE_TO`（運用者 userId）
 */
async function postWebhook(text: string): Promise<void> {
  const url = process.env.MONITOR_WEBHOOK_URL;
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function pushLine(text: string): Promise<void> {
  const token = process.env.LINE_IT_CHANNEL_ACCESS_TOKEN;
  const to = process.env.MONITOR_LINE_TO;
  if (!token || !to) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** 運用者へテキストを同報する。設定が無い経路はスキップ。失敗は握り潰す。 */
export async function notifyOwner(text: string): Promise<void> {
  const results = await Promise.allSettled([postWebhook(text), pushLine(text)]);
  for (const r of results) {
    if (r.status === "rejected") {
      // eslint-disable-next-line no-console
      console.error("[notifyOwner] 通知の一部に失敗", r.reason);
    }
  }
  // どの経路も未設定ならログに残す（最小フォールバック）。
  if (!process.env.MONITOR_WEBHOOK_URL && !process.env.MONITOR_LINE_TO) {
    // eslint-disable-next-line no-console
    console.log(`[notifyOwner] ${text}`);
  }
}
