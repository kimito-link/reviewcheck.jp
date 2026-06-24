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
        ],
      },
    ];
  },
};

export default nextConfig;
