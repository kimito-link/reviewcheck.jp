import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { ReviewToolApp } from "@/components/ReviewToolApp";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "口コミ作成サポートツール｜タップだけで口コミが完成",
  description:
    "来店されたお客様が、質問にタップで答えるだけで自然な口コミの下書きが完成。コピーしてGoogleに貼るだけ。やらせ・サクラは一切なし、ご本人の率直な感想を正しく集めるための無料ツールです。",
  path: "/review-tool/",
});

export default async function ReviewToolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const store = first(sp.store) ?? "";
  const industry = first(sp.industry) ?? "general";
  const url = first(sp.url) ?? "";
  const locked = first(sp.embed) === "1";

  return (
    <Container className="py-10">
      {!locked ? (
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Review Tool
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            口コミは、タップだけで完成。
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            来店されたお客様に、QRコードなどでこのページを開いてもらうだけ。質問にタップで答えると、自然な口コミの下書きができあがります。お客様はコピーしてGoogleに貼り付けるだけ。
            <strong className="text-slate-800">
              やらせ・サクラ投稿は固くお断りし、ご本人の率直な感想を正しく集める
            </strong>
            ためのツールです。
          </p>
        </div>
      ) : null}

      <ReviewToolApp
        initialStore={store}
        initialIndustry={industry}
        initialReviewUrl={url}
        lockConfig={locked}
      />

      {!locked ? (
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900">
            このツールを自店舗用に使いたい方へ
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            総合改善パッケージでは、業種に合わせた質問のカスタム・店舗専用リンク・QR・NFC口コミカードまでご用意し、口コミが自然に増える導線をまるごと設計します。
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/plans/"
              className="inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              総合パッケージ・料金を見る
            </Link>
            <Link
              href="/check/"
              className="inline-flex rounded-xl border-2 border-blue-600 bg-white px-6 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              まず無料で口コミ診断する
            </Link>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
