import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { LineCtaButton } from "@/components/LineCtaButton";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "お申し込みありがとうございます",
    description: "総合改善パッケージのお申し込み完了ページ。",
    path: "/plans/thanks/",
  }),
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          お申し込みありがとうございます
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
          決済が完了しました。担当より2営業日以内に、初期ヒアリングと基盤づくり（公式WEB・LINE・アプリ等）の進め方をご連絡します。
          お急ぎの場合はLINEからもご連絡いただけます。
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LineCtaButton size="lg" text="LINEで担当に連絡する" />
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:bg-slate-50"
          >
            トップにもどる
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          ※ 領収書・請求はStripeから自動送付されます。解約・プラン変更はいつでもご相談ください。
        </p>
      </div>
    </Container>
  );
}
