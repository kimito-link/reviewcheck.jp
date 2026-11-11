import type { Metadata } from "next";
import Link from "next/link";
import { CONSULT_OPEN_LABEL } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { AffiliateRefCapture } from "@/components/AffiliateRefCapture";
import { buildMetadata } from "@/lib/seo";
import { reportLoadPlan } from "@/lib/reportLoadPlan";
import { sanitizeRefLine } from "@/lib/refLine";
import { PLACES_FIXTURE_NOTE, PLACES_FIXTURE_PLACE_ID } from "@/lib/placesFixture";

export const dynamic = "force-dynamic";

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
      "共有された診断への入口です。このページは店舗を取り直しません。地図と相談へ進めます。",
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
  const plan = reportLoadPlan(id);
  const again = checkHref(ref, refLine);

  if (!plan.placeId) {
    return (
      <QuietReport
        title={
          plan.reason === "no-place"
            ? "このリンクからは、店舗を特定できません"
            : "レポートが見つかりませんでした"
        }
        body={
          plan.reason === "no-place"
            ? "以前のリンクに、地図へ進むための店舗の識別子がありません。紹介の情報は残しています。店舗名から、もう一度診断してください。"
            : "URLが正しくない可能性があります。紹介の情報は残しています。もう一度診断してください。"
        }
        href={again}
      />
    );
  }

  const maps = `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(plan.placeId)}`;
  const consult = consultHref(ref, refLine);
  const fixture = plan.placeId === PLACES_FIXTURE_PLACE_ID;

  return (
    <Container className="pb-12 pt-8">
      <AffiliateRefCapture />
      <h1 className="text-2xl font-extrabold text-slate-900">共有された診断への入口</h1>
      <p className="mt-3 text-base leading-relaxed text-slate-800">
        このページを開いても、店舗の公開情報は取り直しません。Googleへの問い合わせも、店名・星の保存もしません。
      </p>
      {fixture ? <p className="mt-3 text-base text-slate-800">{PLACES_FIXTURE_NOTE}</p> : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-base font-bold text-white underline decoration-white underline-offset-2 hover:bg-blue-700"
        >
          Googleマップで開く
        </a>
        <Link
          href={consult}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-900 underline underline-offset-2 hover:bg-slate-50"
        >
          {CONSULT_OPEN_LABEL}
        </Link>
        <Link
          href={again}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-900 underline underline-offset-2 hover:bg-slate-50"
        >
          もう一度診断する
        </Link>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-slate-700">
        地図リンクは、共有された店舗の識別子だけから作っています。サイトの運営は株式会社ベストトラストです。
      </p>
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

function consultHref(ref: string | undefined, refLine: string | undefined): string {
  const params = new URLSearchParams();
  params.set("topic", "consult");
  if (ref?.trim()) params.set("ref", ref.trim());
  const line = sanitizeRefLine(refLine);
  if (line) params.set("ref_line", line);
  return `/contact/?${params.toString()}`;
}
