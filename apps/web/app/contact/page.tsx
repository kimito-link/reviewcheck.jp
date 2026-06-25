import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/Container";
import { ContactForm } from "@/components/ContactForm";
import { Disclaimer } from "@/components/Disclaimer";
import { LineCtaButton } from "@/components/LineCtaButton";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "相談・お問い合わせ",
  description:
    "Google口コミ改善・レビュー返信・MEO対策・悪評対策・詳細レポートのご相談はこちらから。LINEでのご相談も歓迎です。",
  path: "/contact/",
});

export default function ContactPage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        相談・お問い合わせ
      </h1>
      <p className="mt-2 text-slate-600">
        口コミ改善・返信・MEO対策・悪評対策まで、Googleのポリシーに沿った正当な方法でサポートします。
      </p>
      <div className="mt-6">
        <LineCtaButton size="lg" />
      </div>
      <div className="mt-8 max-w-2xl">
        <Suspense fallback={<div className="text-slate-500">読み込み中…</div>}>
          <ContactForm />
        </Suspense>
        <div className="mt-6">
          <Disclaimer />
        </div>
      </div>
    </Container>
  );
}
