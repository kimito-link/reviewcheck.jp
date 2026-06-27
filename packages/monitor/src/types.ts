/**
 * 監視の総合判定（安全←→危険）。malwarecheck の core と同じ語彙だが、
 * monitor をドメイン非依存に保つため core には依存せず、ここで定義する。
 * 各ブランドの診断結果は、この語彙に正規化して MonitorSnapshot に載せる。
 */
export type VerdictLevel = "clean" | "vulnerable" | "suspected" | "infected";

/**
 * 監視対象（顧客のサイト1件）。
 * 課金プラン・通知先などは将来の拡張余地として持つが、最小から始める。
 */
export interface MonitorTarget {
  /** 安定ID（URLのハッシュ等。stableTargetId で生成） */
  id: string;
  /** 監視対象URL（正規化後） */
  url: string;
  /** 表示名（任意。顧客が付ける） */
  label?: string;
  /** 通知先（任意。メール/LINE等の宛先文字列。実送出は Notifier 実装側） */
  notifyTo?: string;
  /** 監視が有効か（解約・停止で false） */
  enabled: boolean;
  /** 登録日時(ISO) */
  createdAt: string;
  /**
   * Stripe サブスクリプションID。決済完了で紐付け、解約 webhook
   * (customer.subscription.deleted) の逆引きに使う。直販・手動登録では未設定。
   */
  stripeSubscriptionId?: string;
  /** Stripe 顧客ID（請求の参照用。任意）。 */
  stripeCustomerId?: string;
}

/**
 * 1回の監視スキャンを「前回と比較可能な形」に要約したもの。
 * ScanResult 全体を保存するのではなく、差分判定に必要な指紋だけを残す。
 */
export interface MonitorSnapshot {
  targetId: string;
  url: string;
  /** スキャン日時(ISO) */
  scannedAt: string;
  /** マルウェア/不正アクセス観点の総合判定 */
  verdictLevel: VerdictLevel;
  /** 0〜100。高いほど安全寄り。 */
  score: number;
  /** 検出した既知マルウェア名（ソート済み・重複なし） */
  malwareNames: string[];
  /** 露出した機密ファイルのパス等（exposure系チェックのID。ソート済み） */
  exposureIds: string[];
  /** fail/warn のチェックID全体（ソート済み）。細かな悪化検知に使う */
  problemIds: string[];
  /** 到達不可だったか */
  unreachable: boolean;
}

/** 差分1件の種別。深刻度の高い順に並べやすいよう列挙する。 */
export type MonitorEventType =
  | "first-scan" // 初回（前回がない）
  | "newly-infected" // 新たに感染痕跡を検出
  | "newly-suspected" // 新たに改ざんの疑い
  | "new-malware" // 新しいマルウェア名が増えた
  | "new-exposure" // 新しい機密ファイル露出/設定露出
  | "verdict-worsened" // 判定が悪化（clean→vulnerable 等）
  | "went-unreachable" // 到達不可になった
  | "score-dropped" // スコアが大きく下落
  | "recovered" // 問題が解消・改善した
  | "no-change"; // 変化なし

/** 監視で検知した1イベント。通知文面の素材になる。 */
export interface MonitorEvent {
  type: MonitorEventType;
  /** 重大なら true（通知を即時送る判断に使う） */
  severe: boolean;
  /** 利用者向けの短い説明（断定しない表現） */
  message: string;
  /** 関連する詳細（増えた項目など） */
  details?: string[];
}

/**
 * runMonitorCheck の結果。
 *
 * `TScan` は各ブランドの「生の診断結果」型（malwarecheck の ScanResult,
 * reviewcheck の DiagnosisResult 等）。monitor 自体はこの中身を解釈せず、
 * 詳細表示が要るときのために運ぶだけ（既定 unknown）。
 */
export interface MonitorRunResult<TScan = unknown> {
  target: MonitorTarget;
  /** 今回のスキャン要約（ドメイン非依存の指紋） */
  snapshot: MonitorSnapshot;
  /** 直前の保存スナップショット（なければ null） */
  previous: MonitorSnapshot | null;
  /** 検知したイベント（重大度順） */
  events: MonitorEvent[];
  /** 重大イベントを含むか（通知すべきか） */
  shouldNotify: boolean;
  /** 元の完全な診断結果（必要なら詳細表示に使う。中身はブランド依存） */
  scan: TScan;
}
