import type { MonitorRunResult } from "./types";

/**
 * 通知の送出を抽象化するインターフェース。
 * 実装を差し替えるだけで メール / LINE / Slack / Webhook へ拡張できる。
 */
export interface Notifier {
  notify(result: MonitorRunResult): Promise<void>;
}

/**
 * 通知本文を組み立てる（送出手段に依存しない素材）。
 * 件名と本文を返す。断定を避けた事実ベースの文面にする。
 */
export function buildNotification(result: MonitorRunResult): {
  subject: string;
  body: string;
} {
  const { target, events, snapshot } = result;
  const name = target.label || target.url;
  const severe = events.some((e) => e.severe);

  const subject = severe
    ? `【要確認】${name} に重要な変化を検出しました`
    : `${name} の監視レポート`;

  const lines: string[] = [];
  lines.push(`監視対象: ${target.url}`);
  lines.push(`診断日時: ${snapshot.scannedAt}`);
  lines.push(`総合判定: ${snapshot.verdictLevel} / 安全スコア: ${snapshot.score}`);
  lines.push("");
  lines.push("― 検出した変化 ―");
  for (const e of events) {
    lines.push(`${e.severe ? "⚠ " : "・"}${e.message}`);
    if (e.details && e.details.length > 0) {
      for (const d of e.details) lines.push(`    - ${d}`);
    }
  }
  if (severe) {
    lines.push("");
    lines.push(
      "重要な変化が見つかりました。被害が広がる前に、サーバー内調査・対策をご相談ください。",
    );
  }
  lines.push("");
  lines.push(
    "※この監視は外部から確認できる範囲の簡易チェックです。感染・改ざんの有無を完全に保証するものではありません。",
  );

  return { subject, body: lines.join("\n") };
}

/**
 * ログ出力だけの Notifier（最小実装）。
 * 本番ではこれを差し替えて、実際にメール/LINEを送る Notifier を注入する。
 */
export class ConsoleNotifier implements Notifier {
  async notify(result: MonitorRunResult): Promise<void> {
    const { subject, body } = buildNotification(result);
    // eslint-disable-next-line no-console
    console.log(`\n[notify] ${subject}\n${body}\n`);
  }
}

/** 何も送らない Notifier（通知をオフにしたいとき用）。 */
export class NoopNotifier implements Notifier {
  async notify(): Promise<void> {
    /* no-op */
  }
}

/**
 * 複数の Notifier へ同報する Notifier。
 * 1つが失敗しても他は送る（通知経路の冗長化。例: Webhook + LINE）。
 */
export class MultiNotifier implements Notifier {
  private readonly notifiers: Notifier[];

  constructor(notifiers: Notifier[]) {
    this.notifiers = notifiers;
  }

  async notify(result: MonitorRunResult): Promise<void> {
    const outcomes = await Promise.allSettled(
      this.notifiers.map((n) => n.notify(result)),
    );
    const failures = outcomes.filter((o) => o.status === "rejected");
    // 全滅したときだけ呼び出し側に知らせる（一部成功は許容）。
    if (failures.length > 0 && failures.length === this.notifiers.length) {
      throw new Error(
        `all notifiers failed: ${failures
          .map((f) => String((f as PromiseRejectedResult).reason))
          .join("; ")}`,
      );
    }
  }
}

export interface LineNotifierOptions {
  /** LINE Messaging API のチャネルアクセストークン。 */
  channelAccessToken: string;
  /**
   * 運用者の LINE userId（任意）。設定すると全件の重大変化をここへも push する。
   * 顧客本人への通知は target.notifyTo を使う（notifyTarget で制御）。
   */
  to?: string;
  /**
   * 監視対象の notifyTo（顧客の userId）にも push するか。既定 true。
   * 顧客が LIFF でログインして得た userId を target.notifyTo に保存しておくと、
   * 自分のサイトの変化を本人の LINE で受け取れる。
   */
  notifyTarget?: boolean;
  /** タイムアウト(ms)。既定 8000。 */
  timeoutMs?: number;
}

