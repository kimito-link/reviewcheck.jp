import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { SuggestCheckApp } from "@/components/SuggestCheckApp";
import { FaqSection } from "@/components/FaqSection";
import { Disclaimer } from "@/components/Disclaimer";
import { LineCtaButton } from "@/components/LineCtaButton";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  professionalServiceJsonLd,
  faqJsonLd,
} from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "サジェスト診断｜店名・会社名で検索候補(オートコンプリート)の悪評を無料チェック",
  description:
    "店舗名・会社名を入れるだけで、Google検索の予測候補（サジェスト）に『詐欺』『最悪』などのネガティブな言葉が出ていないかを無料診断。来店前のお客様が最初に目にする検索候補の状態を確認し、正当な方法でのサジェスト対策につなげます。",
  path: "/suggest-check/",
  keywords: [
    "サジェスト 対策",
    "サジェスト 診断",
    "オートコンプリート 悪評",
    "検索候補 ネガティブ",
    "風評対策",
    "ネット評判 チェック",
  ],
});

const WHY = [
  {
    icon: "👀",
    title: "来店前に、最初に見られる",
    desc: "お客様の多くは検索窓に店名を入れた瞬間、候補に出る言葉を目にします。ここが悪いと、口コミを見る前に離脱します。",
  },
  {
    icon: "⏱️",
    title: "ある日突然、出てくる",
    desc: "悪い口コミやネットの話題をきっかけに、ネガティブ候補は予告なく表示されます。気づいたときには定着していることも。",
  },
  {
    icon: "📉",
    title: "放置すると定着する",
    desc: "クリックされ続けると候補は強化されます。早い段階で、ポジティブな情報を増やして相対的に薄める対策が有効です。",
  },
];

const STEPS = [
  {
    title: "今の状態を診断",
    desc: "店名・会社名を入れて、実際に出る検索候補とネガティブ候補の有無を確認します（無料）。",
  },
  {
    title: "リスクを見極め",
    desc: "「詐欺」「最悪」などの高リスク語か、誤解されやすい語かを切り分け、優先度を整理します。",
  },
  {
    title: "正当な方法で対策",
    desc: "ポジティブな情報発信・検索ボリュームの健全化で、ネガティブ候補を目立たなくします（やらせ・不正操作はしません）。",
  },
  {
    title: "月次でモニタリング",
    desc: "再発・新たな候補を毎月チェック。出た瞬間に気づける状態を保ちます。",
  },
];

const FAQ = [
  {
    question: "サジェスト（検索候補）とは何ですか？",
    answer:
      "Googleの検索窓に文字を入れたときに自動で表示される予測候補（オートコンプリート）のことです。よく検索される語の組み合わせが表示される仕組みで、店名と一緒に『最悪』『詐欺』などが出ると、来店前のお客様の不安につながります。",
  },
  {
    question: "ネガティブな候補は必ず消せますか？",
    answer:
      "確実に消すことをお約束するものではありません。Googleの仕様変更の影響を受けるためです。私たちは、ポジティブな情報を増やし、健全な検索行動を促すことで相対的に目立たなくする取り組みを、正当な範囲で継続的に行います。",
  },
  {
    question: "やらせ・不正な操作はしませんか？",
    answer:
      "行いません。検索結果やサジェストを不正に操作する行為はリスクが高く、長期的に信頼を損ないます。私たちは公式情報・口コミ・コンテンツの整備など、正当な方法のみでネット上の評判を改善します。",
  },
  {
    question: "この診断は何をもとに表示していますか？",
    answer:
      "Googleが実際に返した検索候補のみを表示しています。候補をこちらで作り出すことはありません。地域・端末・検索履歴によって表示は変わるため、結果は目安としてご覧ください。",
  },
];

export default async function SuggestCheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const initialQuery = (first(sp.q) || first(sp.store) || "").trim();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "トップ", path: "/" },
            { name: "サジェスト診断", path: "/suggest-check/" },
          ]),
          professionalServiceJsonLd({
            name: "サジェスト診断・サジェスト対策",
            description:
              "Google検索の予測候補（サジェスト）に出るネガティブな言葉を無料診断し、正当な方法での対策につなげるサービス。",
            path: "/suggest-check/",
            serviceType: "Reputation management / Suggest countermeasure",
          }),
          faqJsonLd(FAQ),
        ]}
      />

      {/* ファーストビュー */}
      <section className="relative overflow-hidden bg-navy-gradient py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              Suggest Check
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              検索したとき、お店の名前の隣に
              <br className="hidden sm:block" />
              <span className="text-amber-300">悪い言葉</span>が出ていませんか？
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              店名・会社名を入れるだけ。Google検索の予測候補（サジェスト）に
              <br className="hidden sm:block" />
              「最悪」「詐欺」などのネガティブ候補が出ていないかを、無料でチェックします。
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl">
            <SuggestCheckApp initialQuery={initialQuery} />
          </div>
        </Container>
      </section>

      {/* なぜ重要か */}
      <Section
        title="サジェストは、口コミより先に見られています"
        lead="星評価や口コミを見る前の「検索した瞬間」が、最初の関門です。"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {WHY.map((w) => (
            <div
              key={w.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-2xl">{w.icon}</div>
              <h3 className="mt-2 text-base font-bold text-slate-900">
                {w.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {w.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 対策の流れ */}
      <Section title="サジェスト対策の進め方" tone="muted">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="geo-box p-5">
              <span className="font-mono text-xs font-bold text-amber-500">
                STEP {i + 1}
              </span>
              <h3 className="mt-1 text-base font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          ※
          私たちは検索結果・サジェストを不正に操作する行為は行いません。ポジティブな情報の整備など、Googleのポリシーに反しない正当な方法のみで取り組みます。効果や反映を保証するものではありません。
        </p>
      </Section>

      {/* CTA */}
      <Section title="検索の評判が気になったら、まずはご相談ください">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-navy-gradient p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-white sm:text-base">
            ネガティブ候補の見極めから対策の進め方まで、無料でご相談いただけます。
            <span className="block text-slate-200">
              総合パッケージ（Pro）にはサジェスト対策も含まれます。
            </span>
          </p>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <LineCtaButton size="lg" text="検索の評判を相談する" />
            <Link
              href="/plans/"
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              総合パッケージを見る
            </Link>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="よくある質問" tone="muted">
        <FaqSection items={FAQ} />
      </Section>

      {/* 注意 */}
      <Section title="ご利用にあたっての注意">
        <Disclaimer />
      </Section>
    </>
  );
}
