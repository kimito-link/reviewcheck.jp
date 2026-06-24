import { SITE, type FaqItem } from "@reviewcheck/config";

/** Organization 構造化データ */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.organization.name,
    alternateName: SITE.organization.nameEn,
    legalName: SITE.organization.legalName,
    url: SITE.organization.url,
    logo: SITE.organization.logo,
    slogan: SITE.organization.slogan,
    description: SITE.organization.description,
  };
}

/** WebSite 構造化データ */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.baseUrl,
    inLanguage: "ja",
  };
}

/** SoftwareApplication 構造化データ（トップ・診断ツール用） */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Chrome",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
    description: SITE.defaultDescription,
    url: `${SITE.baseUrl}/check/`,
  };
}

/** ProfessionalService 構造化データ（口コミ改善・MEO系ページ用） */
export function professionalServiceJsonLd(params: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: params.name,
    description: params.description,
    url: `${SITE.baseUrl}${params.path}`,
    serviceType: params.serviceType,
    areaServed: "JP",
    provider: {
      "@type": "Organization",
      name: SITE.organization.name,
      url: SITE.organization.url,
    },
  };
}

/** FAQPage 構造化データ */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** BreadcrumbList 構造化データ */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE.baseUrl}${it.path}`,
    })),
  };
}
