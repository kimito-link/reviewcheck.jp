import type { Metadata } from "next";
import Link from "next/link";
import { diagnose, decodeReportId } from "@reviewcheck/core";
import { SITE } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { ReportView } from "@/components/ReportView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const input = decodeReportId(id);
  const name = input?.store.name ? `（${input.store.name}）` : "";
  return buildMetadata({
    title: "Google口コミ診断結果｜選ばれやすさ・競合比較レポート",
    description: `店舗${name}のGoogle口コミ診断結果（星評価・口コミ数・競合との差・選ばれやすさスコア・あと何件で追いつけるか）の簡易レポートです。`,
    path: `/report/${id}/`,
    ogType: "article",
  });
}

export default async function ReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
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
    // レポートはステートレス。入力から診断ロジックを再実行して描画する。
    result = diagnose(input, { providers: input.store.source === "places" ? ["google-places"] : [] });
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

  const shareUrl = `${SITE.baseUrl}/report/${id}/`;

  return (
    <Container className="py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "トップ", path: "/" },
          { name: "口コミ診断", path: "/check/" },
          { name: "診断結果", path: `/report/${id}/` },
        ])}
      />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Google口コミ診断結果
      </h1>
      <p className="mt-2 text-slate-600">
        入力情報をもとにした簡易レポートです（数値は目安）。
      </p>
      <div className="mt-8">
        <ReportView result={result} shareUrl={shareUrl} />
      </div>
    </Container>
  );
}
