import type { Metadata } from "next";
import { SITE } from "@reviewcheck/config";

interface PageSeo {
  title: string;
  description: string;
  /** 末尾スラッシュ付きの絶対パス（例: "/meo/"） */
  path: string;
  ogType?: "website" | "article";
  /** ページ固有キーワード（未指定時はサイト共通キーワードを使用） */
  keywords?: readonly string[];
}

/** ページ共通のメタデータ（OGP/Twitter/canonical含む）を生成 */
export function buildMetadata({
  title,
  description,
  path,
  ogType = "website",
  keywords,
}: PageSeo): Metadata {
  const url = `${SITE.baseUrl}${path}`;
  return {
    title,
    description,
    keywords: [...(keywords ?? SITE.keywords)],
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      siteName: SITE.name,
      title,
      description,
      locale: SITE.locale,
      images: [{ url: SITE.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE.ogImage],
    },
  };
}
