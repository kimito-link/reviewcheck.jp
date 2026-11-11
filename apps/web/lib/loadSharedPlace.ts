/**
 * 共有ページは Place ID から地図リンクを作るだけ。
 * ここから Google Places は呼ばない。店名・星も保存しない。
 */
export async function loadSharedPlace(): Promise<{ ok: false; message: string }> {
  return {
    ok: false,
    message: "共有ページは店舗を取り直しません。地図リンクと相談ページだけを出します。",
  };
}
