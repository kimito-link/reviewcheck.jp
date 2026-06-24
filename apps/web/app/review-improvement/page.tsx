import type { Metadata } from "next";
import { SeoServicePage } from "@/components/SeoServicePage";
import { buildMetadata } from "@/lib/seo";
import { SEO_PAGES } from "@/lib/seoPages";

const data = SEO_PAGES["review-improvement"]!;

export const metadata: Metadata = buildMetadata({
  title: data.metaTitle,
  description: data.metaDescription,
  path: data.slug,
});

export default function Page() {
  return <SeoServicePage data={data} />;
}
