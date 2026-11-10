/**
 * 監視 cron は Places を呼ばず、点数の新しい記録も書かない。
 * 既存契約の有無はこの応答では分からない。決済の停止・解約・返金はしない。
 */
export const MONITOR_PLACES_PAUSED = {
  ok: true,
  paused: true,
  scanned: 0,
  notified: 0,
  errors: [] as string[],
  acceptingSignups: false,
  reason:
    "月次の自動巡回は止めています。新規の申込は有効化しません。既存の記録は消していません。既存の決済・停止・解約・返金は、この処理では変更しません。",
};

export const MONITOR_SIGNUP_PAUSED_MESSAGE =
  "月次モニタリングの新規申込は受け付けていません。決済は開始していません。次回の巡回も約束しません。";
