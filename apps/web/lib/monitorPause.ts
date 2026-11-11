/**
 * 監視 cron は Places を呼ばず、点数の新しい記録も書かない。
 * KV の手動登録は消さない。有効化も、巡回もしない。
 * 決済の停止・解約・返金はしない。
 */
export const MONITOR_PLACES_PAUSED = {
  ok: true,
  paused: true,
  scanned: 0,
  notified: 0,
  errors: [] as string[],
  acceptingSignups: false,
  reason:
    "月次の自動巡回は止めています。新規の申込は有効化しません。KVに残っている手動の監視登録は、消しません。有効化も、巡回もしません。決済の停止・解約・返金は、この処理では変更しません。",
};

export const MONITOR_SIGNUP_PAUSED_MESSAGE =
  "月次モニタリングの新規申込は受け付けていません。決済は開始していません。次回の巡回も約束しません。";
