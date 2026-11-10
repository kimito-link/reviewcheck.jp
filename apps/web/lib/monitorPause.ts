/** 監視 cron が Places を呼ばず、点数の記録も書かないときの応答。 */
export const MONITOR_PLACES_PAUSED = {
  ok: true,
  paused: true,
  scanned: 0,
  notified: 0,
  errors: [] as string[],
  reason:
    "Googleから計算した点数の記録は、書面の確認が終わるまで書いていません。既存の記録は消していません。",
};
