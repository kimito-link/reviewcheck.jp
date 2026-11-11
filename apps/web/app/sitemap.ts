import type { MetadataRoute } from "next";
import { SITE } from "@reviewcheck/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/check/",
    "/ai-check/",
    "/ai-search-visibility/",
    "/google-review-check/",
    "/review-improvement/",
    "/meo/",
    "/review-reply/",
    "/review-reply/examples/",
    "/bad-review-measures/",
    "/competitor-review-comparison/",
    "/plans/",
    "/review-tool/",
    "/walkthrough/",
    "/suggest-check/",
    "/contact/",
    "/privacy/",
    "/terms/",
    "/commerce-disclosure/",
  ];
  const now = new Date();
  return paths.map((p) => ({
    url: `${SITE.baseUrl}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));
}
