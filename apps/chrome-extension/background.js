// MV3 service worker（最小構成）。
// 診断は popup から自社API(/api/diagnose)へ行うため、ここでは常時処理は持たない。
// 閲覧履歴の監視・常時収集は一切行わない。ユーザーがボタンを押したページだけ処理する。
chrome.runtime.onInstalled.addListener(() => {
  // 初回インストール時のフック（必要に応じて利用）。
});
