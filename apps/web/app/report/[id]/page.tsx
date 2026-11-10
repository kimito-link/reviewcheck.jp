import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { encodePlaceReportId } from "@reviewcheck/core";
import { SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { ReportView } from "@/components/ReportView";
import { AffiliateRefCapture } from "@/components/AffiliateRefCapture";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { isPreviewRequest } from "@/lib/previewRequest";
import { reportLoadPlan } from "@/lib/reportLoadPlan";
import { loadSharedPlace } from "@/lib/loadSharedPlace";
import { sanitizeRefLine } from "@/lib/refLine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { id: string };
type SearchParams = { ref?: string; ref_line?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({
    title: "口コミ診断の共有",
    description:
      "共有された口コミ診断です。点数は、開いた人が店舗を取り直したときに出します。",
    path: `/report/${id}/`,
    ogType: "article",
  });
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { ref, ref_line: refLine } = await searchParams;
  const headerList = await headers();
  const preview = isPreviewRequest(headerList);
  const plan = reportLoadPlan(id, preview);
  const again = checkHref(ref, refLine);

  if (!plan.fetch) {
    return (
      <QuietReport
        title={
          plan.reason === "invalid"
            ? "レポートが見つかりませんでした"
            : plan.reason === "preview"
              ? "このリンクは、開いた人が診断を取り直します"
              : "このリンクからは、店舗を取り直せません"
        }
        body={
          plan.reason === "preview"
            ? "プレビューでは点数を出していません。受け取った人がブラウザで開くと、店舗の識別子から取り直します。"
            : plan.reason === "no-place"
              ? "以前のリンクに、取り直すための店舗の識別子がありません。紹介の情報は残しています。店舗名から、もう一度診断してください。"
              : "URLが正しくない可能性があります。紹介の情報は残しています。もう一度診断してください。"
        }
        href={again}
      />
    );
  }

  const loaded = await loadSharedPlace(forwardedRequest(headerList), plan.placeId);
  if (!loaded.ok) {
    return (
      <QuietReport
        title="いまは取り直せませんでした"
        body={`${loaded.message} 紹介の情報は残しています。`}
        href={again}
      />
    );
  }

  const shareUrl = `${SITE.baseUrl}/report/${encodePlaceReportId(plan.placeId)}/`;
  return (
    <Container className="pb-12 pt-4 sm:pt-6">
      <AffiliateRefCapture />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "口コミ診断", path: "/check/" },
          { name: "診断結果", path: `/report/${encodePlaceReportId(plan.placeId)}/` },
        ])}
      />
      <h1 className="sr-only">
        {loaded.result.input.store.source === "places"
          ? `取得できた公開情報${
              loaded.result.input.store.name ? `｜${loaded.result.input.store.name}` : ""
            }`
          : `選ばれやすさ ${loaded.result.score}点（目安）${
              loaded.result.input.store.name ? `｜${loaded.result.input.store.name}` : ""
            }`}
      </h1>
      <ReportView
        result={loaded.result}
        shareUrl={shareUrl}
        refCode={ref}
        refLine={refLine}
        shareContext={{
          loadedRuleVersion: loaded.result.ruleVersion,
          fetchedAtRecorded: true,
        }}
        cohort={{ show: false }}
      />
    </Container>
  );
}

function QuietReport({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Container className="py-16 text-center">
      <AffiliateRefCapture />
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-800">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-base font-bold text-white underline decoration-white underline-offset-2 hover:bg-blue-700"
      >
        口コミ診断へ
      </Link>
    </Container>
  );
}

function checkHref(ref: string | undefined, refLine: string | undefined): string {
  const params = new URLSearchParams();
  if (ref?.trim()) params.set("ref", ref.trim());
  const line = sanitizeRefLine(refLine);
  if (line) params.set("ref_line", line);
  const query = params.toString();
  return query ? `/check/?${query}` : "/check/";
}

function forwardedRequest(headerList: Headers): Request {
  const next = new Headers();
  for (const name of ["x-forwarded-for", "x-real-ip"]) {
    const value = headerList.get(name);
    if (value) next.set(name, value);
  }
  return new Request("https://reviewcheck.jp/report/", { headers: next });
}
