import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SITE } from "@reviewcheck/config";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "プライバシーポリシー",
  description: `${SITE.name}のプライバシーポリシーです。`,
  path: "/privacy/",
});

export default function PrivacyPage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-extrabold text-slate-900">
        プライバシーポリシー
      </h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="font-bold text-slate-900">1. 取得する情報</h2>
          <p className="mt-2">
            当サービスは、診断のために利用者が入力した店舗名・GoogleマップURL・星評価・口コミ数・競合情報等を取得します。閲覧履歴を常時収集することはありません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">2. 利用目的</h2>
          <p className="mt-2">
            取得した情報は、当サービスの簡易診断および結果表示のためにのみ使用します。診断結果の共有機能を利用する場合に限り、入力内容を含む共有用URLを生成します。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">3. 外部サービスへの照会</h2>
          <p className="mt-2">
            店舗情報の取得のため、Google Places API
            等の外部サービスへ店舗名・GoogleマップURL・Place
            ID等を照会する場合があります（接続している場合）。当サービスは、口コミの購入・偽レビュー・やらせ・競合への低評価工作などの不正行為は一切行いません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">4. 第三者提供</h2>
          <p className="mt-2">
            法令に基づく場合を除き、取得した情報を第三者に提供しません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">5. Cookie・アクセス解析</h2>
          <p className="mt-2">
            サービス改善のためアクセス解析を利用する場合があります。個人を特定する目的では使用しません。
          </p>
        </section>
        <section>
          <h2 className="font-bold text-slate-900">6. お問い合わせ</h2>
          <p className="mt-2">
            本ポリシーに関するお問い合わせは、{SITE.contactEmail} または当サイトの相談・お問い合わせ窓口までご連絡ください。
          </p>
        </section>
        <p className="text-xs text-slate-500">
          ※本ポリシーは草案です。実運用に合わせて加筆・修正してください。
        </p>
      </div>
    </Container>
  );
}
