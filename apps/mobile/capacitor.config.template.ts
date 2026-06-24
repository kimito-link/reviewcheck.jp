// 将来の iOS/Android 化で使う Capacitor 設定テンプレート。
// 使うときに `capacitor.config.ts` へコピーしてください（初期版では未使用）。
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "site.reviewcheck.app",
  appName: "口コミチェック",
  webDir: "public",
  server: {
    // 本番Webをそのまま表示する薄いシェル方式。
    url: "https://reviewcheck.jp",
    cleartext: false,
  },
};

export default config;
