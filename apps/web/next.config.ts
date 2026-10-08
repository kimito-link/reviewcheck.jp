import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 型チェック・Lint は `pnpm typecheck` / `pnpm lint` で個別に実施する。
  // （OneDrive配下ではビルド時の追加ワーカーがファイルロックでクラッシュしやすいため分離）
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // URLは末尾スラッシュで統一（/meo/ 形式）。index.html 形式にしない。
  trailingSlash: true,
  // 共有ワークスペースパッケージをトランスパイル
  transpilePackages: [
    "@reviewcheck/core",
    "@reviewcheck/config",
    "@reviewcheck/ui",
  ],
  poweredByHeader: false,
  async headers() {
    // CSP対応(2026-10-08): malwarecheck.site診断で90/100、該当は
    // 「不正なスクリプトの実行を防ぐ設定」(CSP未設定)の1件のみだった。
    // ★script-src/style-srcは'unsafe-inline'を許容する。理由:
    //   Next.js App Router自体がRSCペイロード等のインラインscriptを標準で
    //   出力するため(実ブラウザ検証で38件のCSP違反ブロックを実測、認証ライブラリ
    //   やアプリコードとは無関係にフレームワークが出す)、厳格化するには全ページを
    //   動的レンダリングに変える nonce 方式が必要(Next.js公式ガイド:
    //   nextjs.org/docs/app/guides/content-security-policy。nonceは静的生成
    //   ページには適用できない仕様)。このアプリの大半のページは静的生成(○)の
    //   ままにする設計上の利点(ビルド時生成・高速配信)を優先し、動的化しない。
    //   style-srcのunsafe-inlineはMozilla HTTP Observatory公式採点ロジック
    //   (github.com/mozilla/http-observatory)でも減点0(script-srcのみ-20点)と
    //   区別されており、他の対象サイトと同じ業界標準パターン。
    //   唯一のインラインscript(Service Worker登録)はpublic/sw-register.jsへ
    //   外部化済み。フォーム・外部画像(remotePatterns)も無し。
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data:`,
      `font-src 'self'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'self'`,
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
