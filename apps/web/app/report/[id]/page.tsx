import type { Metadata } from "next";
import Link from "next/link";
import {
  diagnose,
  decodeReportId,
  SCORE_RULE_VERSION,
} from "@reviewcheck/core";
import { SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { ReportView } from "@/components/ReportView";
import { AffiliateRefCapture } from "@/components/AffiliateRefCapture";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { checkStoreWebsite } from "@/lib/siteCheck";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { id: string };
type SearchParams = { ref?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const input = decodeReportId(id);
  if (!input) {
    return buildMetadata({
      title: "Google口コミ診断結果",
      description:
        "Googleマップの公開情報から計算した選ばれやすさの目安です。",
      path: `/report/${id}/`,
      ogType: "article",
      omitOgImage: true,
    });
  }
  let title = "Google口コミ診断結果";
  let description =
    "Googleマップの公開情報（星・口コミ数・返信・新しさ・プロフィール）を、決まった採点ルールで計算した目安です。";
  try {
    const result = diagnose(input, {
      providers: input.store.source === "places" ? ["google-places"] : [],
    });
    const name = result.input.store.name ? `｜${result.input.store.name}` : "";
    title = `選ばれやすさ ${result.score}点（目安）${name}`;
    description = `選ばれやすさ ${result.score}点（目安）。採点ルール v${SCORE_RULE_VERSION}。Googleマップの公開情報から計算した目安で、断定ではありません。`;
  } catch {
    /* タイトルは汎用のまま */
  }
  return buildMetadata({
    title,
    description,
    path: `/report/${id}/`,
    ogType: "article",
    omitOgImage: true,
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
  const { ref } = await searchParams;
  const input = decodeReportId(id);

  if (!input) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">
          レポートが見つかりませんでした
        </h1>
        <p className="mt-2 text-slate-600">
          URLが正しくない可能性があります。もう一度診断してください。
        </p>
        <Link
          href="/check/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          口コミ診断へ
        </Link>
      </Container>
    );
  }

  let result;
  let failed = false;
  try {
    result = diagnose(input, {
      providers: input.store.source === "places" ? ["google-places"] : [],
    });
  } catch {
    failed = true;
  }

  if (failed || !result) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">診断に失敗しました</h1>
        <Link
          href="/check/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          もう一度診断する
        </Link>
      </Container>
    );
  }

  let siteCheck = null;
  try {
    siteCheck = await checkStoreWebsite(result.input.store.website);
  } catch {
    siteCheck = null;
  }

  const shareUrl = `${SITE.baseUrl}/report/${id}/`;
  const fetchedAtRecorded =
    typeof input.diagnosedAt === "string" &&
    !Number.isNaN(Date.parse(input.diagnosedAt));

  return (
    <Container className="pb-12 pt-4 sm:pt-6">
      <AffiliateRefCapture />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "口コミ診断", path: "/check/" },
          { name: "診断結果", path: `/report/${id}/` },
        ])}
      />
      <h1 className="sr-only">
        選ばれやすさ {result.score}点（目安）
        {result.input.store.name ? `｜${result.input.store.name}` : ""}
      </h1>
      <ReportView
        result={result}
        siteCheck={siteCheck}
        shareUrl={shareUrl}
        refCode={ref}
        shareContext={{
          loadedRuleVersion: input.ruleVersion,
          fetchedAtRecorded,
        }}
      />
    </Container>
  );
}