/**
 * LINE Messaging API（push）で通知する Notifier。
 *
 * 宛先は2系統:
 *  - 運用者（options.to）… 全件の重大変化を即把握する用。
 *  - 顧客本人（result.target.notifyTo）… 自分のサイトの変化を受け取る用。
 *    notifyTarget=true（既定）のとき送る。userId は LIFF ログインで取得して保存する。
 *
 * 注意: LINE のテキストは1通5000文字まで。buildNotification の本文は十分短いが、
 * 念のため上限で切る。
 */
const LINE_TEXT_MAX = 4900;

export class LineNotifier implements Notifier {
  private readonly channelAccessToken: string;
  private readonly to?: string;
  private readonly notifyTarget: boolean;
  private readonly timeoutMs: number;

  constructor(options: LineNotifierOptions) {
    this.channelAccessToken = options.channelAccessToken;
    this.to = options.to;
    this.notifyTarget = options.notifyTarget ?? true;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  async notify(result: MonitorRunResult): Promise<void> {
    const { subject, body } = buildNotification(result);
    const text = `${subject}\n\n${body}`.slice(0, LINE_TEXT_MAX);

    // 運用者 + 顧客本人。重複（運用者==顧客）と空は除く。
    const recipients = new Set<string>();
    if (this.to) recipients.add(this.to);
    if (this.notifyTarget && result.target.notifyTo) {
      recipients.add(result.target.notifyTo);
    }
    if (recipients.size === 0) return;

    // 1宛先でも失敗したら投げる（複数なら全滅時のみ）。一部成功は許容。
    const outcomes = await Promise.allSettled(
      [...recipients].map((to) => this.pushTo(to, text)),
    );
    const failures = outcomes.filter((o) => o.status === "rejected");
    if (failures.length > 0 && failures.length === recipients.size) {
      throw new Error(
        `LINE push failed for all recipients: ${failures
          .map((f) => String((f as PromiseRejectedResult).reason))
          .join("; ")}`,
      );
    }
  }

  private async pushTo(to: string, text: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.channelAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          messages: [{ type: "text", text }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`LINE push failed: ${res.status} ${detail}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface WebhookNotifierOptions {
  /** 通知先のWebhook URL（Slack/Discord/任意のエンドポイント）。 */
  url: string;
  /** リクエストに付ける追加ヘッダ（署名トークン等）。 */
  headers?: Record<string, string>;
  /** タイムアウト(ms)。既定 8000。 */
  timeoutMs?: number;
}

/**
 * 任意のWebhookへ通知をPOSTする Notifier（外部依存ゼロ・fetchのみ）。
 *
 * ペイロードは複数の受信側で扱えるよう、よくあるフィールドを併記する:
 *  - `text`    … Slack互換
 *  - `content` … Discord互換
 *  - `subject` / `body` … 素のWebhook受信側用
 *  - `event`   … 構造化データ（判定・スコア・対象・重大度・イベント一覧）
 *
 * 受信側はこのうち必要なフィールドだけ読めばよい。メール/LINE専用の送出は
 * 将来それぞれの Notifier を足して差し替える（このクラスは汎用の土台）。
 */
export class WebhookNotifier implements Notifier {
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: WebhookNotifierOptions) {
    this.url = options.url;
    this.headers = options.headers ?? {};
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  async notify(result: MonitorRunResult): Promise<void> {
    const { subject, body } = buildNotification(result);
    const { target, snapshot, events } = result;
    const text = `${subject}\n\n${body}`;

    const payload = {
      // Slack / Discord 互換
      text,
      content: text,
      // 素のWebhook受信側用
      subject,
      body,
      // 構造化データ（受信側で判定の自動処理に使える）
      event: {
        targetId: target.id,
        url: target.url,
        label: target.label ?? null,
        scannedAt: snapshot.scannedAt,
        verdictLevel: snapshot.verdictLevel,
        score: snapshot.score,
        severe: events.some((e) => e.severe),
        events: events.map((e) => ({
          type: e.type,
          severe: e.severe,
          message: e.message,
        })),
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.headers },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`webhook responded ${res.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
