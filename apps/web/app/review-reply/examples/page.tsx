import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { InternalLinks } from "@/components/InternalLinks";
import { LineCtaButton } from "@/components/LineCtaButton";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/jsonld";
import {
  REPLY_EXAMPLES,
  REPLY_DONTS,
  REPLY_EXAMPLES_FAQ,
} from "@/lib/replyExamples";

/**
 * 検索語「口コミ 返信 例文」に答えるページ（2026-11-11）。
 * 検索した人が欲しいのは「そのまま直して使える文」なので、例文を先に出し、
 * サービスの案内（/review-reply/）は最後に置く。
 */
const PATH = "/review-reply/examples/";
const TITLE = "Google口コミの返信例文｜星5・星3・星1・事実と違う口コミの返し方";
const DESCRIPTION =
  "Google口コミへの返信例文を、星5のお礼・星3の改善の声・星1のクレーム・事実と違う口コミ・短いひとことの口コミに分けて紹介。コピーして店名と内容を直せば使えます。書かないほうがよいことも整理しました。";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: "article",
  keywords: [
    "口コミ 返信 例文",
    "口コミ 返信の仕方",
    "口コミ 返信 お礼",
    "Google口コミ 返信",
    "低評価 口コミ 返信",
  ],
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          faqJsonLd(REPLY_EXAMPLES_FAQ),
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: "口コミ返信サポート", path: "/review-reply/" },
            { name: "返信の例文", path: PATH },
          ]),
        ]}
      />

      <section className="bg-gradient-to-b from-blue-50 to-slate-50 py-12 sm:py-16">
        <Container>
          <nav className="text-xs text-slate-500">
            <Link href="/" className="hover:text-blue-600">
              トップ
            </Link>
            <span className="mx-1">/</span>
            <Link href="/review-reply/" className="hover:text-blue-600">
              口コミ返信サポート
            </Link>
            <span className="mx-1">/</span>
            <span>返信の例文</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
            Google口コミの返信例文
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {"口コミへの返信は、書いた本人だけでなく、これからお店を選ぶ人も読んでいます。星の数や内容ごとに、そのまま直して使える例文を並べました。【】の中を、お店の名前や口コミに書かれていたことに置きかえてください。"}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {REPLY_EXAMPLES.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-50"
                >
                  {g.label}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {REPLY_EXAMPLES.map((g, i) => (
        <Section
          key={g.id}
          id={g.id}
          title={g.title}
          lead={g.point}
          tone={i % 2 === 0 ? "muted" : "default"}
        >
          <div className="space-y-4">
            {g.examples.map((ex) => (
              <figure
                key={ex.situation}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <figcaption className="text-sm font-bold text-slate-900">
                  {ex.situation}
                </figcaption>
                <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {ex.text}
                </p>
              </figure>
            ))}
          </div>
        </Section>
      ))}

      <Section title="返信で書かないほうがよいこと">
        <ul className="space-y-3">
          {REPLY_DONTS.map((d) => (
            <li
              key={d.title}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="font-bold text-slate-900">{d.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {d.why}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="よくある質問" tone="muted">
        <dl className="space-y-4">
          {REPLY_EXAMPLES_FAQ.map((f) => (
            <div
              key={f.question}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <dt className="font-bold text-slate-900">{f.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.answer}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="関連メニュー">
        <InternalLinks />
      </Section>

      <section className="bg-navy-gradient py-12">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-extrabold text-white">
              返信が溜まっているお店へ
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {"まだ返していない口コミが何件あるか、競合のお店と比べてどうかを無料で確かめられます。返信の方針づくりの相談も受けています。"}
            </p>
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-xl bg-white px-6 py-3.5 font-bold text-blue-800 hover:bg-blue-50"
              >
                無料で口コミ診断する
              </Link>
              <Link
                href="/review-reply/"
                className="inline-flex rounded-xl border border-white/60 px-6 py-3.5 font-bold text-white hover:bg-white/10"
              >
                返信の相談について
              </Link>
              <LineCtaButton size="lg" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
