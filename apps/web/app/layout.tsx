import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@reviewcheck/config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConsultBar } from "@/components/ConsultBar";
import { AffiliateRefCapture } from "@/components/AffiliateRefCapture";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonld";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-noto",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: {
    default: SITE.defaultTitle,
    template: `%s｜${SITE.name}`,
  },
  description: SITE.defaultDescription,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f1b2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        {/* CPA-2: ?ref を全ページで捕捉する。以前は DiagnoseForm がマウントされる
            / と /check/ でしか捕捉しておらず、/plans/ 等に ref 付きで着地すると
            帰属が落ちていた（malwarecheck.site は最初から layout 常駐で対応済み。
            本家が劣後していた点。DESIGN-funnel-brushup-2026-07-06.md CPA-2）。 */}
        <AffiliateRefCapture />
        <Header />
        <main>{children}</main>
        <Footer />
        <ConsultBar />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

/** PWA: サービスワーカー登録（クライアント）。
 * CSP対応(2026-10-08): インラインscript(dangerouslySetInnerHTML)から
 * public/sw-register.js への外部ファイル参照に変更。script-src 'self'のみで
 * 厳格化するため(このリポジトリには認証ライブラリ等のインラインscript制約が無い)。 */
function ServiceWorkerRegister() {
  return <script src="/sw-register.js" />;
}
