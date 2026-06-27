import {
  ConsoleNotifier,
  WebhookNotifier,
  LineNotifier,
  MultiNotifier,
  type Notifier,
} from "@reviewcheck/monitor";

/**
 * 通知手段の選定を1か所に集約する。
 *
 * 設定済みの経路をすべて束ねて同報する（MultiNotifier）。何も設定が無ければ
 * ConsoleNotifier（ログ出力のみ）にフォールバックする。
 *
 * 経路:
 *  - Webhook: `MONITOR_WEBHOOK_URL`（Slack/Discord/任意のエンドポイント）
 *  - LINE   : `LINE_IT_CHANNEL_ACCESS_TOKEN` + `MONITOR_LINE_TO`（運用者の userId 宛 push）
 *
 * LINE は「顧客個人」ではなく運用者に重大変化を即通知する用途。顧客個人への
 * push には友だち追加で得た userId が必要で、それは別途の導線になる。
 *
 * メール専用の送出が要るようになったら、Notifier を monitor 側に足し、ここへ
 * 1行加えるだけでよい（呼び出し側は不変）。
 */
function buildNotifiers(): Notifier[] {
  const notifiers: Notifier[] = [];

  const webhookUrl = process.env.MONITOR_WEBHOOK_URL;
  if (webhookUrl) {
    notifiers.push(new WebhookNotifier({ url: webhookUrl }));
  }

  // トークンさえあれば LineNotifier を立てる。運用者宛(MONITOR_LINE_TO)は任意で、
  // 未設定でも顧客本人(target.notifyTo)への通知のために有効化する。
  const lineToken = process.env.LINE_IT_CHANNEL_ACCESS_TOKEN;
  const lineTo = process.env.MONITOR_LINE_TO;
  if (lineToken) {
    notifiers.push(
      new LineNotifier({ channelAccessToken: lineToken, to: lineTo }),
    );
  }

  return notifiers;
}

export function getMonitorNotifier(): Notifier {
  const notifiers = buildNotifiers();
  if (notifiers.length === 0) {
    return new ConsoleNotifier();
  }
  if (notifiers.length === 1) {
    return notifiers[0];
  }
  return new MultiNotifier(notifiers);
}

/** 実際に外部へ通知できる手段が設定済みか（応答メッセージ用）。 */
export function hasRealNotifier(): boolean {
  return buildNotifiers().length > 0;
}
