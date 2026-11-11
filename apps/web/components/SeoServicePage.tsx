import Link from "next/link";
import { CTAS } from "@reviewcheck/config";
import type { SeoServicePageData } from "@/lib/seoPages";
import { Container } from "./Container";
import { Section } from "./Section";
import { CtaButton } from "./CtaButton";
import { FaqSection } from "./FaqSection";
import { PricingSection } from "./PricingSection";
import { InternalLinks } from "./InternalLinks";
import { Disclaimer } from "./Disclaimer";
import { LineCtaButton } from "./LineCtaButton";
import { JsonLd } from "./JsonLd";
import {
  professionalServiceJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
} from "@/lib/jsonld";

export function SeoServicePage({ data }: { data: SeoServicePageData }) {
  return (
    <>
      <JsonLd
        data={[
          professionalServiceJsonLd({
            name: data.h1,
            description: data.metaDescription,
            path: data.slug,
            serviceType: data.serviceType,
          }),
          faqJsonLd(data.faq),
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: data.breadcrumbName, path: data.slug },
          ]),
        ]}
      />

      {/* ヒーロー */}
      <section className="bg-gradient-to-b from-blue-50 to-slate-50 py-12 sm:py-16">
        <Container>
          <nav className="text-xs text-slate-500">
            <Link href="/" className="hover:text-blue-600">
              トップ
            </Link>
            <span className="mx-1">/</span>
            <span>{data.breadcrumbName}</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
            {data.h1}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {data.lead}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/check/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-bold text-white hover:bg-blue-700"
            >
              無料で口コミ診断する
            </Link>
            {data.primaryCtaKeys.map((k) => {
              const cta = CTAS[k];
              return cta ? <CtaButton key={k} cta={cta} size="lg" /> : null;
            })}
          </div>
        </Container>
      </section>

      {/* 症状 */}
      <Section title="こんなお悩みはありませんか？" tone="muted">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.symptoms.map((s) => (
            <li
              key={s}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">
                ?
              </span>
              <span className="text-sm text-slate-700">{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 診断・対応内容 */}
      <Section title="できること">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.included.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h3 className="font-bold text-slate-900">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 流れ */}
      <Section title="進め方" tone="muted">
        <ol className="space-y-3">
          {data.steps.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* 料金 */}
      <Section title="料金の目安">
        <PricingSection />
      </Section>

      {/* FAQ */}
      <Section title="よくある質問" tone="muted">
        <FaqSection items={data.faq} />
      </Section>

      {/* 関連ページ */}
      <Section title="関連メニュー">
        <InternalLinks />
        <div className="mt-6">
          <Disclaimer />
        </div>
      </Section>

      {/* 最終CTA */}
      <section className="bg-navy-gradient py-12">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-extrabold text-white">
              まずは無料で口コミ診断
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              店舗名またはGoogleマップURLを入れるだけ。競合との差と「あと何件で追いつけるか」が分かります。
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-xl bg-white px-6 py-3.5 font-bold text-blue-800 hover:bg-blue-50"
              >
                無料で口コミ診断する
              </Link>
              <LineCtaButton size="lg" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
