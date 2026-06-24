import Link from "next/link";
import { COMMON_FAQ } from "@reviewcheck/config";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { DiagnoseForm } from "@/components/DiagnoseForm";
import { FaqSection } from "@/components/FaqSection";
import { PricingSection } from "@/components/PricingSection";
import { InternalLinks } from "@/components/InternalLinks";
import { Disclaimer } from "@/components/Disclaimer";
import { TrustBadges } from "@/components/TrustBadges";
import { LineCtaButton } from "@/components/LineCtaButton";
import { JsonLd } from "@/components/JsonLd";
import { softwareApplicationJsonLd, faqJsonLd } from "@/lib/jsonld";

const WORRIES = [
  "競合より口コミ数が少ない",
  "星評価が低くて来店につながらない",
  "悪い口コミが目立っている",
  "Googleマップからの問い合わせが少ない",
  "口コミ返信ができていない",
  "MEO対策を何から始めればいいか分からない",
  "良いサービスなのに、検索結果で選ばれていない気がする",
];

const CAN_DIAGNOSE = [
  "現在の星評価",
  "現在の口コミ数",
  "競合との差",
  "あと何件の口コミが必要か",
  "選ばれやすさスコア",
  "口コミ改善ポイント",
  "MEO改善ポイント",
  "悪評対策の必要性",
];

const AFTER = [
  "口コミ改善相談",
  "レビュー返信方針の作成",
  "Googleビジネスプロフィール改善",
  "MEO対策",
  "悪評口コミへの対応相談",
  "口コミ獲得導線の設計",
  "店舗ページ改善",
];

const NOTES = [
  "診断は公開情報や入力情報をもとにした簡易診断です。",
  "Googleの評価反映や表示順位を保証するものではありません。",
  "不正な口コミ投稿・口コミ購入・やらせレビューは行いません。",
  "Googleのポリシーに違反しない正当な口コミ改善を前提にします。",
];

const STEPS = [
  { title: "店舗を入力", desc: "店舗名またはGoogleマップURLを入れるだけ。" },
  { title: "状態を診断", desc: "星評価・口コミ数・選ばれやすさスコアを表示。" },
  { title: "競合と比較", desc: "あと何件・何点で競合に追いつけるかを見える化。" },
  { title: "改善を相談", desc: "口コミ改善・返信・MEO対策を正当な方法でサポート。" },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={[softwareApplicationJsonLd(), faqJsonLd(COMMON_FAQ)]} />

      {/* ファーストビュー */}
      <section className="relative overflow-hidden bg-navy-gradient py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              Review Check
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              あなたの店舗は、
              <br className="sm:hidden" />
              選ばれるお店ですか？
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
              Google口コミの星評価・口コミ数・競合との差を見える化。
              <br className="hidden sm:block" />
              あと何件の高評価口コミで競合に近づけるか、無料で診断できます。
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <DiagnoseForm />
          </div>
          <div className="mx-auto mt-6 max-w-2xl">
            <TrustBadges onDark />
          </div>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row">
            <LineCtaButton size="lg" text="口コミ改善を相談する" />
            <Link
              href="/check/#competitors"
              className="inline-flex rounded-lg bg-white/10 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              競合と比較する
            </Link>
          </div>
        </Container>
      </section>

      {/* 口コミチェックとは（SEO向け概要） */}
      <Section title="口コミチェック.jpとは">
        <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          <p>
            <strong className="text-slate-900">口コミチェック.jp</strong>{" "}
            は、店舗名またはGoogleマップURLを入れるだけで、
            <strong className="text-slate-900">Google口コミ</strong>
            （星評価・口コミ数）の状態と、競合店舗との差を診断できる無料ツールです。
            <strong className="text-slate-900">Googleマップ</strong>
            やローカル検索では、星評価と口コミ数で「選ばれるかどうか」が大きく変わります。
          </p>
          <p>
            現在の<strong className="text-slate-900">選ばれやすさスコア</strong>、
            競合に追いつくために<strong className="text-slate-900">あと何件の高評価口コミが必要か</strong>
            の目安を表示。改善が必要な場合は、
            <strong className="text-slate-900">口コミ改善・レビュー返信・MEO対策・悪評対策</strong>
            まで、Googleのポリシーに沿った正当な方法でご相談いただけます。
          </p>
        </div>
      </Section>

      {/* こんなお悩み */}
      <Section title="こんなお悩みはありませんか？" tone="muted">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WORRIES.map((s) => (
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
        <p className="mt-4 text-sm text-slate-500">
          一つでも当てはまるなら、まずは無料診断で「選ばれやすさ」を確認しましょう。
        </p>
      </Section>

      {/* 進め方 */}
      <Section title="診断から改善までの流れ">
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
      </Section>

      {/* 診断できること */}
      <Section title="診断できること" tone="muted">
        <div className="flex flex-wrap gap-2">
          {CAN_DIAGNOSE.map((c) => (
            <span
              key={c}
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800"
            >
              {c}
            </span>
          ))}
        </div>
      </Section>

      {/* 診断後にできること */}
      <Section title="診断後にできること">
        <div className="grid gap-3 sm:grid-cols-2">
          {AFTER.map((a) => (
            <div
              key={a}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              <span className="text-cta">✓</span>
              {a}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-navy-gradient p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-bold text-white sm:text-base">
            口コミ・MEOの改善は、まずLINEで相談。
            <span className="block text-slate-200 sm:inline">
              {" "}
              店舗名を送るだけで方向性をアドバイスします。
            </span>
          </p>
          <LineCtaButton size="lg" className="shrink-0" />
        </div>
      </Section>

      {/* 内部リンク */}
      <Section title="目的から探す" tone="muted">
        <InternalLinks />
      </Section>

      {/* 価格 */}
      <Section id="pricing" title="料金の目安">
        <PricingSection />
      </Section>

      {/* 注意事項 */}
      <Section title="ご利用にあたっての注意" tone="muted">
        <ul className="space-y-2">
          {NOTES.map((n) => (
            <li key={n} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1 text-amber-500">●</span>
              {n}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Disclaimer />
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="よくある質問">
        <FaqSection items={COMMON_FAQ} />
      </Section>

      {/* 最終CTA */}
      <section className="bg-navy-gradient py-14">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-label justify-center text-amber-300 before:bg-amber-300">
              Free Diagnosis
            </span>
            <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
              まずは無料で口コミ診断
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              競合との差と「あと何件で追いつけるか」が分かります。改善が必要なら、正当な方法でサポートします。
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/check/"
                className="inline-flex rounded-lg bg-white px-6 py-3.5 text-base font-bold text-blue-800 transition hover:bg-blue-50"
              >
                無料で口コミ診断する
              </Link>
              <LineCtaButton size="lg" />
            </div>
            <div className="mt-6">
              <TrustBadges onDark />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
